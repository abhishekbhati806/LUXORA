#!/usr/bin/env python3
"""
LUXORA media curator.

Sources free-licensed hotel & travel photography from Wikimedia Commons, scores it
against per-slot keyword rules, optimises it for the web and emits a manifest the
React app consumes (paths, alt text, attribution, LQIP placeholder).

  python3 scripts/media/fetch_media.py --harvest      # propose candidates per slot
  python3 scripts/media/fetch_media.py --autoselect   # accept best un-used candidates
  python3 scripts/media/fetch_media.py --download     # fetch + optimise accepted picks
  python3 scripts/media/fetch_media.py --sheet 0      # contact sheet for visual QA
  python3 scripts/media/fetch_media.py --only cov-rambagh --harvest   # re-run one slot

State lives in scripts/media/{harvest.json,choices.json,manifest.json}.
"""
import base64
import concurrent.futures as cf
import io
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from collections import defaultdict

from PIL import Image, ImageFilter

ROOT = "/home/user/luxora"
OUT_IMG = os.path.join(ROOT, "client/public/img")
WORK = "/home/user/.cache/luxora-media/media"
SHEETS = "/home/user/.cache/luxora-media/sheets"
UA = {"User-Agent": "LuxoraDev/1.0 (demo media curation)"}
API = "https://commons.wikimedia.org/w/api.php"
MAX_PICKS = int(os.environ.get("MAX_PICKS", "6"))

HARVEST = os.path.join(WORK, "harvest.json")
CHOICES = os.path.join(WORK, "choices.json")
MANIFEST = os.path.join(WORK, "manifest.json")
CANDS = os.path.join(WORK, "candidates.json")

HTML_TAG = re.compile(r"<[^>]+>")
WS = re.compile(r"\s+")


def clean(v, limit=400):
    if not v:
        return ""
    t = HTML_TAG.sub(" ", v)
    for a, b in (("&amp;", "&"), ("&#160;", " "), ("&quot;", '"'), ("&#39;", "'"), ("&nbsp;", " ")):
        t = t.replace(a, b)
    return WS.sub(" ", t).strip()[:limit]


def strip_paren(s):
    prev = None
    while prev != s:
        prev = s
        s = re.sub(r"\(([^()]*)\)", r" \1 ", s)
    s = re.sub(r"[^\w\s,.'&-]", " ", s)
    return WS.sub(" ", s).strip()


def api(params):
    url = API + "?" + urllib.parse.urlencode(dict(params, format="json"))
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=45) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as exc:  # noqa: BLE001
            if attempt == 3:
                print("  !! api fail:", exc)
                return {}
            time.sleep(2 + attempt * 2)
    return {}


def search(query, limit=30):
    d = api(
        {
            "action": "query",
            "generator": "search",
            "gsrsearch": f"filetype:bitmap {query}",
            "gsrnamespace": "6",
            "gsrlimit": str(limit),
            "prop": "imageinfo",
            "iiprop": "url|size|extmetadata|mime",
            "iiurlwidth": "2000",
        }
    )
    out = []
    for p in (d.get("query", {}).get("pages") or {}).values():
        ii = (p.get("imageinfo") or [None])[0]
        if not ii or ii.get("mime") not in ("image/jpeg", "image/png"):
            continue
        em = ii.get("extmetadata") or {}
        title = p.get("title", "")
        fname = title.replace("File:", "")
        artist = clean(em.get("Artist", {}).get("value", ""), 120)
        out.append(
            {
                "title": title,
                "file": fname,
                "label": strip_paren(fname.rsplit(".", 1)[0])[:70],
                "desc": clean(em.get("ImageDescription", {}).get("value", "")),
                "artist": re.sub(r"\s+", " ", artist).strip()[:90],
                "license": clean(em.get("LicenseShortName", {}).get("value", ""), 40)
                or clean(em.get("UsageTerms", {}).get("value", ""), 60)
                or "CC",
                "page": ii.get("descriptionurl", ""),
                "url": ii.get("thumburl") or ii.get("url"),
                "w": ii.get("width") or 0,
                "h": ii.get("height") or 0,
                "blob": f"{strip_paren(fname)} {clean(em.get('ImageDescription', {}).get('value',''),300)}".lower(),
            }
        )
    return out


