import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AiScoreBar from "./AiScoreBar";
import AiInsightPanel from "./AiInsightPanel";

const stopWords = new Set([
  "internship",
  "intern",
  "engineer",
  "developer",
  "fullstack",
  "full-stack",
  "software",
  "remote",
  "junior",
  "entry",
  "level",
]);

const extractTitleTags = (title = "") => {
  const words = title
    .split(/[\s,/()+-]+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2)
    .filter((word) => !stopWords.has(word.toLowerCase()));

  return [...new Set(words)].slice(0, 4);
};

const daysAgo = (date) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Posted recently";
  const diffMs = Date.now() - parsed.getTime();
  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  if (days === 0) return "Posted today";
  if (days === 1) return "Posted 1 day ago";
  return `Posted ${days} days ago`;
};

export default function InternshipCard({ job, onSave, isSaved = false, compact = false, userSkills = [] }) {
  const [showInsights, setShowInsights] = useState(false);
  const navigate = useNavigate();

  const tags = useMemo(() => {
    if (Array.isArray(job.tags) && job.tags.length > 0) return job.tags;
    if (job.source !== "local") return extractTitleTags(job.title);
    return [];
  }, [job]);

  const handleCardClick = (e) => {
    if (
      e.target.closest("button") ||
      e.target.closest("a") ||
      e.target.closest("select") ||
      e.target.closest("input")
    ) {
      return;
    }
    navigate(`/job/${job._id || job.externalId}`);
  };

  return (
    <article
      onClick={handleCardClick}
      className="relative cursor-pointer flex flex-col justify-between h-full rounded-3xl border border-slate-200/60 dark:border-white/5 bg-white/70 dark:bg-slate-900/60 p-5 shadow-lg shadow-slate-200/40 dark:shadow-none backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-cyan-500/30 md:p-6 overflow-hidden"
    >
      <div className="flex-1 flex flex-col">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white md:text-xl line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <Link to={`/job/${job._id || job.externalId}`}>
                {job.title}
              </Link>
            </h3>
          </div>

          {/* Dynamic Skill Match Ring Area */}
          {job.skillMatchPercentage !== undefined && (
            <div className="flex flex-col items-center shrink-0">
              <div className={`relative flex items-center justify-center w-12 h-12 rounded-full border-4 ${job.skillMatchPercentage >= 80 ? 'border-emerald-500 text-emerald-500' :
                  job.skillMatchPercentage >= 50 ? 'border-amber-500 text-amber-500' :
                    'border-red-500 text-red-500'
                }`}>
                <span className="text-xs font-bold">{Math.round(job.skillMatchPercentage)}%</span>
              </div>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest">Match</span>
            </div>
          )}
        </header>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-slate-800 dark:text-slate-200">{job.company}</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden="true" />
            {job.location}
          </span>
        </div>

        {job.salary && job.salary !== "Not Disclosed" ? (
          <p className="mt-2 text-sm font-bold text-blue-600 dark:text-blue-400 md:text-base">{job.salary}</p>
        ) : null}

        {/* Missing vs Matching Skills rendering */}
        {Array.isArray(job.skills) && job.skills.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {job.skills.slice(0, 8).map(skill => {
              const isMatch = userSkills.includes(skill.toLowerCase());
              return (
                <span key={skill} className={`px-2.5 py-1 text-xs font-medium rounded-md border ${isMatch
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400'
                    : 'bg-slate-100/50 text-slate-600 border-slate-200/60 dark:bg-white/5 dark:text-slate-300 dark:border-white/5'
                  }`}>
                  {skill}
                </span>
              );
            })}
          </div>
        ) : tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.slice(0, 8).map((tag) => (
              <span
                key={`${job._id}-${tag}`}
                className="rounded-lg border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 px-3 py-1 text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-300 shadow-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400 line-clamp-2 md:text-base">{job.description}</p>

        {/* Legacy Insights Area */}
        {!compact && job.aiAnalysis ? (
          <div className="mt-5 space-y-4 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-zinc-900/40 p-4">
            <AiScoreBar score={job.aiAnalysis.authenticityScore ?? 0} />
            {showInsights ? <AiInsightPanel aiAnalysis={job.aiAnalysis} /> : null}
          </div>
        ) : null}
      </div>

      <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-white/5 pt-4">
        <p className="text-xs font-medium text-slate-500">{daysAgo(job.createdAt)}</p>
        <div className="flex items-center gap-2">
          {job.aiAnalysis && !compact ? (
            <button
              type="button"
              onClick={() => setShowInsights((current) => !current)}
              className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-white/10 md:text-sm"
            >
              {showInsights ? "Hide Insights" : "Show Insights"}
            </button>
          ) : null}
          {onSave ? (
            <button
              type="button"
              onClick={() => onSave(job)}
              className={`rounded-xl border px-4 py-2 text-xs font-bold shadow-sm transition-all md:text-sm ${isSaved
                ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10"
                }`}
            >
              {isSaved ? "Saved" : "Save"}
            </button>
          ) : null}
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noreferrer noopener"
            className={`flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-lg transition-all md:text-sm ${job.redirectPenalty === 0
                ? "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/30 hover:shadow-indigo-500/40"
                : "bg-slate-800 hover:bg-slate-700 shadow-slate-900/30"
              }`}
          >
            {job.redirectPenalty === 0 ? "Quick Apply" : "Apply Externally"} <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </footer>
    </article>
  );
}
