import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Building2, MapPin, Search, X } from 'lucide-react';
import Overlay from '../ui/Overlay';
import { hotelsService } from '../../services';
import { useDebounced } from '../../hooks';
import { DESTINATIONS } from '../../data/constants';
import { cn } from '../../utils/cn';
import { money } from '../../utils/format';

/**
 * Command-style search (⌘/Ctrl-K or "/"): type a city or hotel, jump straight to a
 * filtered discovery page. Suggestions come from the same /hotels/suggest endpoint the
 * hero panel uses, so both surfaces agree.
 */
export default function QuickSearch({ open, onClose, initialFocusRef }) {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [results, setResults] = useState({ destinations: [], hotels: [] });
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const debounced = useDebounced(term, 220);

  useEffect(() => {
    if (!open) {
      setTerm('');
      setResults({ destinations: [], hotels: [] });
      return;
    }
    const t = setTimeout(() => (initialFocusRef?.current || inputRef.current)?.focus(), 90);
    return () => clearTimeout(t);
  }, [open, initialFocusRef]);

  useEffect(() => {
    if (!open || debounced.trim().length < 2) {
      setResults({ destinations: [], hotels: [] });
      return undefined;
    }
    let cancelled = false;
    setBusy(true);
    hotelsService
      .suggest(debounced)
      .then((data) => !cancelled && setResults({ destinations: data?.destinations || [], hotels: data?.hotels || [] }))
      .catch(() => !cancelled && setResults({ destinations: [], hotels: [] }))
      .finally(() => !cancelled && setBusy(false));
    return () => {
      cancelled = true;
    };
  }, [debounced, open]);

  const flat = [
    ...results.destinations.map((d) => ({ kind: 'destination', label: d.city, sub: `${d.count} stays · ${d.country}`, to: `/discover?city=${encodeURIComponent(d.city)}` })),
    ...results.hotels.map((h) => ({ kind: 'hotel', label: h.name, sub: `${h.location?.city} · from ${money(h.priceFrom, { compact: true })}`, to: `/stay/${h.slug}` })),
  ];

  useEffect(() => setActive(0), [term]);

  const go = (item) => {
    if (!item) return;
    onClose();
    navigate(item.to);
  };

  return (
    <Overlay open={open} onClose={onClose} side="center" showClose={false} labelledBy="quick-search-label" className="!max-w-xl overflow-hidden">
      <div className="border-b border-line bg-surface p-4">
        <div className="flex items-center gap-3">
          <Search size={19} className="shrink-0 text-muted" aria-hidden />
          <input
            ref={initialFocusRef || inputRef}
            id="quick-search-input"
            role="combobox"
            aria-expanded="true"
            aria-controls="quick-search-results"
            aria-autocomplete="list"
            autoComplete="off"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, flat.length - 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              }
              if (e.key === 'Enter') {
                e.preventDefault();
                if (flat[active]) go(flat[active]);
                else if (term.trim()) go({ to: `/discover?q=${encodeURIComponent(term.trim())}` });
              }
            }}
            placeholder="Search a city, a hotel, or “Bali in December”"
            aria-label="Search destinations and hotels"
            className="w-full bg-transparent text-[1.05rem] text-ink outline-none placeholder:text-muted-light"
          />
          <kbd className="hidden shrink-0 rounded border border-line bg-canvas px-1.5 py-0.5 text-[0.625rem] font-semibold text-muted sm:block">esc</kbd>
          <button type="button" onClick={onClose} aria-label="Close search" className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-sunk hover:text-ink sm:hidden">
            <X size={16} aria-hidden />
          </button>
        </div>
      </div>

      <div id="quick-search-results" role="listbox" aria-label="Suggestions" className="max-h-[58vh] overflow-y-auto p-2 thin-scroll">
        {term.trim().length < 2 ? (
          <div className="p-2">
            <p className="px-2 pb-2 text-micro uppercase tracking-luxe text-muted">Popular this month</p>
            <div className="grid grid-cols-2 gap-1.5">
              {DESTINATIONS.slice(0, 6).map((d) => (
                <button
                  key={d.slug}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => go({ to: `/discover?city=${encodeURIComponent(d.city)}` })}
                  className="group flex items-center gap-2.5 rounded-sm px-2.5 py-2.5 text-left transition-colors hover:bg-sunk"
                >
                  <MapPin size={14} className="text-accent-deep" aria-hidden />
                  <span className="text-small font-semibold text-ink">{d.city}</span>
                  <span className="ml-auto text-tiny text-muted">{d.stays}</span>
                </button>
              ))}
            </div>
          </div>
        ) : flat.length === 0 ? (
          <p className="px-3 py-8 text-center text-small text-muted">
            {busy ? 'Searching…' : `No matches for “${term}”. Try a city, an island or a hotel name.`}
          </p>
        ) : (
          flat.map((item, i) => (
            <motion.button
              key={`${item.kind}-${item.label}`}
              type="button"
              role="option"
              aria-selected={i === active}
              onClick={() => go(item)}
              onMouseEnter={() => setActive(i)}
              className={cn('group flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left transition-colors', i === active ? 'bg-accent-faint' : 'hover:bg-sunk')}
            >
              {item.kind === 'destination' ? <MapPin size={15} className="text-accent-deep" aria-hidden /> : <Building2 size={15} className="text-muted" aria-hidden />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-small font-semibold text-ink">{item.label}</span>
                <span className="block truncate text-tiny text-muted">{item.sub}</span>
              </span>
              <ArrowRight size={15} className={cn('shrink-0 text-muted transition-transform duration-200', i === active && 'translate-x-0.5 text-accent-deep')} aria-hidden />
            </motion.button>
          ))
        )}
      </div>
      <AnimatePresence />
    </Overlay>
  );
}