BAD = [
    "logo", "map", "diagram", "chart", "flag", "plaque", "coat of arms", "scan",
    "book cover", "poster", "stamp", "banknote", "svg", "screenshot", "graffiti",
    "advertisement", "watermark", "getty", "istock", "shutterstock", "alamy",
    "dreamstime", "vecteezy", "adobe stock", "3d render", "digitally generated",
    "mockup", "qr code", "barcode", "collage", "wikimediacommons", "texture",
    "sign", "graffiti", "mosaic of", "detail of",
]


def score(c, must_any, must_none, want_ar):
    blob = c["blob"]
    if any(b in blob for b in BAD) or any(t in blob for t in must_none):
        return -1
    hits = sum(1 for t in must_any if t in blob)
    if not hits:
        return -1
    w, h = c["w"], c["h"]
    if w < 1300 or h < 780:
        return -1
    ar = w / max(h, 1)
    if ar > 2.3 or ar < 0.42:
        return -1
    s = 60 + hits * 13 - abs(ar - want_ar) * 15
    s += min(len(c["desc"]) / 55.0, 6)
    if c["artist"]:
        s += 4
    # landscape-first: the site is landscape-dominant
    if ar >= 1.25:
        s += 5
    return s


# slot -> (query, must_any, must_none, preferred aspect ratio)
SLOTS = {
    # --- cinematic hero -------------------------------------------------
    "hero-main": ("infinity pool", ["pool", "resort", "villa", "ocean", "hotel"], ["room", "bed", "aerial map"], 1.7),
    "hero-alt": ("luxury resort", ["resort", "pool", "beach", "villa", "ocean", "hotel"], ["bed"], 1.7),
    # --- auth split panel (portrait-friendly) ---------------------------
    "auth-split": ("hotel lobby", ["lobby", "interior", "hotel", "chandelier", "reception"], [], 0.8),
    # --- destination tiles (portrait) -----------------------------------
    "dest-paris": ("paris eiffel", ["paris", "eiffel", "seine"], ["map", "diagram"], 0.75),
    "dest-dubai": ("dubai marina", ["dubai", "marina", "skyline", "palm"], ["map"], 0.75),
    "dest-bali": ("bali temple", ["bali", "temple", "rice", "jungle", "palm"], ["map"], 0.75),
    "dest-tokyo": ("tokyo shibuya", ["tokyo", "shibuya", "neon", "street", "night"], ["map"], 0.75),
    "dest-santorini": (["santorini oia","santorini dome","oia greece","santorini village"], ["santorini", "oia", "dome", "caldera", "church"], ["map"], 0.75),
    "dest-maldives": ("maldives lagoon", ["maldives", "lagoon", "overwater", "villa", "island"], ["map"], 0.75),
    "dest-jaipur": (["jaipur palace","haw mahal","amber fort","jaipur india"], ["jaipur", "palace", "rajasthan", "hawa", "amber"], ["map"], 0.75),
    # --- hotel covers (landscape ~4:3) ----------------------------------
    "cov-rambagh": ("jaipur palace", ["jaipur", "palace", "rajasthan", "courtyard"], ["map"], 1.33),
    "cov-citypalace": (["amber fort","city palace jaipur","jaipur courtyard"], ["amber", "fort", "jaipur"], ["map"], 1.33),
    "cov-ambersky": ("haw mahal", ["haw", "mahal", "jaipur", "palace"], ["map"], 1.33),
    "cov-atlantis": (["dubai beach","palm jumeirah","jumeirah dubai","dubai marina"], ["dubai", "beach", "palm", "jumeirah", "resort"], ["map"], 1.33),
    "cov-marina": ("dubai skyline", ["dubai", "skyline", "marina", "night"], ["map"], 1.33),
    "cov-desert": (["desert dunes","sahara camel","thar desert","desert camp"], ["desert", "dunes", "sahara", "camel", "camp"], ["map", "car"], 1.33),
    "cov-uluwatu": ("uluwatu temple", ["uluwatu", "bali", "cliff", "temple", "ocean"], ["map"], 1.33),
    "cov-ubud": ("rice terraces", ["bali", "rice", "terrace", "jungle", "ubud"], ["map"], 1.33),
    "cov-seminyak": ("bali sunset", ["bali", "beach", "sunset", "surf", "tropical"], ["map"], 1.33),
    "cov-omotesando": ("tokyo street", ["tokyo", "street", "ginza", "shibuya", "night"], ["map"], 1.33),
    "cov-bayglow": ("tokyo bay", ["tokyo", "bay", "rainbow", "bridge", "tower"], ["map"], 1.33),
    "cov-lemarais": ("paris street", ["paris", "street", "boulevard", "building", "seine"], ["map"], 1.33),
    "cov-trocadero": ("paris eiffel", ["paris", "eiffel", "tower"], ["map"], 1.33),
    "cov-ville": ("paris seine", ["paris", "seine", "bridge", "notre"], ["map"], 1.33),
    "cov-adele": (["santorini caldera","santorini sunset","oia sunset","santorini houses"], ["santorini", "caldera", "oia", "cliff"], ["map"], 1.33),
    "cov-village": ("santorini", ["santorini", "white", "church", "sea"], ["map"], 1.33),
    "cov-reef": ("maldives island", ["maldives", "island", "aerial", "turquoise", "lagoon"], ["map"], 1.33),
    "cov-atoll": (["maldives resort","maldives villa","maldives beach","maldives"], ["maldives", "resort", "bungalow", "overwater", "beach"], ["map"], 1.33),
    # --- rooms & amenities (shared pools, allocated round-robin) --------
    "room-king": ("hotel suite bed", ["bed", "suite", "room", "bedroom"], ["bunk", "dorm"], 1.4),
    "room-living": (["living room interior","hotel lounge","suite living room","room sofa"], ["living", "sofa", "lounge", "interior"], [], 1.4),
    "room-bath": (["bathroom marble","hotel bathroom","bathroom sink","marble bathroom"], ["bathroom", "bathtub", "marble", "basin"], [], 1.4),
    "room-villa": (["villa pool","private pool villa","villa garden pool","tropical villa"], ["villa", "pool", "private", "tropical"], [], 1.4),
    "room-terrace": ("terrace city view", ["terrace", "balcony", "view", "city"], [], 1.4),
    "room-garden": ("garden courtyard", ["garden", "courtyard", "tropical", "pool"], [], 1.4),
    "room-deluxe": ("boutique hotel room", ["room", "interior", "hotel"], [], 1.4),
    "room-pool": (["hotel room pool","pool villa","resort room balcony","pool terrace"], ["pool", "room", "balcony", "villa"], [], 1.4),
    "am-pool": (["resort swimming pool","hotel pool","swimming pool resort","pool deck"], ["pool", "swimming", "resort", "sun"], [], 1.4),
    "am-infinity": (["infinity pool","infinity edge pool","pool ocean view","cliff pool"], ["pool", "infinity", "ocean", "resort"], [], 1.4),
    "am-spa": ("spa massage room", ["spa", "massage", "treatment", "sauna"], [], 1.4),
    "am-dining": ("restaurant interior", ["restaurant", "dining", "table"], ["buffet"], 1.4),
    "am-bar": (["hotel bar lounge","cocktail bar","bar interior","lounge bar"], ["bar", "lounge", "cocktail"], [], 1.4),
    "am-gym": ("gym fitness", ["gym", "fitness", "training", "equipment"], [], 1.4),
    "am-beach": ("beach palm", ["beach", "sand", "sea", "palm"], [], 1.4),
    "am-lobby": ("lobby interior", ["lobby", "interior", "hotel"], [], 1.4),
    "am-desk": ("front desk hotel", ["reception", "desk", "front"], [], 1.4),
    "am-poolside": (["pool sunbeds","sun loungers pool","pool deck chairs","poolside"], ["pool", "sunbed", "lounger", "resort"], [], 1.4),
    "am-suite": ("luxury suite", ["suite", "interior", "luxury", "living"], [], 1.4),
}


