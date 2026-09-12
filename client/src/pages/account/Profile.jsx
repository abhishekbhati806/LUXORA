import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Camera, Check, Save, User } from 'lucide-react';
import Button from '../../components/ui/Button';
import Field from '../../components/ui/Field';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { setSeo } from '../../utils/seo';
import { cn } from '../../utils/cn';
import { initials } from '../../utils/format';

const STYLES = ['beach', 'city', 'mountain', 'desert', 'island', 'culture'];

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(() => ({
    name: user?.name || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
    nationality: user?.nationality || 'India',
    travelStyles: user?.preferences?.travelStyles || [],
  }));
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => setSeo({ title: 'Profile', description: 'Your LUXORA profile.', noindex: true }), []);

  const dirty = useMemo(
    () =>
      form.name !== (user?.name || '') ||
      form.phone !== (user?.phone || '') ||
      form.bio !== (user?.bio || '') ||
      form.nationality !== (user?.nationality || '') ||
      JSON.stringify(form.travelStyles) !== JSON.stringify(user?.preferences?.travelStyles || []),
    [form, user],
  );

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Add a name the hotel can greet you with.';
    if (form.bio.length > 320) next.bio = 'Keep it under 320 characters.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await updateProfile({
        name: form.name.trim(),
        phone: form.phone.trim(),
        bio: form.bio.trim(),
        nationality: form.nationality,
        preferences: { ...user?.preferences, travelStyles: form.travelStyles },
      });
      setSaved(true);
      toast.success('Profile updated', 'The desk will greet you by this name.');
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      setErrors(err.fieldErrors || {});
      toast.error('Could not save', err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-2xl" noValidate>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-h3 font-light">Profile</h1>
          <p className="mt-1.5 text-tiny text-muted">Used for check-in, greetings and priority at the desk.</p>
        </div>
        <Button type="submit" size="sm" loading={busy} icon={saved ? Check : Save} variant={saved ? 'accent' : 'primary'} disabled={!dirty && !busy}>
          {saved ? 'Saved' : dirty ? 'Save changes' : 'No changes'}
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-5 rounded-lg border border-line bg-surface p-5">
        <span className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-ink font-display text-[1.5rem] uppercase text-accent-soft">
          {user?.avatar?.url ? <img src={user.avatar.url} alt="" className="h-full w-full object-cover" /> : initials(user?.name)}
        </span>
        <div className="min-w-[12rem] flex-1">
          <p className="flex items-center gap-2 text-small font-semibold text-ink">
            {user?.name}
            {user?.role === 'admin' ? <span className="pill bg-accent-faint text-accent-deep">staff</span> : <span className="pill bg-success-soft text-success"><BadgeCheck size={10} aria-hidden /> verified</span>}
          </p>
          <p className="mt-0.5 text-tiny text-muted">{user?.email}</p>
          <label className="btn btn-ghost btn-sm mt-3 cursor-pointer">
            <Camera size={13} aria-hidden />
            <input type="file" accept="image/*" className="sr-only" onChange={() => toast.info('Avatars need Cloudinary', 'Set CLOUDINARY_* on the server to enable uploads.')} />
            Change photo
          </label>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Full name" value={form.name} error={errors.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoComplete="name" />
        <Field label="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+91 98200 41122" autoComplete="tel" hint="Shared with the property before arrival." />
        <Field as="select" label="Nationality" value={form.nationality} onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))}>
          {['India', 'United Arab Emirates', 'United Kingdom', 'United States', 'France', 'Germany', 'Japan', 'Singapore', 'Australia', 'Other'].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Field>
        <div className="sm:col-span-2">
          <Field as="textarea" rows={3} label="A line for the desk" value={form.bio} error={errors.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} placeholder="Prefers a high floor, drinks tea not coffee, always asks for the late check-out." hint={`${form.bio.length}/320`} />
        </div>
      </div>

      <fieldset className="mt-6">
        <legend className="flex items-center gap-2 text-micro uppercase tracking-luxe text-muted">
          <User size={11} aria-hidden /> Travel style — shapes your recommendations
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {STYLES.map((s) => {
            const on = form.travelStyles.includes(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => setForm((f) => ({ ...f, travelStyles: on ? f.travelStyles.filter((x) => x !== s) : [...f.travelStyles, s] }))}
                className={cn('chip capitalize transition-all duration-200', on ? 'chip-active' : 'hover:border-line-strong')}
              >
                {s}
                {on ? <Check size={12} aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      </fieldset>
    </form>
  );
}
