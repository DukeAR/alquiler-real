export const SkeletonCard = () => {
  return (
    <div className="overflow-hidden rounded-[var(--app-radius-card)] border border-slate-200/70 bg-white shadow-[0_20px_45px_-32px_rgba(15,23,42,0.16)]">
      <div className="aspect-[5/4] skeleton lg:aspect-[4/3]" />
      <div className="space-y-4 p-4 sm:p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-5 w-4/5 skeleton rounded-lg" />
            <div className="h-4 w-2/3 skeleton rounded-lg" />
            <div className="h-3 w-1/2 skeleton rounded-full" />
          </div>
          <div className="h-11 w-20 skeleton rounded-full" />
        </div>

        <div className="flex flex-wrap gap-2.5">
          <div className="h-7 w-28 skeleton rounded-full" />
          <div className="h-7 w-36 skeleton rounded-full" />
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="h-3 w-16 skeleton rounded-full" />
            <div className="h-7 w-28 skeleton rounded-lg" />
          </div>
          <div className="h-10 w-28 skeleton rounded-full" />
        </div>
      </div>
    </div>
  );
};
