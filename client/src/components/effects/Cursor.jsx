import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { useHasFinePointer } from '../../hooks';

/**
 * Two-part cursor (fast dot, lagging ring) on fine-pointer devices only.
 * Grows over interactive targets via hit-testing on move — cheaper and far more robust
 * than wiring enter/leave handlers into every button in the app.
 */
const GROW = 'a,button,[role="button"],input,select,textarea,[data-cursor="grow"]';
const HIDE = 'input[type="text"],input[type="email"],input[type="search"],textarea,input[type="date"],select';

export default function Cursor() {
  const reduced = useReducedMotion();
  const fine = useHasFinePointer();
  const dot = useRef(null);
  const ring = useRef(null);
  const enabled = fine && !reduced;

  useEffect(() => {
    if (!enabled) {
      document.body.classList.remove('has-custom-cursor');
      return undefined;
    }
    document.body.classList.add('has-custom-cursor');
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let rx = x;
    let ry = y;
    let visible = false;
    let frame = 0;

    const onMove = (event) => {
      x = event.clientX;
      y = event.clientY;
      if (!visible) {
        visible = true;
        [dot.current, ring.current].forEach((el) => el && (el.style.opacity = '1'));
      }
      const target = event.target instanceof Element ? event.target.closest(GROW) : null;
      ring.current?.setAttribute('data-active', target ? 'true' : 'false');
      if (dot.current) dot.current.style.opacity = event.target?.closest?.(HIDE) ? '0' : '1';
    };

    const onLeave = () => {
      visible = false;
      [dot.current, ring.current].forEach((el) => el && (el.style.opacity = '0'));
    };

    const tick = () => {
      rx += (x - rx) * 0.16;
      ry += (y - ry) * 0.16;
      if (dot.current) dot.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (ring.current) ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      frame = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(frame);
      document.body.classList.remove('has-custom-cursor');
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <>
      <span ref={dot} className="cursor-dot" style={{ opacity: 0 }} aria-hidden />
      <span ref={ring} className="cursor-ring" style={{ opacity: 0 }} aria-hidden />
    </>
  );
}
