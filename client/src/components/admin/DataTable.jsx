import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn } from '../../utils/cn';
import { RowsSkeleton } from '../ui';

/**
 * Small table engine: column sorting, a client-side quick filter, sticky header and
 * server- or client-side pagination. Enough for five admin screens; a data-grid library
 * would be 10× the payload for the same job.
 */
export default function DataTable({
  columns = [],
  rows = [],
  loading = false,
  page = 1,
  pages = 1,
  onPage,
  searchable = true,
  searchKeys = [],
  emptyLabel = 'Nothing to show yet',
  rowKey = (r) => r._id || r.id,
  onRowClick,
  dense = false,
  className,
}) {
  const [term, setTerm] = useState('');
  const [sort, setSort] = useState(null);

  const filtered = useMemo(() => {
    if (!term.trim() || !searchKeys.length) return rows;
    const q = term.trim().toLowerCase();
    return rows.filter((r) => searchKeys.some((k) => String(k.split('.').reduce((a, p) => (a ? a[p] : ''), r) ?? '').toLowerCase().includes(q)));
  }, [rows, term, searchKeys]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = sort.key.split('.').reduce((x, p) => (x ? x[p] : ''), a);
      const bv = sort.key.split('.').reduce((x, p) => (x ? x[p] : ''), b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
    });
  }, [filtered, sort]);

  const data = pages > 1 ? sorted : sorted;

  return (
    <div className={cn('card overflow-hidden', className)}>
      {searchable && rows.length > 4 ? (
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Search size={14} className="shrink-0 text-muted" aria-hidden />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Filter this table…"
            aria-label="Filter table rows"
            className="w-full bg-transparent text-small outline-none placeholder:text-muted-light"
          />
          <span className="num shrink-0 text-[0.6875rem] font-semibold text-muted">
            {data.length}
            {term ? ` / ${rows.length}` : ''}
          </span>
        </div>
      ) : null}

      <div className="thin-scroll max-h-[62vh] overflow-auto">
        <table className="table-lux">
          <thead>
            <tr>
              {columns.map((col) => {
                const active = sort?.key === col.sortKey;
                return (
                  <th key={col.key} scope="col" className={cn(col.align === 'right' && 'text-right', col.width)}>
                    {col.sortKey ? (
                      <button
                        type="button"
                        onClick={() => setSort((s) => (s?.key === col.sortKey ? { key: col.sortKey, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: col.sortKey, dir: 'desc' }))}
                        className={cn('inline-flex items-center gap-1 uppercase tracking-luxe transition-colors hover:text-ink', active && 'text-accent-deep')}
                      >
                        {col.label}
                        {active ? (sort.dir === 'asc' ? <ArrowUp size={10} aria-hidden /> : <ArrowDown size={10} aria-hidden />) : null}
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="!p-0">
                  <div className="p-4">
                    <RowsSkeleton count={5} className="border-0" />
                  </div>
                </td>
              </tr>
            ) : !data.length ? (
              <tr>
                <td colSpan={columns.length} className="py-14 text-center">
                  <p className="text-small font-semibold text-ink">{term ? `No rows match “${term}”` : emptyLabel}</p>
                  {term ? (
                    <button type="button" onClick={() => setTerm('')} className="btn-link mt-2">
                      Clear the filter
                    </button>
                  ) : null}
                </td>
              </tr>
            ) : (
              <AnimatePresence initial={false}>
                {data.map((row, i) => (
                  <motion.tr
                    key={rowKey(row)}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(onRowClick && 'cursor-pointer', dense && '[&>td]:py-2')}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={cn(col.align === 'right' && 'text-right', col.mono && 'num', col.strong && 'font-semibold text-ink')}>
                        {col.render ? col.render(row, i) : col.value ? col.value(row) : String(row[col.key] ?? '—')}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && onPage ? (
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5">
          <p className="text-[0.6875rem] uppercase tracking-luxe text-muted">
            Page {page} of {pages}
          </p>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page" className="grid h-8 w-8 place-items-center rounded-full border border-line transition-colors hover:bg-sunk disabled:opacity-35">
              <ChevronLeft size={14} aria-hidden />
            </button>
            <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Next page" className="grid h-8 w-8 place-items-center rounded-full border border-line transition-colors hover:bg-sunk disabled:opacity-35">
              <ChevronRight size={14} aria-hidden />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
