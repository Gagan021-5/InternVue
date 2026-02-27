import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion"; // Highly Recommended
import Navbar from "../components/Navbar";
import FilterPanel from "../components/FilterPanel";
import InternshipCard from "../components/InternshipCard";
import LoadingSkeleton from "../components/LoadingSkeleton";
import useJobs from "../hooks/useJobs";
import axiosInstance from "../api/axiosInstance";
import { useAuthContext } from "../context/AuthContext";

const JOB_CATEGORIES = [
  "All",
  "Full-Stack (MERN)",
  "AI/ML (Numpy/Pandas)",
  "Python",
  "Frontend",
  "Backend",
  "Web3",
  "Design"
];

export default function FeedPage() {
  const [location, setLocation] = useState("");
  const [role, setRole] = useState("");
  const [radius, setRadius] = useState("");
  const [page, setPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState("All");
  const pageSize = 20;
  const [filters, setFilters] = useState({
    sources: { local: true, adzuna: true },
    verifiedOnly: false,
    tags: [],
  });

  const { jobs, loading, error, totalJobs } = useJobs({ location, role, radius, page, limit: pageSize });
  const { isAuthenticated } = useAuthContext();
  const [savedIds, setSavedIds] = useState(new Set());

  // PERSISTENT DATA LOADING
  useEffect(() => {
    const loadSaved = async () => {
      if (!isAuthenticated) return;
      try {
        const response = await axiosInstance.get("/api/user/jobs");
        setSavedIds(new Set((response.data.jobs || []).map((entry) => String(entry.jobId))));
      } catch (e) {
        console.warn("Could not load saved jobs:", e.message);
      }
    };
    loadSaved();
  }, [isAuthenticated]);

  const visibleJobs = useMemo(() => {
    return jobs.filter((job) => {
      const sourceOk = (job.source === "local" && filters.sources.local) || (job.source === "adzuna" && filters.sources.adzuna);
      if (!sourceOk) return false;
      if (filters.verifiedOnly && !job.isVerified) return false;

      const haystack = `${job.title} ${(job.tags || []).join(" ")} ${job.description || ""}`.toLowerCase();

      // Category filtering
      if (activeCategory !== "All") {
        // Map category strings to matching terms
        let categoryTerms = [activeCategory.toLowerCase()];
        if (activeCategory === "Full-Stack (MERN)") categoryTerms = ["full-stack", "full stack", "mern", "react", "node", "express", "mongodb"];
        if (activeCategory === "AI/ML (Numpy/Pandas)") categoryTerms = ["ai", "ml", "machine learning", "artificial intelligence", "numpy", "pandas", "data science"];
        if (activeCategory === "Frontend") categoryTerms = ["frontend", "front-end", "react", "vue", "angular", "ui"];
        if (activeCategory === "Backend") categoryTerms = ["backend", "back-end", "node", "express", "django", "spring", "api"];

        const matchesCategory = categoryTerms.some(term => haystack.includes(term));
        if (!matchesCategory) return false;
      }

      if (!filters.tags.length) return true;
      return filters.tags.some((tag) => haystack.includes(tag.toLowerCase()));
    });
  }, [jobs, filters, activeCategory]);

  const hasNextPage = page * pageSize < totalJobs;
  const activeWhereLabel = radius === "remote" ? "Remote" : location || "India";

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-obsidian transition-colors duration-500">
      <Navbar
        onSearch={(nextLocation, nextRole, nextRadius) => {
          setLocation(nextLocation);
          setRole(nextRole);
          setRadius(nextRadius);
          setPage(1);
        }}
      />

      <div className="mx-auto max-w-[1600px] px-6 py-8">
        {/* HEADER SECTION */}
        <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white md:text-4xl">
              Smart Feed <span className="text-blue-600">.</span>
            </h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400 font-medium">
              Vetted opportunities in <span className="text-blue-500">{activeWhereLabel}</span>
            </p>
          </div>
          <div className="rounded-2xl bg-white/50 dark:bg-white/5 px-6 py-3 border border-white/20 dark:border-white/10 backdrop-blur-md shadow-sm">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{visibleJobs.length}</span>
            <span className="ml-2 text-sm text-slate-500 dark:text-slate-400 font-semibold">Matched Roles</span>
          </div>
        </div>

        {/* CATEGORY SELECTOR UI */}
        <div className="mb-10 w-full overflow-x-auto no-scrollbar py-2">
          <div className="flex gap-3 px-1 min-w-max">
            {JOB_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 backdrop-blur-sm border shadow-sm ${activeCategory === cat
                    ? "bg-blue-600 text-white border-blue-500/50 shadow-blue-500/20"
                    : "bg-white/60 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 hover:-translate-y-0.5"
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[300px_1fr]">
          {/* SIDEBAR - PREMIUM GLASS */}
          <aside className="lg:sticky lg:top-28 lg:h-[calc(100vh-120px)] overflow-y-auto no-scrollbar">
            <div className="rounded-[2.5rem] border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 p-6 shadow-xl backdrop-blur-xl">
              <FilterPanel onFilterChange={setFilters} />
            </div>
          </aside>

          {/* JOB LISTING AREA */}
          <section className="space-y-8">
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-500 backdrop-blur-md">
                {error}
              </motion.div>
            )}

            {loading ? (
              <div className="grid gap-6 md:grid-cols-2">
                {Array.from({ length: 8 }).map((_, i) => <LoadingSkeleton key={i} />)}
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                <motion.div layout className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {visibleJobs.map((job) => (
                    <motion.div
                      layout
                      key={job._id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3 }}
                    >
                      <InternshipCard
                        job={job}
                        onSave={isAuthenticated ? (j) => console.log("Save", j) : undefined}
                        isSaved={savedIds.has(String(job._id))}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            )}

            {/* EMPTY STATE */}
            {!loading && visibleJobs.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-[3rem] border border-dashed border-slate-300 dark:border-white/10 py-24 text-center bg-white/40 dark:bg-white/5 backdrop-blur-sm">
                <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-6 text-2xl">
                  🔍
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">No Internships Found</h3>
                <p className="mt-2 text-slate-500 dark:text-slate-400">Try broadening your location, checking "Remote Only", or selecting "All" categories.</p>
              </div>
            )}

            {/* PAGINATION - PREMIUM STYLE */}
            {totalJobs > 0 && Math.ceil(totalJobs / pageSize) > 1 && (
              <div className="flex items-center justify-center gap-4 py-12">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex h-12 items-center justify-center rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-6 font-bold text-slate-800 dark:text-white shadow-lg backdrop-blur-md transition-all hover:scale-105 disabled:opacity-30 disabled:hover:scale-100"
                >
                  ← Prev
                </button>
                <div className="flex h-12 min-w-[3rem] items-center justify-center rounded-2xl bg-blue-600 px-6 font-bold text-white shadow-blue-500/40 shadow-xl">
                  {page}
                </div>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={!hasNextPage}
                  className="flex h-12 items-center justify-center rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-6 font-bold text-slate-800 dark:text-white shadow-lg backdrop-blur-md transition-all hover:scale-105 disabled:opacity-30 disabled:hover:scale-100"
                >
                  Next →
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
