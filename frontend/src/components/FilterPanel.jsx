import { useEffect, useState } from "react";

const tags = [
  "React",
  "Node.js",
  "Python",
  "Machine Learning",
  "MongoDB",
  "Express",
  "TypeScript",
  "DevOps",
  "Next.js",
  "Data Science",
];

export default function FilterPanel({ onFilterChange }) {
  const [filters, setFilters] = useState({
    sources: { local: true, adzuna: true },
    verifiedOnly: false,
    tags: [],
  });

  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const toggleTag = (tag) => {
    setFilters((current) => ({
      ...current,
      tags: current.tags.includes(tag)
        ? current.tags.filter((item) => item !== tag)
        : [...current.tags, tag],
    }));
  };

  return (
    <aside className="section-shell p-4">
      <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">Filters</h3>
      <div className="mt-4 space-y-3 text-sm">
        <label className="flex items-center gap-2 text-soft">
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
        <label className="flex items-center gap-2 text-soft">
          <input
            type="checkbox"
            checked={filters.sources.adzuna}
            onChange={() =>
              setFilters((current) => ({
                ...current,
                sources: { ...current.sources, adzuna: !current.sources.adzuna },
              }))
            }
          />
          Adzuna (Remote/Global)
        </label>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm text-soft">Verified Only</p>
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

      <div className="mt-5">
        <p className="text-sm text-soft">Tags</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`rounded-full border px-2.5 py-1 text-xs ${filters.tags.includes(tag)
                  ? "chip-active"
                  : "chip-neutral"
                }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
