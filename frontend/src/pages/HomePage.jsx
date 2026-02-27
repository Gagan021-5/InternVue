import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

const bentoCardClass = "relative overflow-hidden rounded-3xl border border-slate-200/50 dark:border-white/5 bg-white/60 dark:bg-white/5 p-8 shadow-xl shadow-slate-200/40 dark:shadow-none backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-slate-300 dark:hover:border-white/10";
const impactCardClass = "rounded-3xl border border-slate-200/50 dark:border-white/5 bg-white/60 dark:bg-white/5 p-6 shadow-lg shadow-slate-200/30 dark:shadow-none backdrop-blur-lg transition-all hover:-translate-y-1 hover:border-slate-300 dark:hover:border-white/10";

export default function HomePage() {
  return (
    <main className="app-bg relative min-h-screen overflow-hidden">
      {/* Background ambient glows */}
      <div className="pointer-events-none absolute -left-[20%] -top-[10%] h-[500px] w-[500px] rounded-full bg-blue-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-[10%] top-[20%] h-[400px] w-[400px] rounded-full bg-cyan-400/20 blur-[100px]" />

      <Navbar />

      <div className="mx-auto max-w-7xl space-y-20 px-6 py-12 md:py-20 lg:px-8">

        {/* HERO SECTION */}
        <section className="relative overflow-hidden rounded-[3rem] border border-slate-200/50 dark:border-white/10 bg-white/40 dark:bg-zinc-950/40 p-1 shadow-2xl shadow-slate-300/30 dark:shadow-black/50 backdrop-blur-3xl">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-400/10" />
          <div className="relative rounded-[2.8rem] bg-white/60 dark:bg-zinc-950/60 px-6 py-20 text-center md:px-16 md:py-32">
            <div className="mx-auto max-w-4xl">
              <span className="inline-block rounded-full border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 px-4 py-1.5 text-sm font-bold tracking-widest text-blue-600 dark:text-blue-400 uppercase">
                InternVue Platform
              </span>
              <h1 className="mt-8 font-display text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl md:text-6xl lg:text-7xl">
                The Internship Hub Built for <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Professional Outcomes.</span>
              </h1>
              <p className="mx-auto mt-8 max-w-2xl text-lg text-slate-600 dark:text-slate-400 md:text-xl">
                InternVue combines verified local startup internships with trusted global opportunities,
                giving students a single environment to discover, evaluate, and act with absolute confidence.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link to="/feed" className="flex items-center gap-2 rounded-2xl bg-blue-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-blue-500/30 transition-all hover:-translate-y-1 hover:bg-blue-500 hover:shadow-blue-500/40">
                  Browse Opportunities
                  <span aria-hidden="true">&rarr;</span>
                </Link>
                <Link to="/register" className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-8 py-4 text-base font-bold text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-50 dark:hover:bg-white/10">
                  Create Account
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* BENTO GRID (User-Centric Advantage) */}
        <section className="relative z-10">
          <div className="text-center">
            <span className="text-sm font-bold tracking-widest text-blue-500 uppercase">User-Centric Advantage</span>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Purpose-built for verified discovery.
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <article className={`${bentoCardClass} md:col-span-2 lg:col-span-1`}>
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-blue-500/20 blur-3xl" />
              <div className="relative z-10">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Verified Authenticity</h3>
                <p className="mt-4 leading-relaxed text-slate-600 dark:text-slate-400">
                  InternVue actively blocks fake, senior-level, and misclassified listings so students
                  focus only on real internship-ready roles.
                </p>
              </div>
            </article>

            <article className={`${bentoCardClass} md:col-span-2 lg:col-span-1`}>
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-cyan-400/20 blur-3xl" />
              <div className="relative z-10">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Career Readiness</h3>
                <p className="mt-4 leading-relaxed text-slate-600 dark:text-slate-400">
                  AI guidance surfaces interview preparation prompts, highlights skill gaps, and helps
                  students prepare strategically before applying.
                </p>
              </div>
            </article>

            <article className={`${bentoCardClass} lg:col-span-1`}>
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-indigo-500/20 blur-3xl" />
              <div className="relative z-10">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Direct Connections</h3>
                <p className="mt-4 leading-relaxed text-slate-600 dark:text-slate-400">
                  Students connect directly with verified local startups and access clear application
                  paths without noisy, irrelevant detours.
                </p>
              </div>
            </article>
          </div>
        </section>

        {/* WHY IT MATTERS - IMPACT CARDS */}
        <section className="relative z-10 pt-10">
          <div className="text-center">
            <span className="text-sm font-bold tracking-widest text-blue-500 uppercase">Platform Impact</span>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Engineered for student success.
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            <article className={impactCardClass}>
              <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">Real-time Application Tracking.</h3>
              <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-400">
                Every saved role and status update stays visible, measurable, and easy to manage right inside your dashboard.
              </p>
            </article>
            <article className={impactCardClass}>
              <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">Global &amp; Local Pipeline.</h3>
              <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-400">
                Gain balanced access to exclusive verified local openings alongside high-quality global roles from Adzuna.
              </p>
            </article>
            <article className={impactCardClass}>
              <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">Apply Anywhere.</h3>
              <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-400">
                Our mobile-first, responsive design ensures a consistent, professional experience from login to application submission.
              </p>
            </article>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-blue-600 to-indigo-700 px-6 py-24 text-center shadow-2xl shadow-blue-500/20 md:px-16 md:py-32">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
          <div className="relative z-10 mx-auto max-w-3xl">
            <h2 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Ready to launch your career?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-blue-100/90 md:text-xl">
              Join InternVue today and start building your future with a platform dedicated to your professional journey.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/feed" className="rounded-2xl bg-white px-8 py-4 text-base font-bold text-blue-600 shadow-xl transition-all hover:scale-105 hover:bg-slate-50">
                Explore Jobs Now
              </Link>
              <Link to="/dashboard" className="rounded-2xl border border-white/20 bg-white/10 px-8 py-4 text-base font-bold text-white backdrop-blur-md transition-all hover:bg-white/20">
                Open Dashboard
              </Link>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
