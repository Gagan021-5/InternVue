import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion"; // Make sure this is installed
import Navbar from "../components/Navbar";
import VoiceMentorButton from "../components/VoiceMentorButton";
import OutreachModal from "../components/OutreachModal";
import { useAuthContext } from "../context/AuthContext";
import axiosInstance from "../api/axiosInstance";

const tabs = [
  { id: "profile", label: "Career Identity", icon: "👤" },
  { id: "saved", label: "Saved Opportunities", icon: "🔖" },
  { id: "prep", label: "AI Interview Prep", icon: "🧠" },
  { id: "tracker", label: "Pipeline Tracker", icon: "📈" },
];

const statusOrder = ["saved", "applied", "interviewing", "accepted", "rejected"];

const statusStyles = {
  saved: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
  applied: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20",
  interviewing: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  accepted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
  rejected: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20",
};

export default function StudentDashboard() {
  const { user, refreshProfile } = useAuthContext();
  const [activeTab, setActiveTab] = useState("profile");
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [outreachModalJob, setOutreachModalJob] = useState(null);

  const [form, setForm] = useState({
    githubUrl: "", portfolioUrl: "", resumeUrl: "", bio: "", skills: [],
    location: { city: "", state: "", country: "" },
  });

  // Keep your existing data loading logic untouched
  const loadDashboardData = async () => {
    setLoading(true); setError("");
    try {
      const [meRes, savedRes] = await Promise.all([
        axiosInstance.get("/api/auth/me"),
        axiosInstance.get("/api/user/jobs"),
      ]);
      const p = meRes.data?.user;
      setSavedJobs(savedRes.data?.jobs || []);
      setForm({
        githubUrl: p?.githubUrl || "", portfolioUrl: p?.portfolioUrl || "", resumeUrl: p?.resumeUrl || "",
        bio: p?.bio || "", skills: Array.isArray(p?.skills) ? p.skills : [],
        location: { city: p?.location?.city || "", state: p?.location?.state || "", country: p?.location?.country || "" },
      });
    } catch (err) {
      setError(err.response?.data?.error || "Could not load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboardData(); }, []);

  const providers = useMemo(() => {
    const ids = user?.providerData?.map((p) => p.providerId) || [];
    return { google: ids.includes("google.com"), github: ids.includes("github.com"), email: ids.includes("password") };
  }, [user]);

  const groupedQuestions = useMemo(() => {
    const map = new Map();
    savedJobs.forEach((item) => {
      const company = item.jobData?.company || "Unknown Company";
      const questions = item.jobData?.aiAnalysis?.interviewQuestions || [];
      if (!questions.length) return;
      if (!map.has(company)) map.set(company, []);
      map.get(company).push(...questions);
    });
    return Array.from(map.entries()).map(([company, questions]) => ({ company, questions: [...new Set(questions)] }));
  }, [savedJobs]);

  const kanban = useMemo(() => {
    return statusOrder.reduce((acc, status) => {
      acc[status] = savedJobs.filter((job) => job.status === status);
      return acc;
    }, {});
  }, [savedJobs]);

  const addSkill = () => {
    const val = skillInput.trim();
    if (!val) return;
    setForm((curr) => ({ ...curr, skills: curr.skills.includes(val) ? curr.skills : [...curr.skills, val] }));
    setSkillInput("");
  };

  const removeSkill = (skill) => setForm((curr) => ({ ...curr, skills: curr.skills.filter((s) => s !== skill) }));

  const saveProfile = async () => {
    setSavingProfile(true); setError("");
    try {
      await axiosInstance.patch("/api/auth/profile", form);
      await refreshProfile();
    } catch (err) { setError(err.response?.data?.error || "Failed to save profile."); }
    finally { setSavingProfile(false); }
  };

  const updateStatus = async (jobId, status) => {
    try {
      await axiosInstance.patch(`/api/user/jobs/${jobId}/status`, { status });
      setSavedJobs((curr) => curr.map((item) => (item.jobId === jobId ? { ...item, status } : item)));
    } catch (err) { setError(err.response?.data?.error || "Failed to update status."); }
  };

  const unsave = async (jobId) => {
    try {
      await axiosInstance.delete(`/api/user/jobs/${jobId}`);
      setSavedJobs((curr) => curr.filter((item) => item.jobId !== jobId));
    } catch (err) { setError(err.response?.data?.error || "Failed to remove saved job."); }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-[#030712] transition-colors duration-300">
        <Navbar />
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        </div>
      </main>
    );
  }

  // Premium input class to keep JSX clean
  const inputClass = "w-full rounded-2xl border border-slate-200 bg-white/50 px-4 py-3 text-sm text-slate-900 outline-none backdrop-blur-sm transition-all focus:border-blue-500 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-blue-500 dark:focus:bg-white/10";

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#030712] transition-colors duration-500">
      <Navbar />

      {/* Background Mesh (Invisible in light mode, soft glow in dark mode) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-0 dark:opacity-40">
        <div className="absolute -top-[10%] -right-[10%] h-[50%] w-[50%] rounded-full bg-blue-600/20 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 lg:px-8">

        {/* PREMIUM COMMAND HEADER */}
        <section className="mb-8 overflow-hidden rounded-[2rem] border border-slate-200 bg-white/80 p-8 shadow-xl shadow-slate-200/50 backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 dark:shadow-none">
          <div className="flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
            <div className="relative h-20 w-20 shrink-0">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="User" className="h-full w-full rounded-full object-cover shadow-inner" />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-3xl font-bold text-white shadow-lg">
                  {user?.displayName?.[0]?.toUpperCase() || "S"}
                </div>
              )}
              <div className="absolute bottom-0 right-0 h-5 w-5 rounded-full border-4 border-white bg-emerald-500 dark:border-[#030712]"></div>
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {user?.displayName || "Student Command Center"}
              </h1>
              <p className="mt-1 text-slate-500 dark:text-slate-400">{user?.email}</p>
              <div className="mt-3 flex justify-center gap-2 md:justify-start">
                {providers.google && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">Google Auth</span>}
                {providers.github && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">GitHub Auth</span>}
              </div>
            </div>

            <div className="shrink-0">
              <VoiceMentorButton />
            </div>
          </div>
        </section>

        {/* HORIZONTAL SCROLL TABS */}
        <div className="no-scrollbar mb-8 flex gap-3 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold transition-all ${activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
                }`}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </motion.div>
        )}

        {/* TAB CONTENT WITH ANIMATIONS */}
        <AnimatePresence mode="wait">

          {/* IDENTITY TAB */}
          {activeTab === "profile" && (
            <motion.section key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-[2rem] border border-slate-200 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5 lg:col-span-2">
                <h2 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">Professional Links</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <input value={form.githubUrl} onChange={(e) => setForm({ ...form, githubUrl: e.target.value })} placeholder="GitHub URL" className={inputClass} />
                  <input value={form.portfolioUrl} onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })} placeholder="Portfolio URL" className={inputClass} />
                  <input value={form.resumeUrl} onChange={(e) => setForm({ ...form, resumeUrl: e.target.value })} placeholder="Resume Link (PDF)" className={`md:col-span-2 ${inputClass}`} />
                </div>

                <h2 className="mb-4 mt-8 text-xl font-bold text-slate-900 dark:text-white">Location Details</h2>
                <div className="grid gap-4 md:grid-cols-3">
                  <input value={form.location.city} onChange={(e) => setForm({ ...form, location: { ...form.location, city: e.target.value } })} placeholder="City" className={inputClass} />
                  <input value={form.location.state} onChange={(e) => setForm({ ...form, location: { ...form.location, state: e.target.value } })} placeholder="State" className={inputClass} />
                  <input value={form.location.country} onChange={(e) => setForm({ ...form, location: { ...form.location, country: e.target.value } })} placeholder="Country" className={inputClass} />
                </div>

                <h2 className="mb-4 mt-8 text-xl font-bold text-slate-900 dark:text-white">About Me</h2>
                <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Briefly describe your tech journey..." rows={4} className={inputClass} />
              </div>

              {/* SKILLS BENTO BOX */}
              <div className="h-fit rounded-[2rem] border border-slate-200 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">Skill Cloud</h2>
                <div className="mb-6 flex flex-wrap gap-2">
                  <AnimatePresence>
                    {form.skills.map((skill) => (
                      <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} key={skill} onClick={() => removeSkill(skill)} className="flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-red-50 hover:text-red-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-red-500/20 dark:hover:text-red-400">
                        {skill} <span>×</span>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
                <div className="flex gap-2">
                  <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSkill()} placeholder="E.g. React, Node.js" className={inputClass} />
                  <button onClick={addSkill} className="rounded-2xl bg-slate-900 px-6 font-bold text-white transition-transform hover:scale-105 dark:bg-white dark:text-slate-900">Add</button>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/10">
                  <button onClick={saveProfile} disabled={savingProfile} className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-white shadow-lg shadow-blue-600/20 transition-transform hover:scale-[1.02] disabled:opacity-50">
                    {savingProfile ? "Syncing to Database..." : "Save Complete Profile"}
                  </button>
                </div>
              </div>
            </motion.section>
          )}

          {/* SAVED LIST TAB */}
          {activeTab === "saved" && (
            <motion.section key="saved" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {savedJobs.length === 0 ? (
                <p className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400">No saved jobs yet. Head to the Feed to discover opportunities.</p>
              ) : (
                savedJobs.map((entry) => (
                  <div key={entry.jobId} className="group rounded-[2rem] border border-slate-200 bg-white/60 p-6 shadow-sm backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1">{entry.jobData?.title}</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-1">{entry.jobData?.company}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${statusStyles[entry.status]}`}>{entry.status}</span>
                    </div>
                    <div className="mt-6 flex gap-2 border-t border-slate-200 pt-4 dark:border-white/10">
                      <select value={entry.status} onChange={(e) => updateStatus(entry.jobId, e.target.value)} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none dark:border-white/10 dark:bg-black/20 dark:text-slate-300">
                        {statusOrder.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                      <button onClick={() => setOutreachModalJob(entry)} className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-600 transition-colors hover:bg-indigo-100 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20">✨ Draft</button>
                      <button onClick={() => unsave(entry.jobId)} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20">Remove</button>
                    </div>
                  </div>
                ))
              )}
            </motion.section>
          )}

          {/* AI PREP TAB */}
          {activeTab === "prep" && (
            <motion.section key="prep" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
              {groupedQuestions.length === 0 ? (
                <div className="rounded-[2rem] border border-dashed border-slate-300 py-20 text-center dark:border-white/10">
                  <p className="text-slate-500 dark:text-slate-400">Save jobs from the Smart Feed to generate AI interview questions.</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {groupedQuestions.map((group) => (
                    <div key={group.company} className="rounded-[2rem] border border-slate-200 bg-white/60 p-8 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                      <h3 className="mb-6 text-xl font-extrabold text-slate-900 dark:text-white">{group.company} Insights</h3>
                      <ul className="space-y-4">
                        {group.questions.map((question, idx) => (
                          <li key={idx} className="group relative rounded-2xl bg-slate-50 p-4 pr-16 text-sm text-slate-700 dark:bg-black/20 dark:text-slate-300">
                            <span className="absolute left-4 top-4 font-mono text-blue-500">Q.</span>
                            <span className="ml-6 block">{question}</span>
                            <button onClick={() => navigator.clipboard.writeText(question)} className="absolute right-4 top-4 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold uppercase text-slate-400 opacity-0 transition-all hover:text-blue-600 group-hover:opacity-100 dark:border-white/10 dark:bg-zinc-800">Copy</button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </motion.section>
          )}

          {/* KANBAN TRACKER TAB */}
          {activeTab === "tracker" && (
            <motion.section key="tracker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-8 md:grid md:grid-cols-5 md:overflow-visible md:pb-0 no-scrollbar">
              {statusOrder.map((status) => (
                <div key={status} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const id = e.dataTransfer.getData("jobId"); if (id) updateStatus(id, status); }} className="w-[85vw] min-w-[300px] shrink-0 snap-center rounded-[2rem] border border-slate-200 bg-slate-100/50 p-4 dark:border-white/5 dark:bg-white/5 md:w-auto md:min-w-0">
                  <h3 className="mb-6 flex items-center justify-between px-2 text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${status === 'accepted' ? 'bg-emerald-500' : status === 'rejected' ? 'bg-red-500' : status === 'interviewing' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                      {status}
                    </span>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-600 dark:bg-white/10 dark:text-slate-300">{(kanban[status] || []).length}</span>
                  </h3>

                  <div className="space-y-3">
                    <AnimatePresence>
                      {(kanban[status] || []).map((entry) => (
                        <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} key={entry.jobId} draggable onDragStart={(e) => e.dataTransfer.setData("jobId", entry.jobId)} className="group cursor-grab rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-400 hover:shadow-md active:cursor-grabbing dark:border-white/10 dark:bg-[#0f172a] dark:hover:border-blue-500/50">
                          <p className="font-bold text-slate-900 line-clamp-1 dark:text-white">{entry.jobData?.title}</p>
                          <p className="mt-1 text-xs text-slate-500 line-clamp-1 dark:text-slate-400">{entry.jobData?.company}</p>
                          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-white/5">
                            <span className="text-[10px] font-semibold text-slate-400">Saved {new Date(entry.savedAt).toLocaleDateString()}</span>
                            <span className="text-[10px] font-mono text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-600">Drag ⠿</span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {(kanban[status] || []).length === 0 && (
                      <div className="rounded-2xl border-2 border-dashed border-slate-200 py-8 text-center dark:border-white/5">
                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-600">Drop item here</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <OutreachModal
        isOpen={!!outreachModalJob}
        onClose={() => setOutreachModalJob(null)}
        job={outreachModalJob}
      />
    </main>
  );
}