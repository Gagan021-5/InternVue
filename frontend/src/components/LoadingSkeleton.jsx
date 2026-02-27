export default function LoadingSkeleton() {
  return (
    <div className="section-shell animate-pulse p-5">
      <div className="mb-4 flex items-start justify-between">
        <div className="h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-6 w-24 rounded-full bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="mb-2 h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="mb-3 h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="mb-3 h-16 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="mb-3 h-10 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-9 w-28 rounded bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}
