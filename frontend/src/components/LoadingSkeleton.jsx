export default function LoadingSkeleton() {
  return (
    <div className="section-shell animate-pulse p-5">
      <div className="mb-4 flex items-start justify-between">
        <div className="surface-soft h-5 w-2/3 rounded" />
        <div className="surface-soft h-6 w-24 rounded-full" />
      </div>
      <div className="surface-soft mb-2 h-4 w-1/2 rounded" />
      <div className="surface-soft mb-3 h-4 w-2/3 rounded" />
      <div className="surface-soft mb-3 h-16 rounded" />
      <div className="surface-soft mb-3 h-10 rounded" />
      <div className="flex items-center justify-between">
        <div className="surface-soft h-3 w-20 rounded" />
        <div className="surface-soft h-9 w-28 rounded" />
      </div>
    </div>
  );
}
