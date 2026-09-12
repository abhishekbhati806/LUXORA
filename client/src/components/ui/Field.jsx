import { forwardRef, useId, useState } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

/** Labelled input with an error/hint slot. Error text is announced via aria-describedby. */
export const Field = forwardRef(function Field(
  { label, hint, error, as = 'input', className, id: idProp, children, icon: Icon, required, suffix, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp || autoId;
  const Comp = as;
  const describedBy = [error ? `${id}-error` : null, hint && !error ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('w-full', className)}>
      {label ? (
        <label htmlFor={id} className="field-label">
          {label}
          {required ? <span className="ml-1 text-accent-deep" aria-hidden>·</span> : null}
        </label>
      ) : null}
      <div className="relative">
        {Icon ? (
          <Icon size={16} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        ) : null}
        <Comp
          ref={ref}
          id={id}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          className={cn('field', Icon && 'pl-10', suffix && 'pr-14', error && 'field-invalid')}
          {...rest}
        >
          {as === 'select' || as === 'textarea' ? children : undefined}
        </Comp>
        {suffix ? (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-tiny font-medium text-muted">
            {suffix}
          </span>
        ) : null}
      </div>
      {error ? (
        <p id={`${id}-error`} className="field-error">
          <AlertCircle size={13} className="mt-px shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

/** Password input with a visibility toggle that does not steal focus from the field. */
export function PasswordField({ label = 'Password', ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Field
        {...props}
        label={label}
        type={show ? 'text' : 'password'}
        autoComplete={props.autoComplete || 'current-password'}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
        className="absolute right-2 top-[1.85rem] z-10 grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-sunk hover:text-ink"
      >
        {show ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
      </button>
    </div>
  );
}

export function FormRow({ children, className }) {
  return <div className={cn('grid gap-4', className)}>{children}</div>;
}

export default Field;
