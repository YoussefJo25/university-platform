export default function StatCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-subtle bg-panel p-5 shadow-sm">
      <div className="h-10 w-10 rounded-xl bg-card" />
      <div className="mt-4 h-3.5 w-24 rounded bg-card" />
      <div className="mt-2 h-7 w-16 rounded bg-card" />
    </div>
  );
}
