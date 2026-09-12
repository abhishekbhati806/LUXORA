import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Compass, Heart, LayoutDashboard, PlaneTakeoff, Shield, SlidersHorizontal, User } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';
import { initials } from '../utils/format';

const LINKS = [
  { to: '/account', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/account/trips', label: 'Trips', icon: PlaneTakeoff },
  { to: '/account/wishlist', label: 'Wishlist', icon: Heart },
  { to: '/account/profile', label: 'Profile', icon: User },
  { to: '/account/settings', label: 'Settings', icon: SlidersHorizontal },
];

export default function AccountLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo({ top: 0, behavior: 'auto' }), [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <Navbar />
      <div className="shell flex-1 pt-[calc(var(--nav-h)+2rem)] pb-section">
        <header className="flex flex-wrap items-end justify-between gap-5 border-b border-line pb-6">
          <div className="flex items-center gap-4">
            <motion.span
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="grid h-14 w-14 place-items-center rounded-full bg-ink font-display text-[1.05rem] uppercase text-accent-soft"
            >
              {initials(user?.name)}
            </motion.span>
            <div>
              <p className="text-micro uppercase tracking-luxe text-muted">Your account</p>
              <h1 className="mt-1 font-display text-[1.75rem] font-light leading-none text-ink">{user?.name}</h1>
              <p className="mt-1.5 text-tiny text-muted">{user?.email}</p>
            </div>
          </div>
          {user?.role === 'admin' ? (
            <NavLink to="/admin" className="btn btn-ghost btn-sm">
              <Shield size={13} aria-hidden /> Admin console
            </NavLink>
          ) : null}
        </header>

        <div className="mt-7 grid gap-8 lg:grid-cols-[13.5rem_1fr] lg:gap-10">
          <nav aria-label="Account sections" className="lg:sticky lg:top-[calc(var(--nav-h)+1.25rem)] lg:self-start">
            <ul className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:gap-0.5 lg:px-0">
              {LINKS.map((l) => (
                <li key={l.to} className="shrink-0 lg:shrink">
                  <NavLink
                    to={l.to}
                    end={l.end}
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2.5 whitespace-nowrap rounded-sm px-3.5 py-2.5 text-small font-semibold transition-colors duration-200',
                        isActive ? 'bg-ink text-canvas' : 'text-ink-2 hover:bg-sunk',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <l.icon size={15} className={isActive ? 'text-accent-soft' : 'text-muted'} aria-hidden />
                        {l.label}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>

            <div className="mt-6 hidden rounded-md border border-line bg-surface p-4 lg:block">
              <p className="flex items-center gap-2 text-micro uppercase tracking-luxe text-accent-deep">
                <Compass size={12} aria-hidden /> Need a hand?
              </p>
              <p className="mt-2 text-[0.6875rem] leading-relaxed text-muted">
                Our desk answers in minutes across seven time zones — changes, requests, or a second opinion on a stay.
              </p>
              <a href="mailto:reservations@luxora.travel" className="btn-link mt-3 inline-flex">
                Write to the desk →
              </a>
            </div>
          </nav>

          <main id="main" className="min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
}
