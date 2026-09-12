import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useDismiss, useLockBody } from '../../hooks';

/**
 * The single disclosure primitive behind Modal, Drawer and Lightbox: portal, scroll lock,
 * Escape to close, focus trap, and a click-away that only fires on the backdrop itself.
 */
export default function Overlay({
  open,
  onClose,
  children,
  side = 'center',
  labelledBy,
  describedBy,
  className,
  backdropClassName,
  panelClassName,
  closeLabel = 'Close',
  showClose = true,
  initialFocusRef,
}) {
  const panelRef = useDismiss({ active: open, onDismiss: onClose, initialFocusRef });
  useLockBody(open);

  const isDrawer = side !== 'center';
  const hidden = {
    center: { opacity: 0, scale: 0.96, y: 14 },
    right: { x: '100%' },
    left: { x: '-100%' },
    bottom: { y: '100%' },
  }[side];
  const shown = isDrawer ? { x: 0, y: 0, opacity: 1 } : { opacity: 1, scale: 1, y: 0 };

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[80]" role="presentation">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            onClick={onClose}
            className={cn('absolute inset-0 bg-ink/45 backdrop-blur-[3px]', backdropClassName)}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            aria-describedby={describedBy}
            initial={hidden}
            animate={shown}
            exit={hidden}
            transition={{ type: 'spring', stiffness: 320, damping: 34, mass: 0.9 }}
            className={cn(
              'absolute flex flex-col bg-canvas shadow-overlay',
              side === 'center' && 'inset-x-4 top-1/2 mx-auto max-h-[88vh] w-auto max-w-lg -translate-y-1/2 rounded-lg',
              side === 'right' && 'inset-y-0 right-0 h-full w-full max-w-md',
              side === 'left' && 'inset-y-0 left-0 h-full w-full max-w-md',
              side === 'bottom' && 'inset-x-0 bottom-0 max-h-[86vh] rounded-t-xl',
              className,
            )}
          >
            {showClose ? (
              <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className={cn(
                  'absolute z-10 grid h-10 w-10 place-items-center rounded-full bg-surface/90 text-ink-2 shadow-rest backdrop-blur transition-colors hover:bg-sunk hover:text-ink',
                  side === 'center' ? 'right-3 top-3' : 'right-4 top-4',
                )}
              >
                <X size={17} aria-hidden />
              </button>
            ) : null}
            <div className={cn('thin-scroll flex-1 overflow-auto', panelClassName)}>{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
