import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Heart, LayoutDashboard, LogOut, Settings, Shield, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';
import { initials } from '../../utils/format';
import { useAuth } from '../../contexts/AuthContext';

/** Hover-or-click account menu; closes on Escape, outside click and route change. */
export default function ProfileMenu({ user, light = false }) {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const items = [
    { to: '/account', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/account/trips', label: 'My trips', icon: Heart },
    { to: '/account/settings', label: 'Settings', icon: Settings },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin console', icon: Shield }] : []),
  ];

  return (
    <div ref={ref} className="relative ml-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          'flex items-center gap-2 rounded-pill py-1 pl-1 pr-2.5 transition-colors duration-200',
          light ? 'text-white hover:bg-white/15' : 'text-ink hover:bg-sunk',
        )}
      >
        <span
          className={cn(
            'grid h-8 w-8 place-items-center rounded-full text-[0.625rem] font-bold uppercase tracking-wide',
            light ? 'bg-white/20 text-white ring-1 ring-white/30' : 'bg-ink text-accent-soft',
          )}
        >
          {initials(user?.name)}
        </span>
        <span className="hidden max-w-[7.5rem] truncate text-tiny font-semibold sm:block">{user?.name?.split(' ')[0]}</span>
        <ChevronDown size={13} className={cn('transition-transform duration-300', open && 'rotate-180')} aria-hidden />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-[calc(100%+9px)] w-60 origin-top-right overflow-hidden rounded-md border border-line bg-surface shadow-overlay"
          >
            <div className="border-b border-line bg-sunk/50 px-4 py-3">
              <p className="truncate text-small font-semibold text-ink">{user?.name}</p>
              <p className="truncate text-tiny text-muted">{user?.email}</p>
            </div>
            <ul className="p-1.5">
              {items.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <Link
                    to={to}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-small font-medium text-ink-2 transition-colors hover:bg-sunk hover:text-ink"
                  >
                    <Icon size={15} aria-hidden strokeWidth={1.8} />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="border-t border-line p-1.5">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-small font-medium text-danger transition-colors hover:bg-danger-soft"
              >
                <LogOut size={15} aria-hidden strokeWidth={1.8} /> Sign out
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
