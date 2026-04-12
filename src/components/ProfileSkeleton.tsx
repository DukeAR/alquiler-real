export const ProfileSkeleton = () => {
  return (
    <div className="pb-24 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
        <div className="app-page flex items-center gap-4 py-4">
          <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 skeleton" />
          <div className="space-y-2">
            <div className="h-3 w-20 rounded skeleton bg-slate-200 dark:bg-slate-800" />
            <div className="h-5 w-40 rounded-lg skeleton bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </header>

      <main className="app-page py-8 md:py-10">
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
          <aside className="space-y-6">
            <div className="bg-[var(--color-surface)] rounded-[var(--radius-card)] p-6 border border-[var(--color-border)] shadow-md space-y-5">
              <div className="flex flex-col items-center space-y-4">
                <div className="h-28 w-28 rounded-full bg-[var(--color-border)] skeleton" />
                <div className="space-y-2 w-full max-w-[220px]">
                  <div className="h-6 w-36 mx-auto rounded-lg skeleton bg-[var(--color-border)]" />
                  <div className="h-4 w-28 mx-auto rounded skeleton bg-[var(--color-border)]" />
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-24 rounded-full skeleton bg-[var(--color-border)]" />
                  <div className="h-8 w-24 rounded-full skeleton bg-[var(--color-border)]" />
                </div>
              </div>

              {[1, 2].map((i) => (
                <div key={i} className="rounded-2xl bg-[var(--color-surface-alt)] p-4 space-y-2 shadow-xs">
                  <div className="h-3 w-20 rounded skeleton bg-[var(--color-border)]" />
                  <div className="h-4 w-40 rounded skeleton bg-[var(--color-border)]" />
                </div>
              ))}
            </div>

            <div className="bg-[var(--color-surface)] rounded-[var(--radius-card)] p-6 border border-[var(--color-border)] shadow-md space-y-4">
              <div className="h-5 w-36 rounded-lg skeleton bg-[var(--color-border)]" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-18 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 skeleton" />
              ))}
            </div>
          </aside>

          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="h-5 w-40 rounded-lg skeleton bg-slate-200 dark:bg-slate-800" />
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="h-24 rounded-2xl skeleton bg-slate-200 dark:bg-slate-800" />
                    ))}
                  </div>
                  <div className="space-y-3">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="h-12 rounded-2xl skeleton bg-slate-200 dark:bg-slate-800" />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {[1, 2].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="h-5 w-48 rounded-lg skeleton bg-slate-200 dark:bg-slate-800" />
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="h-32 rounded-2xl skeleton bg-slate-200 dark:bg-slate-800" />
                  <div className="h-32 rounded-2xl skeleton bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="h-24 rounded-2xl skeleton bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
