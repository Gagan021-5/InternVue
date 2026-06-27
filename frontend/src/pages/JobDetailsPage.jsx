import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axiosInstance from "../api/axiosInstance";
import { useAuthContext } from "../context/AuthContext";
import Navbar from "../components/Navbar";

export default function JobDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { mongoUser } = useAuthContext();
  
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchJob = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await axiosInstance.get(`/api/jobs/${id}`);
        setJob(response.data.job || null);
      } catch (err) {
        console.error("Error fetching job details:", err.message);
        setError(err.response?.data?.error || "Failed to load job details.");
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 transition-colors duration-500 dark:bg-[#030712]">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="mt-4 text-slate-500 dark:text-slate-400 font-medium">Loading internship details...</p>
        </div>
      </main>
    );
  }

  if (error || !job) {
    return (
      <main className="min-h-screen bg-slate-50 transition-colors duration-500 dark:bg-[#030712]">
        <Navbar />
        <div className="max-w-xl mx-auto py-24 px-6 text-center">
          <div className="mb-4 rounded-full bg-red-100 dark:bg-red-500/10 p-4 inline-flex text-red-600 dark:text-red-400">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Internship not found</h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400">{error || "This listing could not be found or has expired."}</p>
          <Link to="/feed" className="btn-primary mt-6 inline-flex px-6 py-2.5 text-sm font-semibold">Back to Feed</Link>
        </div>
      </main>
    );
  }

  const ai = job.aiAnalysis;
  const daysAgo = () => {
    const diff = Date.now() - new Date(job.createdAt).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return days === 0 ? "Posted today" : days === 1 ? "Posted 1 day ago" : `Posted ${days} days ago`;
  };

  return (
    <main className="min-h-screen bg-slate-50 transition-colors duration-500 dark:bg-[#030712]">
      <Navbar />

      <div className="relative mx-auto max-w-7xl px-6 py-8 lg:px-8">
        
        {/* BACK ACTION */}
        <Link to="/feed" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:opacity-80 mb-6 transition-all">
          ← Back to Internship Feed
        </Link>

        {/* HERO CARD */}
        <div className="section-shell p-6 md:p-8 bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 rounded-3xl shadow-xl backdrop-blur-xl mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="space-y-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-4xl">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm md:text-base text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-lg">{job.company}</span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                  {job.location}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                  {daysAgo()}
                </span>
              </div>
              
              {job.salary && job.salary !== "Not Disclosed" && (
                <div className="inline-flex bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold px-3 py-1.5 rounded-xl text-sm md:text-base shadow-sm">
                  {job.salary}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <a
                href={job.applyUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="btn-primary flex items-center justify-center gap-2 px-8 py-3.5 text-base font-bold shadow-xl shadow-blue-500/20"
              >
                Apply for Internship ⚡
              </a>
            </div>
          </div>
        </div>

        {/* TWO-COLUMN CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-8">
          
          {/* LEFT: DESCRIPTION */}
          <div className="space-y-6">
            <div className="section-shell p-6 md:p-8 bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 rounded-3xl shadow-lg backdrop-blur-xl">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-200 dark:border-white/5">Role Overview & Description</h2>
              <div className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line text-sm md:text-base space-y-4">
                {job.description}
              </div>
            </div>
          </div>

          {/* RIGHT: AI ANALYSIS & OUTREACH */}
          <div className="space-y-6">
            
            {/* AI SCORE CARD */}
            <div className="section-shell p-6 bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 rounded-3xl shadow-lg backdrop-blur-xl">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Career Analytics & Fit</h2>
              
              {!job.isEnriched && !ai ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-500 border-t-transparent mb-3" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Analyzing listing details...</p>
                  <p className="text-xs text-slate-400 mt-1">Our background queue is generating fit and coaching insights. Please refresh in a moment.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Scores layout */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 rounded-2xl p-4 text-center">
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Authenticity</p>
                      <p className={`text-3xl font-extrabold mt-1 ${(ai?.authenticityScore || 50) >= 80 ? 'text-emerald-500' : (ai?.authenticityScore || 50) >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                        {ai?.authenticityScore ?? 50}%
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 rounded-2xl p-4 text-center">
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">FIT MATCH</p>
                      <p className={`text-3xl font-extrabold mt-1 ${(ai?.fitScore || 50) >= 80 ? 'text-emerald-500' : (ai?.fitScore || 50) >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                        {ai?.fitScore ?? 50}%
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic bg-slate-50 dark:bg-white/5 p-3 rounded-2xl">
                    "{ai?.summary || 'AI analysis summary is being generated for this internship role.'}"
                  </p>

                  {/* Extracted Skills */}
                  {Array.isArray(job.skills) && job.skills.length > 0 && (
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Required Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {job.skills.map((skill) => (
                          <span key={skill} className="bg-slate-100/60 dark:bg-white/5 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-200/60 dark:border-white/5">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strengths */}
                  {Array.isArray(ai?.strengths) && ai.strengths.length > 0 && (
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Key Strengths</p>
                      <ul className="space-y-1.5">
                        {ai.strengths.map((s, idx) => (
                          <li key={idx} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                            <span className="text-emerald-500 shrink-0 font-bold">✓</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Risk signals */}
                  {Array.isArray(ai?.redFlags) && ai.redFlags.length > 0 && (
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Risk Signals</p>
                      <ul className="space-y-1.5">
                        {ai.redFlags.map((r, idx) => (
                          <li key={idx} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                            <span className="text-red-500 shrink-0 font-bold">⚠️</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>
              )}
            </div>



          </div>
        </div>
      </div>
    </main>
  );
}
