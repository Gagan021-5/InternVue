import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import axiosInstance from "../api/axiosInstance";
import ProtectedRoute from "../components/ProtectedRoute";

const emptyForm = {
  title: "",
  company: "",
  location: "",
  description: "",
  applyUrl: "",
  salary: "Not Disclosed",
  tags: "",
  isVerified: true,
  lat: "",
  lng: "",
};

function AdminDashboardContent() {
  const [form, setForm] = useState(emptyForm);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadLocalJobs = async () => {
    try {
      const response = await axiosInstance.get("/api/jobs", {
        params: { page: 1, limit: 100 },
      });
      const localOnly = (response.data.jobs || []).filter((job) => job.source === "local");
      setJobs(localOnly);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Failed to load local jobs.");
    }
  };

  useEffect(() => {
    loadLocalJobs();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await axiosInstance.post("/api/jobs", {
        title: form.title,
        company: form.company,
        location: form.location,
        description: form.description,
        applyUrl: form.applyUrl,
        salary: form.salary,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        source: "local",
        isVerified: form.isVerified,
        coordinates: {
          lat: form.lat ? Number(form.lat) : null,
          lng: form.lng ? Number(form.lng) : null,
        },
      });
      setForm(emptyForm);
      setSuccess("Internship posted successfully.");
      await loadLocalJobs();
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Failed to post internship.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-bg">
      <Navbar />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-8">
        <section className="section-shell p-6">
          <h1 className="font-display text-2xl font-semibold text-main">Admin Dashboard</h1>
          <p className="text-muted mt-1 text-sm">Post and verify local internship opportunities.</p>

          <form onSubmit={submit} className="mt-5 grid gap-3 md:grid-cols-2">
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Title"
              required
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
            <input
              value={form.company}
              onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))}
              placeholder="Company"
              required
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
            <input
              value={form.location}
              onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
              placeholder="Location"
              required
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
            <input
              value={form.applyUrl}
              onChange={(event) => setForm((current) => ({ ...current, applyUrl: event.target.value }))}
              placeholder="Apply URL"
              required
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
            <input
              value={form.salary}
              onChange={(event) => setForm((current) => ({ ...current, salary: event.target.value }))}
              placeholder="Salary"
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
            <input
              value={form.tags}
              onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
              placeholder="Tags (comma separated)"
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
            <input
              value={form.lat}
              onChange={(event) => setForm((current) => ({ ...current, lat: event.target.value }))}
              placeholder="Latitude"
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
            <input
              value={form.lng}
              onChange={(event) => setForm((current) => ({ ...current, lng: event.target.value }))}
              placeholder="Longitude"
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              rows={4}
              placeholder="Description"
              className="md:col-span-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
            <label className="md:col-span-2 flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={form.isVerified}
                onChange={(event) =>
                  setForm((current) => ({ ...current, isVerified: event.target.checked }))
                }
              />
              Mark verified
            </label>
            {error ? <p className="md:col-span-2 text-sm text-red-400">{error}</p> : null}
            {success ? <p className="md:col-span-2 text-sm text-emerald-400">{success}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="md:col-span-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {loading ? "Posting..." : "Post Internship"}
            </button>
          </form>
        </section>

        <section className="section-shell p-6">
          <h2 className="font-display text-xl font-semibold text-main">Local Jobs</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Company</th>
                  <th className="px-3 py-2">Location</th>
                  <th className="px-3 py-2">Verified</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job._id} className="border-t border-zinc-800 text-zinc-300">
                    <td className="px-3 py-2">{job.title}</td>
                    <td className="px-3 py-2">{job.company}</td>
                    <td className="px-3 py-2">{job.location}</td>
                    <td className="px-3 py-2">{job.isVerified ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function AdminDashboard() {
  return (
    <ProtectedRoute adminOnly>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}
