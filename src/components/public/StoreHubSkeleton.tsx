// Instant feedback while a store page loads (route loading.tsx). Same shape as
// StoreHubView's hero + code card so the page doesn't jump when it arrives.
export function StoreHubSkeleton() {
  return (
    <main className="bg-bg" aria-busy="true" aria-label="جاري تحميل صفحة المتجر">
      <section className="bg-primary text-white">
        <div className="max-w-container mx-auto px-5 pb-20 pt-6 md:pb-24 md:pt-8">
          <div className="h-4 w-48 animate-pulse rounded-sm bg-white/15" />
          <div className="mt-6 flex items-center gap-4">
            <div className="h-20 w-20 shrink-0 animate-pulse rounded-lg bg-white/20 md:h-24 md:w-24" />
            <div className="h-8 w-56 animate-pulse rounded-md bg-white/20 md:h-10 md:w-80" />
          </div>
          <div className="mt-6 space-y-2">
            <div className="h-4 w-full max-w-xl animate-pulse rounded-sm bg-white/15" />
            <div className="h-4 w-4/5 max-w-lg animate-pulse rounded-sm bg-white/15" />
          </div>
        </div>
      </section>
      <div className="max-w-container mx-auto -mt-12 px-5 pb-16">
        <div className="card max-w-[720px] p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="h-6 w-52 animate-pulse rounded-md bg-surface-alt" />
            <div className="h-6 w-20 animate-pulse rounded-full bg-surface-alt" />
          </div>
          <div className="mt-5 h-16 w-full animate-pulse rounded-md bg-surface-alt" />
        </div>
      </div>
    </main>
  );
}
