import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import { useAuthContext } from "../context/AuthContext";

/* ── Animation Variants ─────────────────────────────────────────────────── */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1], delay },
});

/* ── Stat data ──────────────────────────────────────────────────────────── */
const STATS = [
  { value: "900+", label: "Live Internships" },
  { value: "AI", label: "Powered Analysis" },
  { value: "100%", label: "Verified Authenticity" },
];

/* ── Bento feature cards ────────────────────────────────────────────────── */
const FEATURES = [
  {
    col: "md:col-span-2 lg:col-span-1",
    accent: "from-blue-500/20 to-cyan-400/5",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    title: "Verified Authenticity",
    body:
      "Every listing is filtered by AI to block fake, senior-level, and misclassified roles. You only see genuine internship-ready opportunities.",
  },
  {
    col: "md:col-span-2 lg:col-span-1",
    accent: "from-indigo-500/15 to-violet-400/5",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    iconBg: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
    title: "AI Career Readiness",
    body:
      "Gemini-powered analysis surfaces personalized interview questions and skill-gap insights so you walk into every application prepared.",
  },
  {
    col: "md:col-span-4 lg:col-span-1",
    accent: "from-cyan-500/15 to-teal-400/5",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    iconBg: "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400",
    title: "Direct Connections",
    body:
      "Each role links directly to the application — no agency walls, no hidden redirects. Local startup gems alongside curated global listings.",
  },
];

/* ── Impact rows ────────────────────────────────────────────────────────── */
const IMPACT = [
  { icon: "📊", title: "Real-time Pipeline Tracker", body: "Kanban board with drag-and-drop cards. Move applications from Saved → Applied → Interviewing without leaving your dashboard." },
  { icon: "🌏", title: "Global & Local Pipeline", body: "Live Adzuna feed from 900+ global firms merged with hand-curated local startup roles. Searchable, filterable, and always fresh." },
  { icon: "✍️", title: "AI Outreach Drafts", body: "One-click Gemini-generated cover letters personalised to the job and your profile. Edit and send in under two minutes." },
];

export default function HomePage() {
  const { isAuthenticated } = useAuthContext();
  const feedDestination = isAuthenticated ? "/feed" : "/login";

  return (
    <main className="app-bg relative min-h-screen overflow-hidden">
      {/* ── Ambient background glows ──────────────────────────────────── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-[20%] -top-[10%] h-[600px] w-[600px] rounded-full bg-blue-500/[0.12] blur-[140px] dark:bg-blue-500/[0.08]" />
        <div className="absolute -right-[10%] top-[20%]  h-[500px] w-[500px] rounded-full bg-cyan-400/[0.10] blur-[120px] dark:bg-cyan-400/[0.06]" />
        <div className="absolute bottom-[10%]  left-[30%]  h-[400px] w-[400px] rounded-full bg-indigo-500/[0.08] blur-[100px] dark:bg-indigo-500/[0.05]" />
      </div>

      <Navbar />

      <div className="relative mx-auto max-w-7xl space-y-24 px-6 py-16 md:py-24 lg:px-8">

        {/* ══ HERO ════════════════════════════════════════════════════════ */}
        <motion.section {...fadeUp(0)} className="text-center">
          {/* Platform badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-blue-50 px-4 py-1.5 dark:border-blue-500/20 dark:bg-blue-500/10">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
            <span className="label-tag text-blue-600 dark:text-blue-400">InternVue Platform · Live</span>
          </div>

          {/* Heading */}
          <h1 className="mx-auto mt-8 max-w-4xl text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-6xl md:text-7xl">
            The Internship Hub Built for{" "}
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-cyan-400">
              Professional Outcomes.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-500 dark:text-slate-400 md:text-xl">
            Verified listings. AI-powered analysis. Real pipeline tracking.
            InternVue gives you every advantage — from discovery to offer letter.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to={feedDestination}
              className="btn-primary group inline-flex items-center gap-2 px-8 py-4 text-base shadow-xl shadow-blue-500/20"
            >
              Browse Opportunities
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
            <Link
              to="/register"
              className="btn-secondary inline-flex items-center gap-2 px-8 py-4 text-base"
            >
              Create Account
            </Link>
          </div>

          {/* Stat pills */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-6">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col items-center">
                <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{s.value}</span>
                <span className="label-tag mt-0.5 text-slate-500 dark:text-slate-500">{s.label}</span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ══ BENTO FEATURE GRID ══════════════════════════════════════════ */}
        <motion.section {...fadeUp(0.05)}>
          <div className="mb-12 text-center">
            <span className="label-tag text-blue-500">User-Centric Advantage</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Purpose-built for verified discovery.
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-4 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.article
                key={f.title}
                {...fadeUp(i * 0.07)}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className={`group relative overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white/60 p-8 shadow-sm backdrop-blur-xl transition-shadow hover:shadow-xl hover:shadow-slate-200/60 dark:border-white/8 dark:bg-white/[0.04] dark:hover:shadow-none ${f.col}`}
              >
                {/* Card accent glow */}
                <div className={`pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-gradient-to-br ${f.accent} blur-3xl`} />

                <div className="relative z-10">
                  <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-2xl ${f.iconBg}`}>
                    {f.icon}
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{f.title}</h3>
                  <p className="mt-4 leading-relaxed text-slate-500 dark:text-slate-400">{f.body}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </motion.section>

        {/* ══ IMPACT SECTION ══════════════════════════════════════════════ */}
        <motion.section {...fadeUp(0.05)}>
          <div className="mb-12 text-center">
            <span className="label-tag text-blue-500">Platform Impact</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Engineered for student success.
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {IMPACT.map((item, i) => (
              <motion.div
                key={item.title}
                {...fadeUp(i * 0.08)}
                whileHover={{ y: -3, transition: { duration: 0.18 } }}
                className="rounded-[2rem] border border-slate-200/60 bg-white/60 p-8 backdrop-blur-xl transition-shadow hover:shadow-lg hover:shadow-slate-200/40 dark:border-white/8 dark:bg-white/[0.04]"
              >
                <span className="text-3xl">{item.icon}</span>
                <h3 className="mt-4 text-lg font-bold tracking-tight text-slate-900 dark:text-white">{item.title}</h3>
                <p className="mt-3 leading-relaxed text-slate-500 dark:text-slate-400">{item.body}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ══ CTA BANNER ═════════════════════════════════════════════════ */}
        <motion.section {...fadeUp(0.05)}>
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 px-8 py-20 text-center shadow-2xl shadow-blue-500/25 md:px-16 md:py-28">
            {/* Dot texture overlay */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }}
            />
            {/* Glow orb */}
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 -translate-y-1/3 rounded-full bg-white/10 blur-[80px]" />

            <div className="relative z-10 mx-auto max-w-3xl">
              <span className="label-tag text-blue-200">Ready to launch?</span>
              <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                Your next opportunity starts here.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg text-blue-100/80">
                Join thousands of students using InternVue to find, track, and land their first professional role.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  to={feedDestination}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-bold text-blue-600 shadow-xl transition-all hover:scale-[1.03] hover:shadow-2xl active:scale-95"
                >
                  Explore Jobs Now →
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-8 py-4 text-base font-bold text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95"
                >
                  Create Free Account
                </Link>
              </div>
            </div>
          </div>
        </motion.section>

      </div>
    </main>
  );
}
