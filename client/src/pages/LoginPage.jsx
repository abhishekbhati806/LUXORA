import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import Button from '../components/ui/Button';
import { Field, PasswordField } from '../components/ui/Field';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { setSeo } from '../utils/seo';

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setSeo({ title: 'Sign in', description: 'Sign in to LUXORA to see saved stays, trips and verified reviews.', noindex: true }), []);

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.email.trim()) next.email = 'Email is required.';
    if (!form.password) next.password = 'Enter your password.';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const user = await login(form);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}`, 'Your saved stays and trips are ready.');
      navigate(location.state?.from || (user.role === 'admin' ? '/admin' : '/account'), { replace: true });
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const fillDemo = (kind) =>
    setForm(kind === 'admin' ? { email: 'admin@luxora.travel', password: 'LuxoraAdmin#26' } : { email: 'aarav@me.com', password: 'LuxoraGuest#26' });

  return (
    <AuthLayout
      kicker="Welcome back"
      title="Sign in to LUXORA"
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-semibold text-accent-deep underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {formError ? (
          <motion.div role="alert" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2.5 rounded-sm border border-danger/35 bg-danger-soft px-3.5 py-3 text-tiny leading-relaxed text-danger">
            <AlertCircle size={14} className="mt-px shrink-0" aria-hidden />
            <span>{formError}</span>
          </motion.div>
        ) : null}

        <Field
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={form.email}
          error={errors.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="you@example.com"
        />
        <PasswordField
          label="Password"
          name="password"
          required
          value={form.password}
          error={errors.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          placeholder="••••••••"
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between pt-1">
          <label className="flex cursor-pointer items-center gap-2 text-tiny text-muted">
            <input type="checkbox" className="h-3.5 w-3.5 rounded border-line-strong accent-[#B08542]" defaultChecked />
            Keep me signed in
          </label>
          <button type="button" onClick={() => toast.info('Password reset', 'Not wired in this demo build — sign in with the accounts below.')} className="btn-link p-0">
            Forgot password?
          </button>
        </div>

        <Button type="submit" className="w-full" size="lg" loading={busy} arrow>
          Sign in
        </Button>
      </form>

      <div className="mt-7 rounded-md border border-accent/25 bg-accent-faint/60 p-4">
        <p className="flex items-center gap-2 text-micro uppercase tracking-luxe text-accent-deep">
          <Sparkles size={12} aria-hidden /> Demo accounts
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => fillDemo('guest')} className="group flex items-center justify-between gap-2 rounded-sm border border-line bg-surface px-3 py-2.5 text-left transition-colors hover:border-accent">
            <span>
              <span className="block text-tiny font-semibold text-ink">Traveller</span>
              <span className="block truncate text-[0.6875rem] text-muted">aarav@me.com</span>
            </span>
            <ArrowRight size={14} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent-deep" aria-hidden />
          </button>
          <button type="button" onClick={() => fillDemo('admin')} className="group flex items-center justify-between gap-2 rounded-sm border border-line bg-surface px-3 py-2.5 text-left transition-colors hover:border-accent">
            <span>
              <span className="block text-tiny font-semibold text-ink">Admin</span>
              <span className="block truncate text-[0.6875rem] text-muted">admin@luxora.travel</span>
            </span>
            <ArrowRight size={14} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent-deep" aria-hidden />
          </button>
        </div>
        <p className="mt-2.5 text-[0.6875rem] text-muted">Both use a password from <code className="rounded bg-sunk px-1 py-0.5">.env</code> — click one to fill the form.</p>
      </div>
    </AuthLayout>
  );
}
