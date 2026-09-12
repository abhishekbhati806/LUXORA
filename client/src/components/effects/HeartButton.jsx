import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Heart } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useWishlist } from '../../contexts/WishlistContext';

/**
 * Favourite toggle with the house animation: heart fills, a ring bursts once, and the
 * wishlist count in the navbar reacts. Guests get the same interaction (stored locally),
 * so the affordance never lies about being broken.
 */
export default function HeartButton({ hotel, size = 20, className, tone = 'glass', label }) {
  const { has, toggle } = useWishlist();
  const [burst, setBurst] = useState(0);
  const saved = hotel ? has(hotel._id) : false;

  const onClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!hotel) return;
    if (!saved) setBurst((n) => n + 1);
    toggle(hotel);
  };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.88 }}
      aria-pressed={saved}
      aria-label={label || (saved ? `Remove ${hotel?.name || 'this stay'} from your wishlist` : `Save ${hotel?.name || 'this stay'} to your wishlist`)}
      className={cn(
        'group/heart relative grid h-10 w-10 place-items-center rounded-full transition-colors duration-300',
        tone === 'glass' && 'glass text-white hover:bg-white/25',
        tone === 'solid' && 'bg-surface text-ink-2 shadow-rest hover:text-danger',
        tone === 'plain' && 'text-ink-2 hover:bg-sunk',
        saved && tone !== 'plain' && 'text-danger',
        saved && tone === 'plain' && 'text-danger',
        className,
      )}
    >
      <motion.span animate={saved ? { scale: [1, 1.35, 1] } : { scale: 1 }} transition={{ duration: 0.42, ease: [0.34, 1.56, 0.64, 1] }}>
        <Heart size={size} strokeWidth={1.9} fill={saved ? 'currentColor' : 'none'} aria-hidden />
      </motion.span>
      <AnimatePresence>
        {burst ? (
          <motion.span
            key={burst}
            initial={{ opacity: 0.55, scale: 0.7 }}
            animate={{ opacity: 0, scale: 1.85 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => setBurst(0)}
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-danger/70"
            aria-hidden
          />
        ) : null}
      </AnimatePresence>
    </motion.button>
  );
}

/** Standalone "saved" chip for list rows where a button would be too loud. */
export function SaveChip({ hotel }) {
  const { has, toggle } = useWishlist();
  const saved = has(hotel?._id);
  return (
    <button
      type="button"
      onClick={() => toggle(hotel)}
      className={cn('chip', saved && 'chip-active')}
      aria-pressed={saved}
    >
      <Heart size={13} fill={saved ? 'currentColor' : 'none'} aria-hidden />
      {saved ? 'Saved' : 'Save'}
    </button>
  );
}