def load(path, default):
    return json.load(open(path)) if os.path.exists(path) else default


def harvest():
    os.makedirs(WORK, exist_ok=True)
    data = load(HARVEST, {})
    only = slots_filter()
    for slot, (query, must_any, must_none, ar) in SLOTS.items():
        if only and slot not in only:
            continue
        if not only and len(data.get(slot, {}).get("candidates", [])) >= max(2, MAX_PICKS // 2):
            continue  # already well-populated
        queries = query if isinstance(query, list) else [query]
        keep = []
        for q in queries:
            cands = search(q)
            ranked = sorted(
                ((score(c, must_any, must_none, ar), c) for c in cands), key=lambda x: -x[0]
            )
            for _, c in ranked:
                if c["title"] in {k["title"] for k in keep}:
                    continue
                keep.append(c)
            if len(keep) >= MAX_PICKS:
                break
            time.sleep(0.2)
        keep = keep[:MAX_PICKS]
        data[slot] = {
            "query": queries[-1],
            "candidates": [
                {k: c[k] for k in ("title", "file", "label", "desc", "artist", "license", "page", "url", "w", "h")}
                for c in keep
            ],
        }
        print(f"  {slot:14s} raw={len(cands):2d} kept={len(keep)}")
        for c in keep[:3]:
            print(f"       {c['w']}x{c['h']} {c['label'][:58]}")
    json.dump(data, open(HARVEST, "w"), indent=1)
    print("harvested slots:", len(data))


def slots_filter():
    if "--only" in sys.argv:
        return set(sys.argv[sys.argv.index("--only") + 1].split(","))
    return None


def autoselect():
    harvest_data = load(HARVEST, {})
    choices = load(CHOICES, {})
    taken = set(choices.values())
    only = slots_filter()
    def pick_for(payload, avoid):
        for c in payload.get("candidates", []):
            if c["title"] not in avoid:
                return c["title"]
        return payload["candidates"][0]["title"] if payload.get("candidates") else None

    missing = []
    for slot, payload in harvest_data.items():
        if only and slot not in only:
            continue
        if slot in choices and not only:
            continue
        p = pick_for(payload, taken)
        if p:
            choices[slot] = p
            taken.add(p)
        else:
            missing.append(slot)
    # second pass: reuse a sibling candidate rather than leaving a slot empty
    for slot in missing:
        p = pick_for(harvest_data[slot], set())
        if p:
            choices[slot] = p
            print(f"  ~ {slot}: reusing shared image")
    for slot, payload in harvest_data.items():
        if not payload.get("candidates"):
            print(f"  !! {slot}: no candidates at all — need new query")
    json.dump(choices, open(CHOICES, "w"), indent=1)
    print("choices:", len(choices), "/", len(SLOTS))


def resolve(slot):
    """Re-run the search for a slot and return the chosen candidate record."""
    harvest_data = load(HARVEST, {})
    for c in harvest_data.get(slot, {}).get("candidates", []):
        if c["title"] == CHOICES_ALL[slot]:
            return c
    return None


CHOICES_ALL = load(CHOICES, {})


# Wikimedia only serves thumbnail widths from a listed set; 320/640/1280/1920 are safe.
SANCTION = (320, 640, 1280, 1920)


def thumb(url, width):
    """Sanctioned-size thumbnail URL on the thumb CDN (fast, rate-limit friendly)."""
    core = re.sub(r"[?#].*$", "", url)
    m = re.search(r"commons/(?:thumb/)?([0-9a-f]/[0-9a-f]{2}/[^/]+)", core)
    if not m:
        return core
    tail = m.group(1)
    w = min(SANCTION, key=lambda x: (abs(x - width), x))
    name = tail.split("/")[-1]
    return f"https://thumb.wikimedia.org/wikipedia/commons/thumb/{tail}/{w}px-{name}"


def dl(url, path):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
                data = r.read()
            if len(data) < 9000:
                return False
            open(path, "wb").write(data)
            return True
        except Exception as exc:  # noqa: BLE001
            print(f"     dl-retry {attempt}: {str(exc)[:80]}")
            time.sleep(3 + attempt * 4)
    return False


def optimise(src, dst, max_w, q=78, lqip=True):
    with Image.open(src) as im:
        im = im.convert("RGB")
        if im.width > max_w:
            im = im.resize((max_w, int(im.height * max_w / im.width)), Image.LANCZOS)
        im.save(dst, "JPEG", quality=q, optimize=True, progressive=True)
        out = [im.width, im.height]
        if lqip:
            lw = 22
            small = im.resize((lw, max(1, int(im.height * lw / im.width))), Image.BILINEAR)
            small = small.filter(ImageFilter.GaussianBlur(1.2))
            buf = io.BytesIO()
            small.save(buf, "JPEG", quality=45, optimize=True)
            out.append("data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode())
        return out


def download():
    global CHOICES_ALL
    CHOICES_ALL = load(CHOICES, {})
    os.makedirs(OUT_IMG + "/thumbs", exist_ok=True)
    manifest = load(MANIFEST, {})
    only = slots_filter()
    jobs = []
    for slot in SLOTS:
        if only and slot not in only:
            continue
        cand = resolve(slot)
        if cand:
            jobs.append((slot, cand))
        else:
            print(f"  ? {slot}: unresolved choice {CHOICES_ALL.get(slot)!r}")

    def work(job):
        slot, cand = job
        bucket = slot.split("-")[0] if slot.split("-")[0] in ("hero", "dest", "am", "auth") else (
            "rooms" if slot.startswith("room") else ("covers" if slot.startswith("cov") else bucket)
        )
        if slot.startswith("cov"):
            bucket = "covers"
        elif slot.startswith("room"):
            bucket = "rooms"
        elif slot.startswith("am"):
            bucket = "amenities"
        d = os.path.join(OUT_IMG, bucket)
        os.makedirs(d, exist_ok=True)
        raw = os.path.join(WORK, f"{slot}.raw")
        want = 1920 if bucket == "hero" else 1280
        ok = dl(thumb(cand["url"], want + 200), raw) or dl(cand["url"], raw)
        if not ok:
            return slot, None
        try:
            w, h, lq = optimise(raw, os.path.join(d, f"{slot}.jpg"), want, 76)
            optimise(raw, os.path.join(OUT_IMG, "thumbs", f"{slot}.jpg"), 640, 64, lqip=False)
        except Exception as exc:  # noqa: BLE001
            print(f"  !! {slot}: {type(exc).__name__}: {exc} :: {cand['url'][:90]}")
            return slot, None
        os.remove(raw)
        return slot, {
            "title": cand["title"],
            "commons": cand["page"],
            "artist": cand["artist"],
            "license": cand["license"],
            "alt": cand["label"],
            "desc": cand["desc"][:200],
            "src": f"/img/{bucket}/{slot}.jpg",
            "thumb": f"/img/thumbs/{slot}.jpg",
            "w": w,
            "h": h,
            "kb": os.path.getsize(os.path.join(d, f'{slot}.jpg')) // 1024,
            "lqip": lq,
        }

    with cf.ThreadPoolExecutor(max_workers=2) as ex:
        for slot, rec in ex.map(work, jobs):
            if rec:
                manifest[slot] = rec
                print(f"  ok {slot:14s} {rec['w']}x{rec['h']} {rec['kb']}KB {rec['alt'][:40]}")
            else:
                print(f"  FAIL {slot}")
    json.dump(manifest, open(MANIFEST, "w"), indent=1)
    total = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(OUT_IMG) for f in fs)
    print(f"manifest: {len(manifest)} entries · {total/1e6:.1f} MB on disk")


def sheet(n=0, cols=5, rows=4, tile=340):
    """Contact sheet of the *final optimised* images, labelled with their Commons caption."""
    from PIL import ImageDraw

    manifest = load(MANIFEST, {})
    os.makedirs(SHEETS, exist_ok=True)
    keys = sorted(manifest)
    per = cols * rows
    pages = max(1, (len(keys) + per - 1) // per)
    print(f"{len(keys)} images across {pages} sheets (view with --sheet 0..{pages-1})")
    if n >= pages:
        return
    label_h = 46
    canvas = Image.new("RGB", (cols * (tile + 8) + 8, rows * (tile + label_h + 8) + 8), "#0b0a09")
    d = ImageDraw.Draw(canvas)
    for idx, key in enumerate(keys[n * per : (n + 1) * per]):
        rec = manifest[key]
        path = os.path.join(ROOT, "client/public", rec["src"].lstrip("/"))
        if not os.path.exists(path):
            continue
        r, c_ = divmod(idx, cols)
        x, y = 8 + c_ * (tile + 8), 8 + r * (tile + label_h + 8)
        with Image.open(path) as im:
            im = im.convert("RGB")
            im.thumbnail((tile, tile), Image.LANCZOS)
            canvas.paste(im, (x + (tile - im.width) // 2, y))
        d.text((x + 2, y + tile + 4), key, fill="#ffcf6b")
        d.text((x + 2, y + tile + 19), rec["alt"][:56], fill="#e3ddd1")
        d.text((x + 2, y + tile + 33), (rec["desc"] or "-")[:64], fill="#8f887c")
    out = os.path.join(SHEETS, f"sheet-{n}.jpg")
    canvas.save(out, "JPEG", quality=82, optimize=True)
    print(out, canvas.size)


def overrides():
    """Hand-approved per-slot decisions produced during visual QA."""
    return load(os.path.join(WORK, "overrides.json"), {})


def reuse(src_slot, dst_slot):
    """Point dst_slot at an already-optimised image from src_slot (own file, own crop)."""
    manifest = load(MANIFEST, {})
    if src_slot not in manifest:
        print(f"  ! {dst_slot}: unknown source {src_slot}")
        return False
    rec = dict(manifest[src_slot])
    bucket = {"cov": "covers", "room": "rooms", "am": "amenities", "hero": "hero",
              "dest": "dest", "auth": "auth"}.get(dst_slot.split("-")[0], dst_slot.split("-")[0])
    d = os.path.join(OUT_IMG, bucket)
    os.makedirs(d, exist_ok=True)
    for a, b in (
        (os.path.join(ROOT, "client/public", rec["src"].lstrip("/")), os.path.join(d, f"{dst_slot}.jpg")),
        (os.path.join(ROOT, "client/public", rec["thumb"].lstrip("/")), os.path.join(OUT_IMG, "thumbs", f"{dst_slot}.jpg")),
    ):
        if os.path.exists(a):
            with Image.open(a) as im:
                im.convert("RGB").save(b, "JPEG", quality=80, optimize=True, progressive=True)
    rec["src"] = f"/img/{bucket}/{dst_slot}.jpg"
    rec["thumb"] = f"/img/thumbs/{dst_slot}.jpg"
    rec["kb"] = os.path.getsize(os.path.join(d, f"{dst_slot}.jpg")) // 1024
    rec["reusedFrom"] = src_slot
    manifest[dst_slot] = rec
    json.dump(manifest, open(MANIFEST, "w"), indent=1)
    print(f"  ~ {dst_slot} <- {src_slot}")
    return True


def candidates_for():
    """Search replacement candidates for slots still marked pending in overrides.json."""
    ov = overrides()
    data = load(CANDS, {})
    for slot, cfg in ov.items():
        if cfg.get("action") != "search" or cfg.get("state") == "final":
            continue
        _, must_any, must_none, ar = SLOTS[slot]
        keep = []
        for q in cfg["queries"]:
            cands = search(q)
            ranked = sorted(((score(c, must_any, must_none, ar), c) for c in cands), key=lambda x: -x[0])
            for _, c in ranked:
                if c["title"] in {k["title"] for k in keep}:
                    continue
                keep.append(c)
            time.sleep(0.15)
        data[slot] = {"query": cfg["queries"][0], "candidates": keep[:4]}
        print(f"  {slot:14s} {len(keep)} candidates")
    json.dump(data, open(CANDS, "w"), indent=1)
    cand_sheet()


def cand_sheet():
    """Contact sheet of pending candidates so the picks are made by eye, not by caption."""
    from PIL import ImageDraw

    data = load(CANDS, {})
    sm = os.path.join(WORK, "candsm")
    os.makedirs(sm, exist_ok=True)
    os.makedirs(SHEETS, exist_ok=True)
    tiles = []
    for slot, payload in data.items():
        for i, c in enumerate(payload["candidates"]):
            p = os.path.join(sm, f"{slot}-{i}.jpg")
            if not os.path.exists(p) and not dl(thumb(c["url"], 320), p):
                continue
            tiles.append((f"{slot} #{i}", c["label"], p))
    if not tiles:
        print("no pending candidates")
        return
    tile, lh, cols = 300, 44, 4
    rows = (len(tiles) + cols - 1) // cols
    canvas = Image.new("RGB", (cols * (tile + 6) + 6, rows * (tile + lh + 6) + 6), "#0b0a09")
    d = ImageDraw.Draw(canvas)
    for i, (slot, label, p) in enumerate(tiles):
        r, c_ = divmod(i, cols)
        x, y = 6 + c_ * (tile + 6), 6 + r * (tile + lh + 6)
        try:
            with Image.open(p) as im:
                im = im.convert("RGB")
                im.thumbnail((tile, tile), Image.LANCZOS)
                canvas.paste(im, (x + (tile - im.width) // 2, y))
        except Exception:  # noqa: BLE001
            continue
        d.text((x + 1, y + tile + 2), slot, fill="#ffcf6b")
        d.text((x + 1, y + tile + 17), label[:44], fill="#e3ddd1")
        d.text((x + 1, y + tile + 31), label[44:88], fill="#8f887c")
    out = os.path.join(SHEETS, "candidates.jpg")
    canvas.save(out, "JPEG", quality=84, optimize=True)
    print(out, canvas.size, len(tiles), "tiles")


def apply_overrides():
    """Materialise approved overrides: reuses copy files, picks re-download."""
    ov = overrides()
    choices = load(CHOICES, {})
    harvest_data = load(HARVEST, {})
    cand = load(CANDS, {})
    for slot, cfg in ov.items():
        if cfg.get("state") != "final":
            continue
        if cfg.get("action") == "reuse":
            reuse(cfg["from"], slot)
        elif cfg.get("action") == "search":
            pool = cand.get(slot, {}).get("candidates", [])
            pick = next((c for c in pool if c["title"] == cfg.get("pick")), None)
            if not pick:
                print(f"  ! {slot}: no approved pick")
                continue
            harvest_data[slot] = {"query": "approved", "candidates": [pick]}
            choices[slot] = pick["title"]
            json.dump(harvest_data, open(HARVEST, "w"), indent=1)
            json.dump(choices, open(CHOICES, "w"), indent=1)
            saved = sys.argv
            sys.argv = [saved[0], "--only", slot, "--download"]
            try:
                download()
            finally:
                sys.argv = saved
    print("apply done")



if __name__ == "__main__":
    os.makedirs(WORK, exist_ok=True)
    if "--harvest" in sys.argv:
        harvest()
    elif "--autoselect" in sys.argv:
        autoselect()
    elif "--download" in sys.argv:
        download()
    elif "--candidates" in sys.argv:
        candidates_for()
    elif "--candsheet" in sys.argv:
        cand_sheet()
    elif "--apply" in sys.argv:
        apply_overrides()
    elif "--sheet" in sys.argv:
        sheet(int(sys.argv[sys.argv.index("--sheet") + 1]) if "--sheet" in sys.argv and len(sys.argv) > sys.argv.index("--sheet") + 1 else 0)
    else:
        print(__doc__)
