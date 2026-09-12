import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { CalendarCheck, LayoutDashboard, LogOut, Star, Building2, Users, Hotel } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';
import { initials } from '../utils/format';
import Spinner from '../components/ui/Spinner';

const LINKS = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/hotels', label: 'Properties', icon: Building2 },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarCheck },
  { to: '/admin/users', label: 'Travellers', icon: Users },
  { to: '/admin/reviews', label: 'Reviews', icon: Star },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 40);
    window.scrollTo({ top: 0, behavior: 'auto' });
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[15.5rem] flex-col border-r border-line bg-night text-canvas lg:flex">
        <div className="flex items-center gap-2.5 border-b border-white/10 px-6 py-[1.4rem]">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-accent-deep text-white">
              <Hotel size={14} aria-hidden />
            </span>
            <span>
              <span className="block font-display text-[0.95rem] uppercase leading-none tracking-[0.2em]">Luxora</span>
              <span className="mt-1 block text-[0.6rem] uppercase tracking-luxe text-canvas/45">Operations</span>
            </span>
          </Link>
        </div>

        <nav aria-label="Admin sections" className="flex-1 space-y-0.5 p-3">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-3 rounded-sm px-3.5 py-2.5 text-small font-semibold transition-colors duration-200',
                  isActive ? 'bg-white/10 text-canvas' : 'text-canvas/55 hover:bg-white/[0.06] hover:text-canvas',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <l.icon size={15} className={isActive ? 'text-accent-soft' : ''} aria-hidden />
                  {l.label}
                  {isActive ? <span className="absolute inset-y-2 left-0 w-[2.5px] rounded-r bg-accent" aria-hidden /> : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-[0.625rem] font-bold uppercase text-accent-soft">{initials(user?.name)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-tiny font-semibold">{user?.name}</p>
              <p className="truncate text-[0.6875rem] text-canvas/50">{user?.role}</p>
            </div>
            <button type="button" onClick={logout} aria-label="Sign out" className="grid h-8 w-8 place-items-center rounded-full text-canvas/60 transition-colors hover:bg-white/10 hover:text-canvas">
              <LogOut size={14} aria-hidden />
            </button>
          </div>
        </div>
      </aside>

      {/* mobile admin nav */}
      <div className="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur lg:hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="shell flex items-center justify-between py-3">
          <span className="font-display text-[0.95rem] uppercase tracking-[0.2em]">Luxora · Ops</span>
          <Link to="/" className="btn-link">
            Site
          </Link>
        </div>
        <nav aria-label="Admin sections" className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pb-2.5">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn('shrink-0 rounded-pill border px-3.5 py-1.5 text-tiny font-semibold transition-colors', isActive ? 'border-ink bg-ink text-canvas' : 'border-line bg-surface text-ink-2')
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="lg:pl-[15.5rem]">
        <main id="main" className={cn('mx-auto w-full max-w-[92rem] px-4 py-6 transition-opacity duration-500 sm:px-6 lg:px-8 lg:py-8', ready ? 'opacity-100' : 'opacity-0')}>
          {!ready ? <div className="grid h-64 place-items-center"><Spinner tone="#B08542" /></div> : null}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
