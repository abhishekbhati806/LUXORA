# Deploy & Publish Roadmap

Everything needed to get LUXORA **on GitHub** and **live on the internet**, in order.
No paid accounts are required for the recommended path (GitHub + Render free + MongoDB Atlas free tier).

```
[1 push to GitHub] ─▶ [2 create Atlas cluster] ─▶ [3 deploy on Render] ─▶ [4 seed] ─▶ [5 verify] ─▶ optional: CI, Docker, VPS, Cloudinary
```

---

## 0. Before you push — 30-second hygiene check

The repo is already structured for this (18 logical commits on `master`, `.gitignore` excludes `.env`, secrets are only in `.env.example` with empty values). Confirm:

```bash
cd luxora
git status                    # should be clean
git ls-files | grep -E "\.env$|node_modules|dist/"   # must print NOTHING
npm run verify                # lint + build + 69 API checks + 19 UI routes — must pass
```

If `npm run verify` is green, you're publishable.

---

## 1. Push to GitHub

### With the `gh` CLI (fastest)

```bash
cd luxora
git branch -M main                          # GitHub convention
gh auth login                               # browser flow, no token pasting needed
gh repo create luxora --public --source=. --push
```

### Manually (no CLI)

1. GitHub → **New repository** → name `luxora`, **no** README/.gitignore/license (the repo has its own) → Create.
2. Then:

```bash
cd luxora
git branch -M main
git remote add origin git@github.com:<your-username>/luxora.git   # or https://github.com/…
git push -u origin main
```

### Make it look professional

- **About**: `Premium hotel booking — React + Vite + Tailwind + Framer Motion, Express + MongoDB, JWT. Full-stack, production-grade.` + website URL once deployed.
- **Topics**: `react`, `node`, `mongodb`, `express`, `booking`, `tailwind`, `framer-motion`, `fullstack`.
- Add 2–3 screenshots (home, discover, admin) under `docs/` and link them near the top of the README.
- Add a license badge (`MIT`) and a CI badge once §5 is set:
  `[![CI](https://github.com/<you>/luxora/actions/workflows/ci.yml/badge.svg)](https://github.com/<you>/luxora/actions/workflows/ci.yml)`

> **Never** commit `.env`. It contains your local dev JWT secret; it is ignored via `.gitignore`.

---

## 2. Database — MongoDB Atlas (free M0)

The app needs real MongoDB. Atlas' free tier is enough.

1. [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas) → Create project → **M0 Free Shared** cluster (pick a region near your users/host).
2. **Database Access** → add user `luxora_app` with a strong password (no special chars needing URL-encoding, or percent-encode them).
3. **Network Access** → for a public demo, add `0.0.0.0/0` (everywhere) — Render's egress IPs rotate, so a CIDR list breaks. Understand the tradeoff: your app API is the only door, and it enforces JWT + rate limits; rotate the DB password if it ever leaks.
4. **Connect** → *Drivers* → copy the SRV string:

```
mongodb+srv://luxora_app:<password>@cluster0.xxxxx.mongodb.net/luxora?retryWrites=true&w=majority
```

That's `MONGO_URI`. The M0 cluster has ~512 MB storage — the seeded demo world is a few MB.

---

## 3. Hosting — three routes, pick one

### Route A — Render (recommended: free, zero ops, blueprint included)

This repo ships **`render.yaml`**, so the service self-configures.

