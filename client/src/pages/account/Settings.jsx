import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertTriangle, Bell, Coins, KeyRound, LogOut, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Field from '../../components/ui/Field';
import Overlay from '../../components/ui/Overlay';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { authService, usersService, tokenStore } from '../../services';
import { CURRENCIES } from '../../utils/format';
import { setSeo } from '../../utils/seo';
import { cn } from '../../utils/cn';

export default function Settings() {
  const { user, updateProfile, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(null);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [danger, setDanger] = useState(false);
  const [closePassword, setClosePassword] = useState('');
  const [closing, setClosing] = useState(false);

  useEffect(() => setSeo({ title: 'Settings', description: 'Account preferences and security.', noindex: true }), []);

  const currency = user?.preferences?.currency || 'INR';
  const newsletter = Boolean(user?.preferences?.newsletter);

  const changePassword = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!pw.currentPassword) errs.currentPassword = 'Confirm the password you use today.';
    if (pw.newPassword.length < 8) errs.newPassword = 'Use at least 8 characters.';
    if (pw.newPassword !== pw.confirm) errs.confirm = 'Both new passwords must match.';
    setPwErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy('pw');
    try {
      await authService.changePassword(pw);
      toast.success('Password changed', 'Every other device has been signed out.');
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      setTimeout(() => logout(), 400);
    } catch (err) {
      setPwErrors(err.fieldErrors || {});
      toast.error('Could not change password', err.message);
    } finally {
      setBusy(null);
    }
  };

  const closeAccount = async () => {
    setClosing(true);
    try {
      await usersService.deactivate(closePassword);
      toast.info('Account closed', 'Your profile is deactivated and the session ended.');
      tokenStore.clear();
      navigate('/', { replace: true });
    } catch (err) {
      toast.error('Could not close your account', err.fieldErrors?.password || err.message);
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <header>
        <h1 className="text-h3 font-light">Settings</h1>
        <p className="mt-1.5 text-tiny text-muted">Preferences are stored on your account, so they follow you between devices.</p>
      </header>

      <section className="card p-5">
        <h2 className="flex items-center gap-2 text-small font-semibold text-ink">
          <Coins size={15} className="text-accent-deep" aria-hidden /> Display currency
        </h2>
        <p className="mt-1 max-w-[50ch] text-[0.6875rem] leading-relaxed text-muted">
          Prices are stored in INR; this only changes how they are shown. The property charges in its own currency.
        </p>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Currency">
          {Object.entries(CURRENCIES).map(([key, cfg]) => (
            <button
              key={key}
              type="button"
              aria-pressed={currency === key}
              disabled={busy === key}
              onClick={async () => {
                setBusy(key);
                try {
                  await updateProfile({ preferences: { ...user?.preferences, currency: key } });
                  toast.success(`Prices now in ${key}`);
                } catch {
                  toast.error('Could not save that preference');
                } finally {
                  setBusy(null);
                }
              }}
              className={cn('rounded-pill border px-4 py-2 text-tiny font-semibold transition-all duration-200', currency === key ? 'border-accent bg-accent-faint text-accent-deep' : 'border-line bg-surface text-ink-2 hover:border-line-strong')}
            >
              {cfg.label}
              {busy === key ? '…' : ''}
            </button>
          ))}
        </div>
      </section>

      <section className="card flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="flex gap-3">
          <Bell size={15} className="mt-0.5 text-accent-deep" aria-hidden />
          <div>
            <h2 className="text-small font-semibold text-ink">Field notes newsletter</h2>
            <p className="mt-1 max-w-[46ch] text-[0.6875rem] leading-relaxed text-muted">Twice a month: new properties, honest verdicts, fare windows worth knowing about.</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={newsletter}
          aria-label="Toggle newsletter"
          onClick={async () => {
            try {
              await updateProfile({ preferences: { ...user?.preferences, newsletter: !newsletter } });
            } catch {
              toast.error('Could not update that preference');
            }
          }}
          className={cn('relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-300', newsletter ? 'border-accent-deep bg-accent-deep' : 'border-line-strong bg-sunk')}
        >
          <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 32 }} className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-rest', newsletter ? 'left-[1.5rem]' : 'left-0.5')} />
        </button>
      </section>

      <form onSubmit={changePassword} className="card p-5" noValidate>
        <h2 className="flex items-center gap-2 text-small font-semibold text-ink">
          <KeyRound size={15} className="text-accent-deep" aria-hidden /> Password
        </h2>
        <p className="mt-1 text-[0.6875rem] text-muted">Changing it signs out every other device immediately.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Current password" type="password" autoComplete="current-password" value={pw.currentPassword} error={pwErrors.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} />
          </div>
          <Field label="New password" type="password" autoComplete="new-password" value={pw.newPassword} error={pwErrors.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} />
          <Field label="Confirm new" type="password" autoComplete="new-password" value={pw.confirm} error={pwErrors.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} />
        </div>
        <Button type="submit" size="sm" className="mt-4" loading={busy === 'pw'} disabled={!pw.currentPassword && !pw.newPassword}>
          Update password
        </Button>
      </form>

      <section className="rounded-lg border border-danger/30 bg-danger/[0.03] p-5">
        <h2 className="flex items-center gap-2 text-small font-semibold text-danger">
          <AlertTriangle size={15} aria-hidden /> Danger zone
        </h2>
        <p className="mt-1 max-w-[52ch] text-[0.6875rem] leading-relaxed text-ink-2">
          Closing your account hides your profile and sign-in. Bookings and receipts are retained because you may still need them —{' '}
          <Link to="/account/trips" className="font-semibold underline underline-offset-2">
            download them first
          </Link>
          .
        </p>
        <Button size="sm" variant="danger" className="mt-4" icon={Trash2} onClick={() => setDanger(true)}>
          Close my account
        </Button>
      </section>

      <Overlay open={danger} onClose={() => setDanger(false)} labelledBy="close-title" describedBy="close-body">
        <div className="p-6">
          <h2 id="close-title" className="font-display text-[1.35rem] text-ink">
            Close this account?
          </h2>
          <p id="close-body" className="mt-2 text-tiny leading-relaxed text-muted">
            Confirm with your password. This is reversible only by writing to the desk.
          </p>
          <div className="mt-4">
            <Field label="Password" type="password" value={closePassword} onChange={(e) => setClosePassword(e.target.value)} placeholder="Your current password" />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="quiet" size="sm" onClick={() => setDanger(false)}>
              Keep my account
            </Button>
            <Button variant="danger" size="sm" loading={closing} disabled={closePassword.length < 4} onClick={closeAccount} icon={LogOut}>
              Close account
            </Button>
          </div>
        </div>
      </Overlay>
    </div>
  );
}
