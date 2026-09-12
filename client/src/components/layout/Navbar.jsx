import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Heart, LogIn, Menu, Search, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../contexts/AuthContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useLockBody } from '../../hooks';
import Button from '../ui/Button';
import MobileDrawer from './MobileDrawer';
import ProfileMenu from './ProfileMenu';
import QuickSearch from './QuickSearch';

const LINKS = [
  { label: 'Discover', to: '/discover' },
  { label: 'Destinations', to: '/destinations' },
  { label: 'Stays', to: '/discover?sort=trending' },
  { label: 'Experiences', to: '/experiences' },
  { label: 'About', to: '/about' },
];

/**
 * Transparent over the hero, glass once the page scrolls. The switch is done with a
 * single scroll listener writing a data attribute — no per-frame React re-render storm.
 */
export default function Navbar({ transparentOverHero = false, compact = false }) {
  const { pathname } = useLocation();
  const { isAuthed, user } = useAuth();
  const { count } = useWishlist();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const hideOnScroll = useRef(false);
  const lastY = useRef(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      // only hide the bar while scrolling down through an article-length page
      if (hideOnScroll.current) setHidden(y > 560 && y > lastY.current + 6);
      else setHidden(false);
      lastY.current = y;
    };
    hideOnScroll.current = /^\/(stay|about|experiences|destinations)/.test(pathname);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  useEffect(() => setMenuOpen(false), [pathname]);
  useLockBody(menuOpen);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const glass = scrolled || !transparentOverHero || compact;
  const light = transparentOverHero && !scrolled && !compact;

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,border-color,transform] duration-500 ease-lux',
          glass ? 'border-b bg-canvas/80 backdrop-blur-xl backdrop-saturate-150' : 'border-b border-transparent',
          glass ? 'border-line/80 shadow-[0_1px_0_rgba(21,19,15,.04)]' : '',
          hidden && !menuOpen ? '-translate-y-full' : 'translate-y-0',
        )}
        style={{ height: compact ? 64 : 'var(--nav-h)' }}
      >
        <div className={cn('flex h-full items-center gap-4 px-gutter', compact ? 'mx-auto max-w-shell' : '')}>
          {/* brand */}
          <Link
            to="/"
            aria-label="LUXORA — home"
            className="group flex shrink-0 items-center gap-2.5"
            onClick={(e) => {
              if ((e.metaKey || e.ctrlKey) === false && window.scrollY < 40) {
                e.preventDefault();
                if (!reduced) window.scrollTo({ top: 0, behavior: 'smooth' });
                navigate('/');
              }
            }}
          >
            <motion.span
              whileHover={{ rotate: -8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              className={cn(
                'grid h-8 w-8 place-items-center rounded-[9px] transition-colors duration-500',
                light ? 'bg-white/15 text-accent-soft ring-1 ring-white/30' : 'bg-ink text-accent',
              )}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                <path d="M7 4v15h9" stroke="currentColor" strokeWidth="2.3" strokeLinecap="square" />
                <circle cx="16.6" cy="5.4" r="1.7" fill="currentColor" stroke="none" />
              </svg>
            </motion.span>
            <span
              className={cn(
                'font-display text-[1.22rem] font-semibold uppercase leading-none transition-colors duration-500',
                light ? 'text-white' : 'text-ink',
              )}
              style={{ letterSpacing: '0.24em', fontVariationSettings: "'WONK' 1, 'opsz' 40" }}
            >
              Luxora
            </span>
          </Link>

          <nav aria-label="Primary" className="ml-6 hidden items-center gap-1 lg:flex">
            {LINKS.map((link) => (
              <NavLink
                key={link.label}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'relative rounded-pill px-3.5 py-2 text-tiny font-semibold tracking-wide transition-colors duration-200',
                    light ? 'text-white/85 hover:text-white' : 'text-ink-2 hover:text-ink',
                    isActive && (pathname === link.to || (link.to.includes('?') && isActive)) && 'text-current',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {link.label}
                    {isActive ? (
                      <motion.span
                        layoutId="nav-active"
                        className={cn('absolute inset-x-3 -bottom-0.5 h-px', light ? 'bg-accent-soft' : 'bg-accent')}
                        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                      />
                    ) : null}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
            <IconButton label="Search stays" onClick={() => setSearchOpen(true)} light={light} shortcut>
              <Search size={17} strokeWidth={1.9} />
            </IconButton>
            <Link to={isAuthed ? '/account/wishlist' : '/wishlist'} aria-label={`Wishlist, ${count} saved`} className="relative">
              <span
                className={cn(
                  'grid h-10 w-10 place-items-center rounded-full transition-colors duration-200',
                  light ? 'text-white hover:bg-white/15' : 'text-ink-2 hover:bg-sunk hover:text-ink',
                )}
              >
                <Heart size={17} strokeWidth={1.9} fill={count ? 'currentColor' : 'none'} />
              </span>
              <AnimatePresence>
                {count > 0 ? (
                  <motion.span
                    key={count}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 460, damping: 24 }}
                    className={cn(
                      'absolute -right-0.5 -top-0.5 grid h-[17px] min-w-[17px] place-items-center rounded-pill px-1 text-[0.58rem] font-bold',
                      light ? 'bg-accent-soft text-ink' : 'bg-accent-deep text-white',
                    )}
                  >
                    {count}
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </Link>

            {isAuthed ? (
              <ProfileMenu user={user} light={light} />
            ) : (
              <>
                <Button
                  as={Link}
                  to="/login"
                  size="sm"
                  variant={light ? 'glass' : 'ghost'}
                  className="ml-1 hidden !min-h-[38px] sm:inline-flex"
                  icon={LogIn}
                >
                  Login
                </Button>
                <Button as={Link} to="/register" size="sm" className="hidden !min-h-[38px] lg:inline-flex" variant={light ? 'glass' : 'primary'}>
                  <Sparkles size={13} aria-hidden />
                  Join LUXORA
                </Button>
              </>
            )}

            <IconButton label="Open menu" onClick={() => setMenuOpen(true)} light={light} className="lg:hidden">
              <Menu size={20} strokeWidth={1.8} />
            </IconButton>
          </div>
        </div>
      </header>

      <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} links={LINKS} onOpenSearch={() => { setMenuOpen(false); setSearchOpen(true); }} />
      <QuickSearch open={searchOpen} onClose={() => setSearchOpen(false)} initialFocusRef={searchRef} />
    </>
  );
}

function IconButton({ children, label, onClick, light, className, shortcut }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={shortcut ? `${label} (press /)` : undefined}
      className={cn(
        'grid h-10 w-10 place-items-center rounded-full transition-colors duration-200',
        light ? 'text-white hover:bg-white/15' : 'text-ink-2 hover:bg-sunk hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  );
}