1. Push is done (§1). Sign up at [render.com](https://render.com) with GitHub.
2. **New → Blueprint** → select `luxora` repo → Render reads `render.yaml` and pre-fills everything.
3. In the form, set the values marked `sync: false`:
   - `MONGO_URI` → the Atlas SRV string (mark as **secret**).
   - `CORS_ORIGIN` and `CLIENT_URL` → your assigned URL (e.g. `https://luxora.onrender.com`). If you skip this, set them in the dashboard after the first deploy.
   - `SEED_ADMIN_PASSWORD` / `SEED_DEMO_PASSWORD` → anything (see §6 — don't ship the defaults publicly).
   - `JWT_SECRET` / `JWT_REFRESH_SECRET` auto-generate.
4. Create → it runs `npm ci && npm run build`, then `npm start` (Express serves both the API **and** the built SPA — one origin, no CORS pain in production).
5. Health: `https://<name>.onrender.com/api/v1/health` should return `{"ok":true,…,"database":"connected"}`.

> Free web services **sleep after ~15 min idle** — first request takes ~30–60 s. That's normal on the free tier; upgrading to a Starter instance removes it. If the blueprint flow bores you, "New Web Service" with these three fields is equivalent:
> **Build** `npm ci && npm run build` · **Start** `npm start` · **Health check path** `/api/v1/health`.

### Route B — Railway (fastest DX, trial credit)

```bash
npm i -g @railway/cli
railway login
cd luxora && railway init && railway up
railway variables --set "MONGO_URI=<atlas>" --set "JWT_SECRET=…" --set "JWT_REFRESH_SECRET=…" \
  --set "NODE_ENV=production" --set "CORS_ORIGIN=https://<url>" --set "CLIENT_URL=https://<url>"
```

Railway runs the `start` script; it serves dist automatically. No free perpetual tier (trial credit), but no cold starts.

### Route C — VPS + Docker (full control, ~$5/mo)

A production **Dockerfile** ships in this repo (multi-stage; Express serves API + SPA; healthcheck baked in).

```bash
# on your server, with docker installed
git clone https://github.com/<you>/luxora.git && cd luxora
docker build -t luxora .
docker run -d --name luxora --restart unless-stopped -p 127.0.0.1:4000:4000 \
  --env-file .env.production -v luxora-uploads:/app/uploads luxora
```

`.env.production` = same keys as `.env.example` (`MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `NODE_ENV=production`, `CORS_ORIGIN=https://yourdomain.com`, `CLIENT_URL=https://yourdomain.com`). Then put a reverse proxy in front for TLS — Caddy is two lines:

```
yourdomain.com {
    reverse_proxy 127.0.0.1:4000
}
```

No-Docker variant on the same VPS: `git clone && npm ci && npm run build`, then a systemd unit running `node server/src/index.js` with those env vars — the app is a single process, nothing else to orchestrate.

---

## 4. Seed the production database (once)

The demo world (16 named hotels, rooms, bookings, reviews, users) doesn't come with Atlas. From your machine, pointed at the cluster:

```bash
MONGO_URI="mongodb+srv://…" npm run seed
```

(Or from Render's **Shell** tab: `npm run seed`. `seed:reset` exists if you want to start over — it drops and re-creates the collections.)

Production with your *own* data: skip seeding and insert hotels/rooms directly — nothing in the app depends on demo content.

---

## 5. CI — already wired

`.github/workflows/ci.yml` runs on every push/PR with a real MongoDB service container:

`npm ci → lint → build → seed → start server → api-smoke (69 checks) → QR round-trips → Playwright render-probe (19 routes)`

Nothing to configure — pushing to `main` turns CI on. Green badge = the deployed behavior on your laptop is the behavior everywhere.

---

## 6. Before you share the URL publicly — checklist

- [ ] **Change the seed passwords.** The login page ships *demo-account quick-fill chips* — great for a portfolio, bad for the open internet. Set `SEED_ADMIN_PASSWORD`/`SEED_DEMO_PASSWORD` to unique values (they're in `render.yaml`), or remove the chips (`client/src/pages/LoginPage.jsx`, the "Demo accounts" block).
- [ ] Atlas Network Access is deliberate (`0.0.0.0/0` vs CIDR list) and the DB user password is strong.
- [ ] `JWT_SECRET`/`JWT_REFRESH_SECRET` are distinct 64-hex strings (Render blueprint generates them).
- [ ] `CORS_ORIGIN`/`CLIENT_URL` match the exact origin (`https://…`, no trailing slash).
- [ ] `/api/v1/health` → ok; sign in; create a booking; open an admin page. All four touch the whole stack (auth, write path, transactions, analytics).
- [ ] Optional: **Cloudinary** for admin image uploads — set `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` and media endpoints go live (they return a clean `501` until then; nothing else breaks).

## 7. Common gotchas (all pre-empted, listed anyway)

| Symptom | Cause → fix |
|---|---|
| Deploy starts, all API 500s | Atlas Network Access blocks Render → allow `0.0.0.0/0`. |
| `MongoServerSelectionError` | `MONGO_URI` missing `?retryWrites=true&w=majority` or wrong password encoding. |
| Boot dies with "Configuration error" | `NODE_ENV=production` enforces ≥32-char distinct JWT secrets — set them. |
| Refresh cookie not surviving reload | `CORS_ORIGIN`/`CLIENT_URL` mismatch with the actual host, or you accessed via `http://` on an https deploy. |
| First request after 20 min takes a minute | Render free-tier sleep — cold start. Upgrade or keep-alive cron (hit `/health`). |
| "0 stays" everywhere after deploy | DB not seeded (§4). |

## 8. Day-2 operations

- **Backups**: Atlas M0 → Database → *Quickstart backups* (daily on paid tiers; on M0, `mongodump --uri=…` from your laptop on a cron works fine).
- **Logs**: Render dashboard streams morgan + the boot warnings; nothing to ship.
- **Rollbacks**: Render keeps prior builds — one click back.
- **Migrations**: none needed at this scale; schema changes land with `npm run seed:reset` (demo data) or a one-off script.
- **Scale**: same image/`npm start` on any host (Fly.io, Railway, a $5 VPS) — one process, stateless apart from MongoDB and `uploads/` (mount a volume, or set Cloudinary and it's stateless in full).
