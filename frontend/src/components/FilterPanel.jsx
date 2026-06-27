import { useEffect, useState } from "react";

export default function FilterPanel({ onFilterChange }) {
  const [filters, setFilters] = useState({
    sources: { local: true, apify: true },
    verifiedOnly: false,
    tags: [],
  });

  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  return (
    <aside className="section-shell p-4 bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 rounded-3xl shadow-sm backdrop-blur-xl">
      <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">Filters</h3>
      <div className="mt-4 space-y-3 text-sm">
        <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <input
            type="checkbox"
            checked={filters.sources.local}
            onChange={() =>
              setFilters((current) => ({
                ...current,
                sources: { ...current.sources, local: !current.sources.local },
              }))
            }
          />
          Local Verified
        </label>
        <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <input
            type="checkbox"
            checked={filters.sources.apify}
            onChange={() =>
              setFilters((current) => ({
                ...current,
                sources: { ...current.sources, apify: !current.sources.apify },
              }))
            }
          />
          Apify (Real-time)
        </label>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-400">Verified Only</p>
        <button
          type="button"
          onClick={() =>
            setFilters((current) => ({ ...current, verifiedOnly: !current.verifiedOnly }))
          }
          className={`relative h-6 w-11 rounded-full transition ${filters.verifiedOnly ? "bg-blue-600" : "bg-slate-400"
            }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${filters.verifiedOnly ? "left-[22px]" : "left-0.5"
              }`}
          />
        </button>
      </div>
    </aside>
  );
}
