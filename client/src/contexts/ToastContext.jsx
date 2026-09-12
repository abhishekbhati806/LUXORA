import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Info, TriangleAlert, X, Heart, CalendarCheck } from 'lucide-react';
import { cn } from '../utils/cn';

/**
 * Toasts: the confirmation for favourites, bookings and auth.
 * Policy — one action per toast, ≤5s, polite live region, never covers a form field.
 */
const ToastContext = createContext(null);

const VARIANTS = {
  success: { Icon: Check, ring: 'border-success/35', tone: 'bg-success text-white' },
  info: { Icon: Info, ring: 'border-line', tone: 'bg-ink text-canvas' },
  error: { Icon: TriangleAlert, ring: 'border-danger/40', tone: 'bg-danger text-white' },
  heart: { Icon: Heart, ring: 'border-accent/40', tone: 'bg-accent-deep text-white' },
  booking: { Icon: CalendarCheck, ring: 'border-success/35', tone: 'bg-success text-white' },
};

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const timers = useRef(new Map());
  const seq = useRef(0);

  const dismiss = useCallback((id) => {
    setItems((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (toast) => {
      const id = (seq.current += 1);
      const entry = {
        id,
        variant: 'info',
        duration: 4200,
        ...toast,
      };
      setItems((list) => [...list.slice(-2), entry]);
      if (entry.duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), entry.duration),
        );
      }
      return id;
    },
    [dismiss],
  );

  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);

  const api = useMemo(
    () => ({
      push,
      dismiss,
      success: (title, description) => push({ variant: 'success', title, description }),
      error: (title, description) => push({ variant: 'error', title, description, duration: 6500 }),
      info: (title, description) => push({ variant: 'info', title, description }),
      saved: (hotel, removed) =>
        push({
          variant: 'heart',
          title: removed ? 'Removed from your wishlist' : 'Saved to your wishlist',
          description: hotel,
        }),
      booked: (code, when) =>
        push({
          variant: 'booking',
          title: 'Your stay is confirmed',
          description: `${code}${when ? ` · ${when}` : ''}`,
          duration: 6000,
        }),
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2.5 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end sm:px-0"
        role="region"
        aria-label="Notifications"
      >
        <div aria-live="polite" aria-atomic="false" className="sr-only">
          {items.map((t) => (
            <p key={t.id}>{`${t.title}. ${t.description || ''}`}</p>
          ))}
        </div>
        <AnimatePresence initial={false}>
          {items.map((t) => {
            const { Icon, ring, tone } = VARIANTS[t.variant] || VARIANTS.info;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.18 } }}
                transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.7 }}
                className={cn(
                  'relative pointer-events-auto flex w-full max-w-[26rem] items-start gap-3 rounded-md border bg-surface/95 p-3.5 pr-11 shadow-lift backdrop-blur',
                  ring,
                )}
              >
                <span className={cn('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full', tone)}>
                  <Icon size={15} strokeWidth={2.4} aria-hidden fill={t.variant === 'heart' ? 'currentColor' : 'none'} />
                </span>
                <span className="min-w-0">
                  <span className="block text-small font-semibold leading-tight text-ink">{t.title}</span>
                  {t.description ? <span className="mt-0.5 block truncate text-tiny text-muted">{t.description}</span> : null}
                  {t.action ? (
                    <button type="button" onClick={t.action.onClick} className="btn-link mt-1.5 p-0">
                      {t.action.label}
                    </button>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                  className="absolute right-2 top-2 rounded-full p-1.5 text-muted transition-colors hover:bg-sunk hover:text-ink"
                >
                  <X size={14} aria-hidden />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
