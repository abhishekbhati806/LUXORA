import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Cursor from '../components/effects/Cursor';
import ScrollProgress from '../components/effects/ScrollProgress';
import PageTransition from '../components/effects/PageTransition';
import Spinner from '../components/ui/Spinner';
import { useReducedMotion } from 'motion/react';

/** Suspense fallback that respects the navbar height so content never hides under it. */
export function RouteFallback({ label = 'Loading' }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4" role="status" aria-live="polite">
      <Spinner size={26} tone="#B08542" />
      <p className="text-micro uppercase tracking-luxe text-muted">{label}</p>
      <span className="sr-only">{label}, please wait</span>
    </div>
  );
}

export default function PublicLayout() {
  const { pathname, hash } = useLocation();
  const reduced = useReducedMotion();

  // Remember where each page was entered from, and honour #anchors after paint.
  useEffect(() => {
    if (hash) {
      const id = hash.slice(1);
      const t = setTimeout(() => {
        const el = document.getElementById(id);
        el?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      }, 120);
      return () => clearTimeout(t);
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
    return undefined;
  }, [pathname, hash, reduced]);

  return (
    <div className="flex min-h-screen flex-col">
      <Cursor />
      <ScrollProgress />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Navbar transparentOverHero={pathname === '/'} />
      <main id="main" className="flex-1">
        <Suspense fallback={<RouteFallback />}>
          {/* Enter-only route transition. An AnimatePresence "wait" exit deadlocks when a
              page navigates with replace:true inside an async submit — the fade-in is what
              users notice; the fade-out was not worth the failure mode. */}
          <PageTransition key={pathname}>
            <Outlet />
          </PageTransition>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
