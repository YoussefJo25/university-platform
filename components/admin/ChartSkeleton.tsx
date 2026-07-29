export default function ChartSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-subtle bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="h-4 w-40 rounded bg-panel" />
        <div className="h-8 w-40 rounded-full bg-panel" />
      </div>
      <div className="mt-6 h-64 w-full rounded-xl bg-panel" />
    </div>
  );
}
