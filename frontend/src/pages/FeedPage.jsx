import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "../components/Navbar";
import SearchBar from "../components/SearchBar";
import InternshipCard from "../components/InternshipCard";
import LoadingSkeleton from "../components/LoadingSkeleton";
import useJobs from "../hooks/useJobs";
import axiosInstance from "../api/axiosInstance";
import { useAuthContext } from "../context/AuthContext";

const JOB_CATEGORIES = [
  "All",
  "Software Engineer",
  "Frontend",
  "Backend",
];

export default function FeedPage() {
  const [location, setLocation] = useState("");
  const [role, setRole] = useState("");
  const [radius, setRadius] = useState("");
  const [page, setPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState("All");
  const pageSize = 30;

  const [filters, setFilters] = useState({
    sources: { local: true, apify: true },
    verifiedOnly: false,
    tags: [],
  });

  const { isAuthenticated, mongoUser } = useAuthContext();

  const { backendCategory, backendRole } = useMemo(() => {
    let cat = "";
    let r = role;
    
    const categoryMapping = {
      "Software Engineer": "SDE",
      "Frontend": "Frontend",
      "Backend": "Backend",
    };

    if (categoryMapping[activeCategory]) {
      cat = categoryMapping[activeCategory];
    } else if (activeCategory !== "All") {
      if (!role) {
        r = activeCategory;
      }
    }
    return { backendCategory: cat, backendRole: r };
  }, [activeCategory, role]);

  const { jobs, loading, error, totalJobs, syncing, syncMessage } = useJobs({
    location,
    role: backendRole,
    category: backendCategory,
    radius,
    page,
    limit: pageSize,
    userSkills: mongoUser?.skills || []
  });
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
      const sourceOk = (job.source === "local" && filters.sources.local) || (job.source === "apify" && filters.sources.apify);
      if (!sourceOk) return false;
      if (filters.verifiedOnly && !job.isVerified) return false;

      const haystack = `${job.title} ${(job.tags || []).join(" ")} ${job.description || ""}`.toLowerCase();

      if (!filters.tags.length) return true;
      return filters.tags.some((tag) => haystack.includes(tag.toLowerCase()));
    });
  }, [jobs, filters]);

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
      <Navbar />

      <div className="relative mx-auto max-w-[1600px] px-6 py-8 lg:px-10 lg:py-12 space-y-8">
        
        <SearchBar
          onSearch={(nextLocation, nextRole, nextRadius) => {
            setLocation(nextLocation); setRole(nextRole); setRadius(nextRadius); setPage(1);
          }}
        />

        {/* UNCLUTTERED HEADER */}
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between pt-4">
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
                onClick={() => {
                  setActiveCategory(category);
                  setPage(1);
                }}
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
        {/* MAIN LAYOUT */}
        <div className="w-full">
          {/* GRID SECTION */}
          <section className="space-y-6">
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </motion.div>
            )}

            {syncing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-3xl border border-blue-200 bg-blue-50/50 p-5 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300 backdrop-blur-md flex items-center gap-3">
                <span className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full shrink-0" />
                <div>
                  <h4 className="font-bold">Searching LinkedIn Live...</h4>
                  <p className="mt-1 text-xs opacity-90">{syncMessage}</p>
                </div>
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
                <div className="mb-4 rounded-full bg-slate-100 p-4 dark:bg-white/5 text-slate-400 dark:text-slate-500">
                  <svg className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
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