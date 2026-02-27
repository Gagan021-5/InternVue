import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  "Design",
];

const categoryTermsMap = {
  "Full-Stack (MERN)": ["full-stack", "full stack", "mern", "react", "node", "express", "mongodb"],
  "AI/ML (Numpy/Pandas)": ["ai", "ml", "machine learning", "artificial intelligence", "numpy", "pandas", "data science"],
  Frontend: ["frontend", "front-end", "react", "vue", "angular", "ui"],
  Backend: ["backend", "back-end", "node", "express", "django", "spring", "api"],
};

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

  useEffect(() => {
    const loadSaved = async () => {
      if (!isAuthenticated) return;
      try {
        const response = await axiosInstance.get("/api/user/jobs");
        setSavedIds(new Set((response.data.jobs || []).map((entry) => String(entry.jobId))));
      } catch (requestError) {
        console.warn("Could not load saved jobs:", requestError.message);
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

      if (activeCategory !== "All") {
        const categoryTerms = categoryTermsMap[activeCategory] || [activeCategory.toLowerCase()];
        const matchesCategory = categoryTerms.some((term) => haystack.includes(term));
        if (!matchesCategory) return false;
      }

      if (!filters.tags.length) return true;
      return filters.tags.some((tag) => haystack.includes(tag.toLowerCase()));
    });
  }, [jobs, filters, activeCategory]);

  const hasNextPage = page * pageSize < totalJobs;
  const activeWhereLabel = radius === "remote" ? "Remote" : location || "India";

  const handleSave = async (job) => {
    if (!isAuthenticated) return;
    try {
      await axiosInstance.post("/api/user/jobs/save", { jobId: String(job._id), jobData: job });
      setSavedIds((current) => new Set([...current, String(job._id)]));
    } catch (saveError) {
      if (saveError.response?.status !== 409) console.error("Save job failed:", saveError.message);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 transition-colors duration-500 dark:bg-[#030712]">
      <Navbar
        onSearch={(nextLocation, nextRole, nextRadius) => {
          setLocation(nextLocation); setRole(nextRole); setRadius(nextRadius); setPage(1);
        }}
      />

      {/* Subtle Background Mesh */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-0 dark:opacity-20">
        <div className="absolute -left-[10%] -top-[10%] h-[50%] w-[50%] rounded-full bg-blue-600/20 blur-[150px]" />
      </div>

      <div className="relative mx-auto max-w-[1600px] px-6 py-8 lg:px-10 lg:py-12">
        
        {/* UNCLUTTERED HEADER */}
        <header className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-4xl">
              Discover Internships
            </h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Showing <span className="font-semibold text-slate-900 dark:text-white">{visibleJobs.length}</span> opportunities in <span className="font-semibold text-blue-600 dark:text-blue-400">{activeWhereLabel}</span>
            </p>
          </div>
        </header>

        {/* SLEEK CATEGORY TABS (Replaces the heavy chips) */}
        <div className="no-scrollbar mb-10 w-full overflow-x-auto border-b border-slate-200 dark:border-white/10">
          <div className="flex min-w-max gap-8 px-1 pb-px">
            {JOB_CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`relative pb-4 text-sm font-medium transition-colors ${
                  activeCategory === category
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {category}
                {activeCategory === category && (
                  <motion.div
                    layoutId="activeCategoryIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* MAIN LAYOUT */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[280px_1fr]">
          
          {/* SIDEBAR */}
          <aside className="no-scrollbar overflow-y-auto lg:sticky lg:top-28 lg:h-[calc(100vh-120px)]">
            {/* Removed the extra border/bg wrapper to let the FilterPanel breathe */}
            <div className="pr-4">
              <FilterPanel onFilterChange={setFilters} />
            </div>
          </aside>

          {/* GRID SECTION */}
          <section className="space-y-6">
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </motion.div>
            )}

            {loading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => <LoadingSkeleton key={index} />)}
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                <motion.div layout className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {visibleJobs.map((job) => (
                    <motion.div
                      layout
                      key={job._id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <InternshipCard
                        job={job}
                        onSave={isAuthenticated ? handleSave : undefined}
                        isSaved={savedIds.has(String(job._id))}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            )}

            {/* EMPTY STATE */}
            {!loading && visibleJobs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="mb-4 rounded-full bg-slate-100 p-4 dark:bg-white/5">
                  <span className="text-2xl">🔍</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">No matches found</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Try adjusting your filters or selecting "All" categories.
                </p>
              </div>
            )}

            {/* MINIMAL PAGINATION */}
            {totalJobs > 0 && Math.ceil(totalJobs / pageSize) > 1 && (
              <div className="flex items-center justify-center gap-4 border-t border-slate-200 pt-8 dark:border-white/10">
                <button
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="text-sm font-medium text-slate-600 disabled:opacity-30 dark:text-slate-400"
                >
                  ← Previous
                </button>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  Page {page}
                </span>
                <button
                  onClick={() => setPage((current) => current + 1)}
                  disabled={!hasNextPage}
                  className="text-sm font-medium text-slate-600 disabled:opacity-30 dark:text-slate-400"
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