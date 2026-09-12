import { cn } from '../../utils/cn';

export default function Skeleton({ className, rounded = 'rounded-sm', style }) {
  return <span className={cn('skeleton block', rounded, className)} style={style} aria-hidden />;
}

/** Mirrors HotelCard's exact geometry so nothing jumps when real data lands. */
export function CardSkeleton({ ratio = 4 / 3, rows = 2 }) {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="w-full" rounded="rounded-none" style={{ aspectRatio: String(ratio) }} />
      <div className="space-y-2.5 p-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-3/4" />
        {rows > 1 ? <Skeleton className="h-4 w-1/2" /> : null}
        <div className="flex items-end justify-between pt-2">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-8 w-20 rounded-pill" />
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 6, ratio = 4 / 3, className }) {
  return (
    <div className={cn('grid gap-6 sm:grid-cols-2 lg:grid-cols-3', className)} role="status" aria-label="Loading stays">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} ratio={ratio} rows={i % 3 === 0 ? 3 : 2} />
      ))}
      <span className="sr-only">Loading hotels…</span>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="shell py-10">
      <Skeleton className="mb-5 h-3 w-40" />
      <Skeleton className="mb-3 h-10 w-2/3" />
      <Skeleton className="mb-8 h-4 w-52" />
      <div className="grid gap-2 sm:grid-cols-[2fr_1fr] sm:grid-rows-2">
        <Skeleton className="aspect-[16/10] sm:row-span-2" rounded="rounded-lg" />
        <Skeleton className="aspect-[16/10]" rounded="rounded-lg" />
        <Skeleton className="aspect-[16/10]" rounded="rounded-lg" />
      </div>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4" style={{ width: `${92 - i * 7}%` }} />
          ))}
        </div>
        <Skeleton className="h-80 rounded-lg" />
      </div>
      <span className="sr-only">Loading property details…</span>
    </div>
  );
}

export function RowsSkeleton({ count = 5, className }) {
  return (
    <div className={cn('space-y-2', className)} role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-sm border border-line bg-surface p-4">
          <Skeleton className="h-12 w-12 rounded-sm" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-7 w-16 rounded-pill" />
        </div>
      ))}
    </div>
  );
}
