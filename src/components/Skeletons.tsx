import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Generic list-row skeleton used by list pages (expenses, income, tasks, etc.) */
export function ListSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('rounded-[24px] bg-card border border-border/60 card-shadow overflow-hidden divide-y divide-border/60', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <Skeleton className="w-10 h-10 rounded-2xl shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-3.5 w-1/2 rounded-full" />
            <Skeleton className="h-2.5 w-1/4 rounded-full" />
          </div>
          <Skeleton className="h-3.5 w-16 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Page-level skeleton: title + list, used while first data load is in flight */
export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4 px-4 md:px-0 pt-2 animate-fade-in min-w-0">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24 rounded-full" />
        <Skeleton className="h-7 w-40 rounded-full" />
      </div>
      <Skeleton className="h-12 w-full rounded-2xl" />
      <ListSkeleton rows={rows} />
    </div>
  );
}

/** Dashboard skeleton mirroring hero card + shortcut grid + rows */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5 pb-2 animate-fade-in min-w-0">
      <div className="px-4 md:px-0 pt-2 flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-2xl shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-2.5 w-24 rounded-full" />
          <Skeleton className="h-5 w-36 rounded-full" />
        </div>
      </div>

      <div className="mx-4 md:mx-0">
        <Skeleton className="rounded-[32px] h-[268px] w-full" />
      </div>

      <div className="px-4 md:px-0">
        <Skeleton className="h-2.5 w-20 rounded-full mb-2.5 ml-1" />
        <div className="rounded-[28px] bg-card border border-border/60 card-shadow p-3">
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 py-3">
                <Skeleton className="w-11 h-11 rounded-2xl" />
                <Skeleton className="h-2.5 w-10 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-0">
        <Skeleton className="h-2.5 w-16 rounded-full mb-2.5 ml-1" />
        <ListSkeleton rows={3} />
      </div>
    </div>
  );
}
