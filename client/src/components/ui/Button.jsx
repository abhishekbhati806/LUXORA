import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

const VARIANTS = {
  primary: 'btn-primary',
  accent: 'btn-accent',
  ghost: 'btn-ghost',
  glass: 'btn-glass',
  quiet: 'bg-transparent text-ink-2 hover:bg-sunk hover:text-ink',
  link: 'btn-link',
  danger: 'bg-danger text-white hover:brightness-110',
};

const SIZES = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
  icon: 'h-11 w-11 rounded-full px-0',
  'icon-sm': 'h-9 w-9 rounded-full px-0',
};

/**
 * One button component for the whole app.
 * `as` picks the element (button / a / Link), `loading` swaps in a spinner and blocks
 * double submits, and `arrow` animates a glyph on hover — the house CTA style.
 */
const Button = forwardRef(function Button(
  {
    as,
    to,
    href,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    arrow = false,
    arrowLabel,
    icon: Icon,
    className,
    children,
    onClick,
    ...rest
  },
  ref,
) {
  const Comp = as || (to ? Link : href ? 'a' : 'button');
  const isNative = Comp === 'button';
  const classes = cn('btn btn-arrow', VARIANTS[variant], SIZES[size], loading && 'cursor-progress', className);

  const content = (
    <>
      {loading ? (
        <Loader2 size={15} className="animate-spin" aria-hidden />
      ) : Icon ? (
        <Icon size={size === 'sm' || size === 'icon-sm' ? 15 : 17} aria-hidden className="shrink-0" />
      ) : null}
      {children != null && children !== '' ? (
        <span className={cn('relative', arrow && 'transition-transform duration-300 ease-lux')}>{children}</span>
      ) : null}
      {arrow && !loading ? (
        <span className="btn-arrow relative grid h-4 w-4 place-items-center overflow-hidden" aria-hidden>
          <ArrowRight size={15} strokeWidth={2.2} />
        </span>
      ) : null}
      {arrowLabel ? <span className="sr-only">{arrowLabel}</span> : null}
      {loading ? <span className="sr-only">Loading</span> : null}
    </>
  );

  return (
    <Comp
      ref={ref}
      {...(isNative ? { type: 'button', disabled: disabled || loading, 'aria-busy': loading || undefined } : {})}
      {...(!isNative ? { href: href || undefined, to } : {})}
      className={classes}
      onClick={(e) => {
        if (loading || disabled) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      {...rest}
    >
      {content}
    </Comp>
  );
});

export default Button;
