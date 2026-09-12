import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Archive, Check, ExternalLink, ImagePlus, Loader2, Plus, RotateCcw, Star, Trash2, X,
} from 'lucide-react';
import DataTable from '../../components/admin/DataTable';
import Button from '../../components/ui/Button';
import Field from '../../components/ui/Field';
import Img from '../../components/ui/Img';
import Overlay from '../../components/ui/Overlay';
import Tag from '../../components/ui/Tag';
import { AMENITIES_META, PROPERTY_TYPES } from '../../data/filters';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';
import { adminService, API_BASE } from '../../services';
import { cn } from '../../utils/cn';
import { money, pluralize } from '../../utils/format';
import { setSeo } from '../../utils/seo';

const BLANK = {
  name: '',
  tagline: '',
  propertyType: 'hotel',
  starRating: 5,
  address: '',
  location: { city: '', country: 'India', neighbourhood: '' },
  descriptionText: '',
  priceFrom: 12000,
  amenities: [],
  featured: false,
  active: true,
  coverImage: { url: '', alt: '' },
  rooms: [],
};

export default function Hotels() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // null | 'new' | hotel
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  const { data, loading, error, refetch } = useApi((signal) => adminService.hotels({ page, limit: 12 }, signal), [page]);
  const rows = data?.data || [];
  const pages = data?.meta?.pages || 1;
  const total = data?.meta?.total || 0;

  useEffect(() => setSeo({ title: 'Properties', description: 'Create, edit and retire the LUXORA catalogue.', noindex: true }), []);

  const remove = async (hotel, force = false) => {
    setBusy(true);
    try {
      await adminService.deleteHotel(hotel._id, force);
      toast.success(`${hotel.name} deleted`, force ? 'Its bookings were released too.' : 'Rooms and reviews were removed with it.');
      setConfirmDelete(null);
      refetch();
    } catch (err) {
      if (err.status === 409) {
        toast.error('Bookings in the way', err.message);
      } else {
        toast.error('Could not delete', err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const archive = async (hotel) => {
    try {
      await adminService.updateHotel(hotel._id, { active: false });
      toast.info(`${hotel.name} archived`, 'Hidden from search; existing bookings are untouched.');
      refetch();
    } catch (err) {
      toast.error('Could not archive', err.message);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Property',
      sortKey: 'name',
      render: (r) => (
        <div className="flex items-center gap-3">
          <span className="h-11 w-14 shrink-0 overflow-hidden rounded-sm bg-sunk">
            {r.coverImage?.url ? <Img src={r.coverImage.url} alt="" ratio={4 / 3} kind="thumb" className="h-full" /> : null}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-tiny font-semibold text-ink">{r.name}</span>
            <span className="block truncate text-[0.6875rem] text-muted">
              {r.location?.city}, {r.location?.country} · /{r.slug}
            </span>
          </span>
        </div>
      ),
    },
    { key: 'propertyType', label: 'Type', sortKey: 'propertyType', render: (r) => <span className="capitalize text-tiny">{r.propertyType}</span> },
    { key: 'starRating', label: 'Stars', sortKey: 'starRating', align: 'center', render: (r) => <span className="num inline-flex items-center gap-1 text-tiny"><Star size={11} className="text-accent" fill="currentColor" strokeWidth={0} aria-hidden />{r.starRating}</span> },
    { key: 'priceFrom', label: 'From', sortKey: 'priceFrom', align: 'right', mono: true, render: (r) => <span className="text-tiny font-semibold">{money(r.priceFrom, { compact: true })}</span> },
    { key: 'rating', label: 'Guests', sortKey: 'rating', align: 'right', render: (r) => <span className="text-tiny">{r.rating ? `${r.rating} ★ / ${pluralize(r.reviewCount, 'review')}` : <span className="text-muted">unrated</span>}</span> },
    { key: 'rooms', label: 'Rooms', render: (r) => <span className="text-tiny text-muted">{r.roomCount ? `${r.roomCount} listed` : '—'}</span> },
    {
      key: 'status',
      label: 'Status',
      render: (r) => (
        <span className="flex items-center gap-1.5">
          <Tag tone={r.active ? 'success' : 'neutral'} size="sm">{r.active ? 'live' : 'archived'}</Tag>
          {r.featured ? <Tag tone="accent" size="sm">featured</Tag> : null}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (r) => (
        <span className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Link to={`/stay/${r.slug}`} target="_blank" rel="noreferrer" aria-label={`Preview ${r.name}`} className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-sunk hover:text-ink">
            <ExternalLink size={13} aria-hidden />
          </Link>
          <button type="button" onClick={() => archive(r)} disabled={!r.active} aria-label={`Archive ${r.name}`} className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-sunk hover:text-ink disabled:opacity-30">
            <Archive size={13} aria-hidden />
          </button>
          <button type="button" onClick={() => setConfirmDelete(r)} aria-label={`Delete ${r.name}`} className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-danger-soft hover:text-danger">
            <Trash2 size={13} aria-hidden />
          </button>
          <Button size="sm" variant="ghost" className="!min-h-8 !px-3" onClick={() => setEditing(r)}>
            Edit
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-micro uppercase tracking-luxe text-muted">Catalogue</p>
          <h1 className="mt-1.5 font-display text-[1.85rem] font-light leading-none text-ink">Properties</h1>
          <p className="mt-2 text-tiny text-muted">
            {loading ? 'Loading…' : `${pluralize(total, 'property')} · ${rows.filter((r) => r.featured).length} featured on the homepage this page`}
          </p>
        </div>
        <Button size="sm" icon={Plus} onClick={() => setEditing('new')}>
          New property
        </Button>
      </header>

      {error ? (
        <div className="card border-danger/30 bg-danger/[0.04] p-6">
          <p className="text-small font-semibold text-danger">The catalogue could not be loaded</p>
          <p className="mt-1 text-tiny text-ink-2">{error.message}</p>
        </div>
      ) : (
        <DataTable columns={columns} rows={rows} loading={loading} page={page} pages={pages} onPage={setPage} searchKeys={['name', 'location.city', 'slug']} emptyLabel="No properties yet — create the first one" />
      )}

      <HotelForm
        open={Boolean(editing)}
        hotel={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          refetch();
        }}
      />

      <Overlay open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} labelledBy="del-title" className="!max-w-md">
        {confirmDelete ? (
          <div className="p-6">
            <h2 id="del-title" className="font-display text-[1.3rem] text-ink">
              Delete {confirmDelete.name}?
            </h2>
            <p className="mt-2 text-tiny leading-relaxed text-muted">
              This removes the property, its rooms and its reviews. If guests have stays coming up, the API will refuse the delete — archive instead.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="quiet" size="sm" onClick={() => setConfirmDelete(null)}>
                Keep it
              </Button>
              <Button variant="ghost" size="sm" icon={Archive} onClick={() => { archive(confirmDelete); setConfirmDelete(null); }}>
                Archive
              </Button>
              <Button variant="danger" size="sm" loading={busy} icon={Trash2} onClick={() => remove(confirmDelete)}>
                Delete permanently
              </Button>
            </div>
          </div>
        ) : null}
      </Overlay>
    </div>
  );
}

/* ------------------------------------------------------------------ form */
function HotelForm({ open, hotel, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [rooms, setRooms] = useState([]);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (hotel) {
      setForm({
        name: hotel.name || '',
        tagline: hotel.tagline || '',
        propertyType: hotel.propertyType || 'hotel',
        starRating: hotel.starRating || 5,
        address: hotel.address || '',
        location: { city: hotel.location?.city || '', country: hotel.location?.country || 'India', neighbourhood: hotel.location?.neighbourhood || '' },
        descriptionText: (hotel.description || []).join('\n\n'),
        priceFrom: hotel.priceFrom || 12000,
        amenities: (hotel.amenities || []).map((a) => a.key),
        featured: Boolean(hotel.featured),
        active: hotel.active !== false,
        coverImage: { url: hotel.coverImage?.url || '', alt: hotel.coverImage?.alt || '' },
      });
      adminService
        .rooms(hotel._id)
        .then((d) => setRooms(d?.rooms || []))
        .catch(() => setRooms([]));
    } else {
      setForm({ ...BLANK });
      setRooms([]);
    }
    setErrors({});
  }, [open, hotel]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setLocation = (patch) => setForm((f) => ({ ...f, location: { ...f.location, ...patch } }));

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 3) e.name = 'Give the property a name of at least 3 characters.';
    if (!form.location.city.trim()) e.city = 'City is required.';
    if (!form.location.country.trim()) e.country = 'Country is required.';
    if (form.descriptionText.trim().length < 40) e.description = 'Write at least a sentence — guests read this first.';
    if (!Number.isFinite(Number(form.priceFrom)) || Number(form.priceFrom) <= 0) e.priceFrom = 'Add a nightly rate.';
    if (form.coverImage.url && !/^(https?:\/\/|\/img\/|\/uploads\/)/.test(form.coverImage.url)) e.cover = 'Use an absolute URL or a path starting with /img/ or /uploads/.';
    return e;
  };

  const submit = async (event) => {
    event.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error('Check the highlighted fields', `${Object.keys(e).length} field${Object.keys(e).length > 1 ? 's need' : ' needs'} attention.`);
      return;
    }

    const payload = {
      name: form.name.trim(),
      tagline: form.tagline.trim(),
      propertyType: form.propertyType,
      starRating: Number(form.starRating),
      address: form.address.trim() || `${form.location.neighbourhood || ''}, ${form.location.city}`.trim(),
      location: { city: form.location.city.trim(), country: form.location.country.trim(), neighbourhood: form.location.neighbourhood.trim() },
      description: form.descriptionText.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
      priceFrom: Number(form.priceFrom),
      amenities: form.amenities.map((key) => ({ key })),
      featured: form.featured,
      active: form.active,
      coverImage: form.coverImage.url ? { url: form.coverImage.url, alt: form.coverImage.alt || form.name.trim(), kind: 'exterior' } : undefined,
    };

    setSaving(true);
    try {
      if (hotel) {
        await adminService.updateHotel(hotel._id, payload);
        for (const r of rooms.filter((x) => x._id && x.dirty)) {
          // sequential on purpose: the API rate-limits parallel bursts
          await adminService.updateRoom(hotel._id, r._id, { name: r.name, pricePerNight: Number(r.pricePerNight), inventory: Number(r.inventory), maxGuests: Number(r.maxGuests), description: r.description, active: r.active !== false });
        }
        for (const r of rooms.filter((x) => !x._id)) {
          // sequential on purpose: the API rate-limits parallel bursts
          await adminService.createRoom(hotel._id, { ...r, pricePerNight: Number(r.pricePerNight), inventory: Number(r.inventory), maxGuests: Number(r.maxGuests) });
        }
        toast.success('Property updated', `${form.name} and its rooms are saved.`);
      } else {
        await adminService.createHotel({ ...payload, rooms: rooms.map((r) => ({ ...r, pricePerNight: Number(r.pricePerNight), inventory: Number(r.inventory), maxGuests: Number(r.maxGuests) })) });
        toast.success('Property created', 'It is live in search immediately.');
      }
      onSaved?.();
    } catch (err) {
      setErrors(err.fieldErrors || {});
      toast.error('Could not save', err.message);
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('images', file);
      const res = await fetch(`${API_BASE}/admin/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('luxora.token')}` }, body: fd, credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Upload failed');
      const url = json.data.files?.[0]?.url;
      set({ coverImage: { ...form.coverImage, url } });
      toast.success('Image stored', url.startsWith('/uploads') ? 'Saved on the server (Cloudinary not configured).' : 'Uploaded to your media library.');
    } catch (err) {
      toast.error('Upload failed', err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Overlay open={open} onClose={onClose} side="right" labelledBy="hotel-form-title" className="w-full max-w-[38rem]">
      <form onSubmit={submit} className="min-h-full" noValidate>
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-canvas/95 px-6 py-4 backdrop-blur">
          <div>
            <p className="text-micro uppercase tracking-luxe text-muted">{hotel ? 'Editing' : 'New listing'}</p>
            <h2 id="hotel-form-title" className="mt-1 font-display text-[1.35rem] leading-none text-ink">
              {hotel ? hotel.name : 'Add a property'}
            </h2>
          </div>
          <span className="flex items-center gap-2">
            <Button type="button" variant="quiet" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={saving} icon={saving ? undefined : Check}>
              {hotel ? 'Save changes' : 'Create property'}
            </Button>
          </span>
        </header>

        <div className="space-y-7 p-6">
          <fieldset className="space-y-4">
            <legend className="text-micro uppercase tracking-luxe text-accent-deep">Identity</legend>
            <Field label="Name" required value={form.name} error={errors.name} onChange={(e) => set({ name: e.target.value })} placeholder="Rambagh Court" />
            <Field label="Tagline" value={form.tagline} onChange={(e) => set({ tagline: e.target.value })} placeholder="A restored maharaja residence where courtyards hold the cool." hint="One line. It appears on the card and under the title." maxLength={160} />
            <Field as="textarea" rows={5} label="Description" required value={form.descriptionText} error={errors.description} onChange={(e) => set({ descriptionText: e.target.value })} hint="Separate paragraphs with a blank line — two or three reads best." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field as="select" label="Property type" value={form.propertyType} onChange={(e) => set({ propertyType: e.target.value })}>
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </Field>
              <Field label="Star rating" type="number" min={1} max={7} value={form.starRating} onChange={(e) => set({ starRating: e.target.value })} />
            </div>
          </fieldset>

          <fieldset className="space-y-4 border-t border-line pt-6">
            <legend className="text-micro uppercase tracking-luxe text-accent-deep">Where</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="City" required value={form.location.city} error={errors.city} onChange={(e) => setLocation({ city: e.target.value })} placeholder="Jaipur" />
              <Field label="Country" required value={form.location.country} error={errors.country} onChange={(e) => setLocation({ country: e.target.value })} placeholder="India" />
              <Field label="Neighbourhood" value={form.location.neighbourhood} onChange={(e) => setLocation({ neighbourhood: e.target.value })} placeholder="Civil Lines" />
              <Field label="Address" value={form.address} onChange={(e) => set({ address: e.target.value })} placeholder="Brahmpuri, Gangapore Bas" />
            </div>
          </fieldset>

          <fieldset className="space-y-4 border-t border-line pt-6">
            <legend className="text-micro uppercase tracking-luxe text-accent-deep">Commercial</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="From (₹ per night)" required type="number" min={0} step={500} value={form.priceFrom} error={errors.priceFrom} onChange={(e) => set({ priceFrom: e.target.value })} hint="Auto-updated from the cheapest room once rooms exist." />
              <div className="flex flex-col justify-end gap-2 pb-1">
                <label className="flex cursor-pointer items-center gap-2.5 text-tiny font-semibold text-ink">
                  <input type="checkbox" checked={form.featured} onChange={(e) => set({ featured: e.target.checked })} className="h-4 w-4 rounded border-line-strong accent-[#B08542]" />
                  Feature on the homepage
                </label>
                <label className="flex cursor-pointer items-center gap-2.5 text-tiny font-semibold text-ink">
                  <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} className="h-4 w-4 rounded border-line-strong accent-[#B08542]" />
                  Live in search
                </label>
              </div>
            </div>
            <div>
              <p className="field-label">Amenities</p>
              <div className="mt-1 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-md border border-line bg-surface p-2.5 thin-scroll">
                {AMENITIES_META.map((a) => {
                  const on = form.amenities.includes(a.key);
                  return (
                    <button
                      key={a.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set({ amenities: on ? form.amenities.filter((x) => x !== a.key) : [...form.amenities, a.key] })}
                      className={cn('rounded-pill border px-2.5 py-1 text-[0.6875rem] font-semibold transition-colors', on ? 'border-accent bg-accent-faint text-accent-deep' : 'border-line bg-canvas text-ink-2 hover:border-line-strong')}
                    >
                      {a.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[0.6875rem] text-muted">{form.amenities.length} selected · keys are validated against the server catalogue</p>
            </div>
          </fieldset>

          <fieldset className="space-y-4 border-t border-line pt-6">
            <legend className="text-micro uppercase tracking-luxe text-accent-deep">Cover image</legend>
            <div className="grid gap-4 sm:grid-cols-[9rem_1fr]">
              <div className="relative aspect-[4/3] overflow-hidden rounded-sm border border-line bg-sunk">
                {form.coverImage.url ? (
                  <Img src={form.coverImage.url} alt="" ratio={4 / 3} kind="thumb" className="h-full border-0" />
                ) : (
                  <span className="grid h-full place-items-center text-[0.625rem] uppercase tracking-luxe text-muted">no image</span>
                )}
              </div>
              <div className="space-y-3">
                <Field label="Image URL or path" value={form.coverImage.url} error={errors.cover} onChange={(e) => set({ coverImage: { ...form.coverImage, url: e.target.value } })} placeholder="/img/covers/cov-rambagh.jpg" />
                <Field label="Alt text" required={Boolean(form.coverImage.url)} value={form.coverImage.alt} onChange={(e) => set({ coverImage: { ...form.coverImage, alt: e.target.value } })} placeholder="Lime-plaster courtyard with a neem tree at dawn" />
                <div className="flex items-center gap-2">
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
                  <Button type="button" size="sm" variant="ghost" icon={uploading ? undefined : ImagePlus} onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? <><Loader2 size={13} className="animate-spin" aria-hidden /> Uploading</> : 'Upload image'}
                  </Button>
                  <span className="text-[0.625rem] leading-tight text-muted">
                    Uses Cloudinary when configured, <code className="rounded bg-sunk px-1">/uploads</code> otherwise.
                  </span>
                </div>
              </div>
            </div>
          </fieldset>

          <RoomsEditor rooms={rooms} setRooms={setRooms} editing={Boolean(hotel)} />
        </div>
      </form>
    </Overlay>
  );
}

function RoomsEditor({ rooms, setRooms, editing }) {
  const add = () =>
    setRooms((r) => [
      ...r,
      { key: `new-${Date.now()}`, name: '', roomType: 'deluxe', description: '', pricePerNight: 10000, maxGuests: 2, inventory: 4, beds: '1 king bed', sizeSqft: 380, active: true, _id: null, dirty: true },
    ]);

  const update = (index, patch) => setRooms((r) => r.map((room, i) => (i === index ? { ...room, ...patch, dirty: true } : room)));
  const removeAt = (index) => setRooms((r) => (r[index]._id ? r.map((room, i) => (i === index ? { ...room, active: false, dirty: true } : room)) : r.filter((_, i) => i !== index)));

  return (
    <fieldset className="border-t border-line pt-6">
      <div className="flex items-center justify-between gap-3">
        <legend className="text-micro uppercase tracking-luxe text-accent-deep">Rooms ({rooms.length})</legend>
        <Button type="button" size="sm" variant="ghost" icon={Plus} onClick={add}>
          Add room
        </Button>
      </div>
      <p className="mt-1.5 text-[0.6875rem] leading-relaxed text-muted">
        {editing ? 'Only rate, inventory, capacity and active state are edited inline — full room design lives in the API.' : 'Rooms created here become the price floor for the listing.'}
      </p>

      <div className="mt-4 space-y-3">
        {rooms.length === 0 ? <p className="rounded-md border border-dashed border-line-strong px-4 py-6 text-center text-tiny text-muted">No rooms added.</p> : null}
        {rooms.map((room, i) => (
          <motion.div key={room.key || room._id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: room.active === false ? 0.45 : 1, y: 0 }} className="rounded-md border border-line bg-surface p-3.5">
            <div className="grid gap-3 sm:grid-cols-[1.4fr_.8fr_.8fr_.7fr_.7fr_auto]">
              <Field label="Name" value={room.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Courtyard Deluxe" className="[&_.field]:min-h-9 [&_label]:mb-1 [&_label]:text-[0.625rem]" />
              <Field as="select" label="Type" value={room.roomType} onChange={(e) => update(i, { roomType: e.target.value })} className="[&_.field]:min-h-9 [&_label]:mb-1 [&_label]:text-[0.625rem]">
                {['deluxe', 'suite', 'villa', 'penthouse', 'garden'].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Field>
              <Field label="₹ / night" type="number" value={room.pricePerNight} onChange={(e) => update(i, { pricePerNight: e.target.value })} className="[&_.field]:min-h-9 [&_label]:mb-1 [&_label]:text-[0.625rem]" />
              <Field label="Sleeps" type="number" min={1} max={12} value={room.maxGuests} onChange={(e) => update(i, { maxGuests: e.target.value })} className="[&_.field]:min-h-9 [&_label]:mb-1 [&_label]:text-[0.625rem]" />
              <Field label="Inventory" type="number" min={1} max={80} value={room.inventory} onChange={(e) => update(i, { inventory: e.target.value })} className="[&_.field]:min-h-9 [&_label]:mb-1 [&_label]:text-[0.625rem]" />
              <button type="button" onClick={() => removeAt(i)} aria-label={`Remove ${room.name || 'room'}`} className="mt-5 grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-danger-soft hover:text-danger">
                {room.active === false ? <RotateCcw size={13} aria-hidden /> : <X size={14} aria-hidden />}
              </button>
            </div>
            <Field label="Description" value={room.description} onChange={(e) => update(i, { description: e.target.value })} placeholder="Lime-plaster walls, a carved jharokha window, and a bath with a window." className="mt-2 [&_.field]:min-h-9 [&_label]:mb-1 [&_label]:text-[0.625rem]" />
            {room.active === false ? <p className="mt-2 text-[0.625rem] font-semibold text-danger">Marked for removal — it disappears from search when you save.</p> : null}
          </motion.div>
        ))}
      </div>
    </fieldset>
  );
}
