import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertCircle, Check, X } from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import Button from '../components/ui/Button';
import { Field, PasswordField } from '../components/ui/Field';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { setSeo } from '../utils/seo';
import { cn } from '../utils/cn';

const rules = [
  { key: 'len', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { key: 'case', label: 'Upper and lower case', test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { key: 'num', label: 'One number', test: (v) => /\d/.test(v) },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', newsletter: false });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState({});

  useEffect(() => setSeo({ title: 'Create your account', description: 'Create a LUXORA account to save stays, track trips and leave verified reviews.', noindex: true }), []);

  const strength = useMemo(() => rules.filter((r) => r.test(form.password)).length, [form.password]);

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Tell us what to call you.';
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(form.email)) next.email = 'That email address looks incomplete.';
    if (!rules.every((r) => r.test(form.password))) next.password = 'Your password does not meet all three rules yet.';
    if (form.confirm !== form.password) next.confirm = 'Both passwords must match.';
    return next;
  };

  const submit = async (e) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    setTouched({ name: true, email: true, password: true, confirm: true });
    setFormError(null);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const user = await register(form);
      toast.success(`Welcome, ${user.name.split(' ')[0]}`, 'Your account is live — saved stays sync automatically.');
      navigate(location.state?.from || '/account', { replace: true });
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const errFor = (k) => (touched[k] ? errors[k] : undefined);

  return (
    <AuthLayout
      kicker="Two minutes, once"
      title="Create your account"
      footer={
        <>
          Already with us?{' '}
          <Link to="/login" className="font-semibold text-accent-deep underline-offset-4 hover:underline">
            Sign in
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
          label="Full name"
          autoComplete="name"
          required
          value={form.name}
          error={errFor('name')}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          placeholder="Aarav Mehta"
        />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          error={errFor('email')}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          placeholder="you@example.com"
        />

        <div>
          <PasswordField
            label="Password"
            autoComplete="new-password"
            required
            value={form.password}
            error={errFor('password')}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            placeholder="Choose something memorable"
          />
          {form.password ? (
            <ul className="mt-2.5 grid gap-1.5 sm:grid-cols-3">
              {rules.map((r) => {
                const ok = r.test(form.password);
                return (
                  <li key={r.key} className={cn('flex items-center gap-1.5 text-[0.6875rem] font-medium transition-colors', ok ? 'text-success' : 'text-muted')}>
                    <span className={cn('grid h-4 w-4 shrink-0 place-items-center rounded-full', ok ? 'bg-success-soft' : 'bg-sunk')}>
                      {ok ? <Check size={10} strokeWidth={3} aria-hidden /> : <X size={10} aria-hidden />}
                    </span>
                    {r.label}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-2.5 flex gap-1" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span key={i} className={cn('h-1 flex-1 rounded-pill transition-colors duration-300', i < strength ? (strength === 3 ? 'bg-success' : 'bg-accent') : 'bg-sunk')} />
              ))}
            </div>
          )}
        </div>

        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          required
          value={form.confirm}
          error={errFor('confirm')}
          onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
          onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
          placeholder="Type it once more"
        />

        <label className="mt-1 flex cursor-pointer items-start gap-2.5 text-tiny leading-relaxed text-muted">
          <input
            type="checkbox"
            checked={form.newsletter}
            onChange={(e) => setForm((f) => ({ ...f, newsletter: e.target.checked }))}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong accent-[#B08542]"
          />
          Send me the twice-monthly field notes — new properties, honest verdicts, the occasional fare. No offers, no tracking pixels.
        </label>

        <Button type="submit" className="w-full" size="lg" loading={busy} arrow>
          Create account
        </Button>

        <p className="pt-1 text-center text-[0.6875rem] leading-relaxed text-muted">
          By continuing you agree to our booking terms and privacy policy. Passwords are hashed with bcrypt and we never store them in plain text.
        </p>
      </form>
    </AuthLayout>
  );
}
