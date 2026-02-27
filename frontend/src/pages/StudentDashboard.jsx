import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import VoiceMentorButton from "../components/VoiceMentorButton";
import { useAuthContext } from "../context/AuthContext";
import axiosInstance from "../api/axiosInstance";

const tabs = ["profile", "saved", "prep", "tracker"];
const statusOrder = ["saved", "applied", "interviewing", "accepted", "rejected"];

const statusStyles = {
  saved: "bg-blue-950 border border-blue-800 text-blue-300",
  applied: "bg-indigo-950 border border-indigo-800 text-indigo-300",
  interviewing: "bg-amber-950 border border-amber-800 text-amber-300",
  accepted: "bg-emerald-950 border border-emerald-800 text-emerald-300",
  rejected: "bg-red-950 border border-red-800 text-red-300",
};

export default function StudentDashboard() {
  const { user, refreshProfile } = useAuthContext();
  const [activeTab, setActiveTab] = useState("profile");
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState("");
  const [skillInput, setSkillInput] = useState("");

  const [form, setForm] = useState({
    githubUrl: "",
    portfolioUrl: "",
    resumeUrl: "",
    bio: "",
    skills: [],
    location: { city: "", state: "", country: "" },
  });

  const loadDashboardData = async () => {
    setLoading(true);
    setError("");
    try {
      const [meResponse, savedResponse] = await Promise.all([
        axiosInstance.get("/api/auth/me"),
        axiosInstance.get("/api/user/jobs"),
      ]);

      const mongoProfile = meResponse.data?.user;
      setSavedJobs(savedResponse.data?.jobs || []);
      setForm({
        githubUrl: mongoProfile?.githubUrl || "",
        portfolioUrl: mongoProfile?.portfolioUrl || "",
        resumeUrl: mongoProfile?.resumeUrl || "",
        bio: mongoProfile?.bio || "",
        skills: Array.isArray(mongoProfile?.skills) ? mongoProfile.skills : [],
        location: {
          city: mongoProfile?.location?.city || "",
          state: mongoProfile?.location?.state || "",
          country: mongoProfile?.location?.country || "",
        },
      });
    } catch (requestError) {
      console.error("Dashboard load failed:", requestError.message);
      setError(requestError.response?.data?.error || "Could not load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const providers = useMemo(() => {
    const providerIds = user?.providerData?.map((provider) => provider.providerId) || [];
    return {
      google: providerIds.includes("google.com"),
      github: providerIds.includes("github.com"),
      email: providerIds.includes("password"),
    };
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
    return Array.from(map.entries()).map(([company, questions]) => ({
      company,
      questions: [...new Set(questions)],
    }));
  }, [savedJobs]);

  const kanban = useMemo(() => {
    return statusOrder.reduce((acc, status) => {
      acc[status] = savedJobs.filter((job) => job.status === status);
      return acc;
    }, {});
  }, [savedJobs]);

  const addSkill = () => {
    const value = skillInput.trim();
    if (!value) return;
    setForm((current) => ({
      ...current,
      skills: current.skills.includes(value) ? current.skills : [...current.skills, value],
    }));
    setSkillInput("");
  };

  const removeSkill = (skill) => {
    setForm((current) => ({
      ...current,
      skills: current.skills.filter((entry) => entry !== skill),
    }));
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    setError("");
    try {
      const response = await axiosInstance.patch("/api/auth/profile", form);
      await refreshProfile();
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Failed to save profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const updateStatus = async (jobId, status) => {
    try {
      await axiosInstance.patch(`/api/user/jobs/${jobId}/status`, { status });
      setSavedJobs((current) =>
        current.map((item) => (item.jobId === jobId ? { ...item, status } : item))
      );
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Failed to update status.");
    }
  };

  const unsave = async (jobId) => {
    try {
      await axiosInstance.delete(`/api/user/jobs/${jobId}`);
      setSavedJobs((current) => current.filter((item) => item.jobId !== jobId));
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Failed to remove saved job.");
    }
  };

  if (loading) {
    return (
      <main className="app-bg">
        <Navbar />
        <div className="text-muted mx-auto max-w-5xl px-4 py-8">Loading dashboard...</div>
      </main>
    );
  }

  return (
    <main className="app-bg">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <section className="section-shell mb-6 p-6">
          <div className="flex flex-wrap items-center gap-4">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || "User"} className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
                {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="font-display text-2xl font-semibold text-main">
                {user?.displayName || "Student Dashboard"}
              </h1>
              <p className="text-muted text-sm">{user?.email}</p>
              <div className="mt-2 flex gap-2">
                {providers.google ? <span className="provider-google rounded-full px-2 py-0.5 text-xs font-mono">Google</span> : null}
                {providers.github ? <span className="provider-github rounded-full px-2 py-0.5 text-xs font-mono">GitHub</span> : null}
                {providers.email ? <span className="provider-email rounded-full px-2 py-0.5 text-xs font-mono">Email</span> : null}
              </div>
            </div>
          </div>
        </section>

        <div className="mb-4 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${activeTab === tab
                  ? "bg-blue-600 text-white"
                  : "border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                }`}
            >
              {tab === "profile"
                ? "Profile"
                : tab === "saved"
                  ? "Saved Jobs"
                  : tab === "prep"
                    ? "Interview Prep"
                    : "Applications Tracker"}
            </button>
          ))}
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        ) : null}

        {activeTab === "profile" ? (
          <section className="section-shell p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={form.githubUrl}
                onChange={(event) => setForm((current) => ({ ...current, githubUrl: event.target.value }))}
                placeholder="GitHub URL"
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
              />
              <input
                value={form.portfolioUrl}
                onChange={(event) => setForm((current) => ({ ...current, portfolioUrl: event.target.value }))}
                placeholder="Portfolio URL"
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
              />
              <input
                value={form.resumeUrl}
                onChange={(event) => setForm((current) => ({ ...current, resumeUrl: event.target.value }))}
                placeholder="Resume URL"
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
              />
              <input
                value={form.location.city}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    location: { ...current.location, city: event.target.value },
                  }))
                }
                placeholder="City"
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
              />
              <input
                value={form.location.state}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    location: { ...current.location, state: event.target.value },
                  }))
                }
                placeholder="State"
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
              />
              <input
                value={form.location.country}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    location: { ...current.location, country: event.target.value },
                  }))
                }
                placeholder="Country"
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
              />
            </div>
            <textarea
              value={form.bio}
              onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
              placeholder="Short bio"
              rows={4}
              className="mt-4 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
            />

            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
              <p className="mb-2 text-sm text-zinc-400">Skills</p>
              <div className="mb-2 flex flex-wrap gap-2">
                {form.skills.map((skill) => (
                  <button
                    type="button"
                    key={skill}
                    onClick={() => removeSkill(skill)}
                    className="rounded-full border border-blue-800 bg-blue-950 px-2 py-1 text-xs text-blue-300"
                  >
                    {skill} x
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={skillInput}
                  onChange={(event) => setSkillInput(event.target.value)}
                  placeholder="Add skill"
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
                >
                  Add
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={saveProfile}
              disabled={savingProfile}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
          </section>
        ) : null}

        {activeTab === "saved" ? (
          <section className="section-shell p-6">
            {savedJobs.length === 0 ? (
              <p className="text-sm text-zinc-400">No saved jobs yet. Browse internships -&gt;</p>
            ) : (
              <div className="space-y-3">
                {savedJobs.map((entry) => (
                  <div key={entry.jobId} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-zinc-100">{entry.jobData?.title}</p>
                        <p className="text-sm text-zinc-500">{entry.jobData?.company}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs ${statusStyles[entry.status]}`}>
                        {entry.status}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <select
                        value={entry.status}
                        onChange={(event) => updateStatus(entry.jobId, event.target.value)}
                        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 outline-none"
                      >
                        {statusOrder.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => unsave(entry.jobId)}
                        className="rounded-lg border border-red-900 bg-red-950 px-3 py-1.5 text-xs text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {activeTab === "prep" ? (
          <section className="section-shell p-6">
            <VoiceMentorButton />
            {groupedQuestions.length === 0 ? (
              <p className="text-sm text-zinc-400">No AI interview questions yet. Save jobs with AI analysis first.</p>
            ) : (
              <div className="space-y-4">
                {groupedQuestions.map((group) => (
                  <div key={group.company} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                    <p className="font-medium text-zinc-100">{group.company}</p>
                    <ul className="mt-2 space-y-2">
                      {group.questions.map((question, index) => (
                        <li key={`${group.company}-${index}`} className="flex items-start justify-between gap-2 text-sm text-zinc-300">
                          <span>{question}</span>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(question)}
                            className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                          >
                            Copy
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {activeTab === "tracker" ? (
          <section className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-5 md:overflow-visible md:pb-0">
            {statusOrder.map((status) => (
              <div
                key={status}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  const jobId = event.dataTransfer.getData("text/job-id");
                  if (jobId) updateStatus(jobId, status);
                }}
                className="w-80 min-w-[300px] snap-center shrink-0 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-zinc-900/40 p-4 shadow-sm backdrop-blur-md md:w-auto md:min-w-0"
              >
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-300 flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${status === 'accepted' ? 'bg-emerald-500' : status === 'rejected' ? 'bg-red-500' : status === 'interviewing' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                  {status}
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 dark:bg-zinc-800 text-[10px] text-slate-600 dark:text-zinc-400">
                    {(kanban[status] || []).length}
                  </span>
                </h3>
                <div className="space-y-3">
                  {(kanban[status] || []).map((entry) => (
                    <div
                      key={`${status}-${entry.jobId}`}
                      draggable
                      onDragStart={(event) => event.dataTransfer.setData("text/job-id", entry.jobId)}
                      className="cursor-grab rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-zinc-950/70 p-3 text-sm shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                    >
                      <p className="font-semibold text-slate-900 dark:text-zinc-100 line-clamp-1">{entry.jobData?.title}</p>
                      <p className="text-slate-600 dark:text-zinc-400 mt-0.5 line-clamp-1">{entry.jobData?.company}</p>
                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-zinc-800/50 pt-2">
                        <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-500">
                          {new Date(entry.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>
                        <span className="text-[10px] font-mono text-zinc-400">Drag ⠿</span>
                      </div>
                    </div>
                  ))}
                  {(kanban[status] || []).length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-300 dark:border-zinc-700/50 py-6 text-center">
                      <p className="text-xs text-slate-400 dark:text-zinc-500">Drop here</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </section>
        ) : null}
      </div>
    </main>
  );
}
