import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, Heart, LayoutDashboard, LogIn, Search, Settings, Shield, Sparkles, X } from 'lucide-react';
import Overlay from '../ui/Overlay';
import Button from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useWishlist } from '../../contexts/WishlistContext';
import MEDIA from '../../data/media-manifest';
import { BRAND } from '../../data/constants';

/** Animated mobile navigation: destination shortcuts first, then the account block. */
export default function MobileDrawer({ open, onClose, links = [], onOpenSearch }) {
  const { isAuthed, user, logout } = useAuth();
  const { count } = useWishlist();
  const { pathname } = useLocation();

  return (
    <Overlay open={open} onClose={onClose} side="right" labelledBy="mobile-nav-title" showClose={false} className="w-[min(100vw,26.5rem)]">
      <div className="relative flex h-full flex-col bg-canvas">
        <div className="flex items-center justify-between px-5 pb-4 pt-5">
          <span id="mobile-nav-title" className="font-display text-lg uppercase tracking-[0.22em]">
            Luxora
          </span>
          <button type="button" onClick={onClose} aria-label="Close menu" className="grid h-10 w-10 place-items-center rounded-full text-ink-2 transition-colors hover:bg-sunk">
            <X size={19} aria-hidden />
          </button>
        </div>

        <div className="mx-5 mb-5 overflow-hidden rounded-md">
          <img src={MEDIA['hero-alt']?.src} alt="" aria-hidden className="h-28 w-full object-cover" loading="lazy" />
        </div>

        <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-3 pb-4 thin-scroll">
          <AnimatePresence initial={false}>
            {links.map((link, i) => {
              const active = pathname === link.to.split('?')[0];
              return (
                <motion.div
                  key={link.label}
                  initial={{ opacity: 0, x: 26 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.045, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link
                    to={link.to}
                    onClick={onClose}
                    aria-current={active ? 'page' : undefined}
                    className="group flex items-center justify-between gap-4 rounded-md px-3 py-3.5 text-left transition-colors hover:bg-surface"
                  >
                    <span className={`font-display text-[1.6rem] leading-none ${active ? 'text-accent-deep' : 'text-ink'}`}>{link.label}</span>
                    <ArrowUpRight size={17} className="text-muted transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent-deep" aria-hidden />
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>

          <div className="mx-3 my-4 divider" />

          <div className="grid grid-cols-2 gap-2 px-2">
            <button type="button" onClick={onOpenSearch} className="chip justify-center py-2.5">
              <Search size={14} aria-hidden /> Search
            </button>
            <Link to="/wishlist" onClick={onClose} className="chip justify-center py-2.5">
              <Heart size={14} aria-hidden /> Wishlist {count > 0 && `(${count})`}
            </Link>
          </div>
        </nav>

        <div className="border-t border-line bg-surface/70 p-5">
          {isAuthed ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-ink text-[0.7rem] font-bold uppercase text-accent-soft">
                  {(user?.name || '?').slice(0, 2)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-small font-semibold">{user?.name}</p>
                  <p className="truncate text-tiny text-muted">{user?.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link to="/account" onClick={onClose} className="btn btn-ghost btn-sm justify-start">
                  <LayoutDashboard size={14} aria-hidden /> Dashboard
                </Link>
                <Link to="/account/settings" onClick={onClose} className="btn btn-ghost btn-sm justify-start">
                  <Settings size={14} aria-hidden /> Settings
                </Link>
                {user?.role === 'admin' ? (
                  <Link to="/admin" onClick={onClose} className="btn btn-ghost btn-sm justify-start col-span-2">
                    <Shield size={14} aria-hidden /> Admin console
                  </Link>
                ) : null}
              </div>
              <button type="button" onClick={logout} className="btn-link w-full justify-center">
                Sign out
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <Button as={Link} to="/login" onClick={onClose} className="w-full" icon={LogIn}>
                Sign in
              </Button>
              <Button as={Link} to="/register" onClick={onClose} variant="ghost" className="w-full" icon={Sparkles}>
                Create an account
              </Button>
              <p className="pt-1 text-center text-[0.6875rem] text-muted">{BRAND.tagline}</p>
            </div>
          )}
        </div>
      </div>
    </Overlay>
  );
}
