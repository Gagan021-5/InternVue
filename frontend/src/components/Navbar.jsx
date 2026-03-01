import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import SearchBar from "./SearchBar";
import { useAuthContext } from "../context/AuthContext";
import { useThemeContext } from "../context/ThemeContext";

/* ── Icons ─────────────────────────────────────────────────────────────── */
const SunIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

const MenuIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

/* ── Nav Links ──────────────────────────────────────────────────────────── */
const NAV_LINKS = [
  { to: "/feed", label: "Browse Jobs" },
  { to: "/dashboard", label: "Dashboard", auth: true },
];

export default function Navbar({ onSearch }) {
  const { user, logout, loading, isAuthenticated } = useAuthContext();
  const { isDark, toggleTheme } = useThemeContext();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  /* Close dropdown on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (!dropdownRef.current?.contains(e.target)) setDropdownOpen(false);
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  /* Scroll shadow trigger */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Close mobile menu on route change */
  useEffect(() => { setMobileMenuOpen(false); setDropdownOpen(false); }, [location.pathname]);

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
    await logout();
    navigate("/login");
  };

  const isActive = (to) => location.pathname === to;

  const avatarLetter = user?.displayName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "S";

  return (
    <header
      className={`nav-shell sticky top-0 z-50 transition-all duration-300 ${scrolled ? "shadow-lg shadow-black/5 dark:shadow-black/30" : ""
        }`}
    >
      <div className="mx-auto max-w-7xl px-5 py-3.5 md:px-8">
        <div className="flex items-center gap-4">

          {/* ── Brand ─────────────────────────────────────────────────── */}
          <Link
            to="/"
            className="group flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <div className="relative h-8 w-8 overflow-hidden rounded-xl ring-1 ring-slate-200/60 dark:ring-white/10">
              <img src="/logoo.jpeg" alt="InternVue" className="h-full w-full object-cover" />
            </div>
            <span className="hidden font-extrabold tracking-tight text-slate-900 dark:text-white sm:block">
              Intern<span className="text-blue-600 dark:text-blue-400">Vue</span>
            </span>
          </Link>

          {/* ── Desktop Nav Links ──────────────────────────────────────── */}
          <nav className="ml-8 hidden items-center gap-1 md:flex">
            {NAV_LINKS.filter((l) => !l.auth || isAuthenticated).map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`relative rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${isActive(link.to)
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                  }`}
              >
                {link.label}
                {isActive(link.to) && (
                  <motion.div
                    layoutId="navActiveIndicator"
                    className="absolute inset-0 rounded-xl bg-blue-500/10 dark:bg-blue-400/10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </nav>

          {/* ── Right Controls ─────────────────────────────────────────── */}
          <div className="ml-auto flex items-center gap-2">

            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="theme-toggle h-9 w-9"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={isDark ? "sun" : "moon"}
                  initial={{ opacity: 0, rotate: -30, scale: 0.7 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 30, scale: 0.7 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center justify-center"
                >
                  {isDark ? <SunIcon /> : <MoonIcon />}
                </motion.span>
              </AnimatePresence>
            </button>

            {/* Loading spinner */}
            {loading && (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            )}

            {/* Unauthenticated */}
            {!loading && !isAuthenticated && (
              <div className="hidden items-center gap-2 md:flex">
                <Link to="/login" className="btn-secondary px-4 py-2 text-sm">Sign In</Link>
                <Link to="/register" className="btn-primary  px-5 py-2 text-sm shadow-md shadow-blue-500/20">Get Started</Link>
              </div>
            )}

            {/* Authenticated avatar dropdown */}
            {user && (
              <div className="relative hidden md:block" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="flex items-center gap-2.5 rounded-2xl border border-slate-200/70 bg-white/70 px-3 py-1.5 text-sm font-semibold text-slate-900 backdrop-blur-xl transition-all hover:border-slate-300 hover:shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-white/20"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || "User"} className="h-7 w-7 rounded-full object-cover ring-1 ring-white/20" />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-[11px] font-bold text-white">
                      {avatarLetter}
                    </div>
                  )}
                  <span className="max-w-[120px] truncate">{user.displayName || user.email}</span>
                  <motion.svg
                    animate={{ rotate: dropdownOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="h-3.5 w-3.5 text-slate-400"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </motion.svg>
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                      className="absolute right-0 top-[calc(100%+10px)] z-50 w-60 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/90 shadow-2xl shadow-slate-200/60 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-900/90 dark:shadow-black/50"
                    >
                      {/* User info header */}
                      <div className="border-b border-slate-100 px-4 py-3.5 dark:border-white/5">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{user.displayName || "Student"}</p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                      </div>

                      {/* Menu items */}
                      <div className="p-2">
                        {[
                          { to: "/dashboard", label: "Dashboard", icon: "⚡" },
                          { to: "/feed", label: "Browse Jobs", icon: "🔍" },
                        ].map((item) => (
                          <Link
                            key={item.to}
                            to={item.to}
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"
                          >
                            <span className="text-base">{item.icon}</span>
                            {item.label}
                          </Link>
                        ))}

                        <div className="my-1.5 border-t border-slate-100 dark:border-white/5" />

                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-500 transition-all hover:bg-red-50 dark:hover:bg-red-500/10"
                        >
                          <span className="text-base">↩</span>
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="theme-toggle h-9 w-9 md:hidden"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={mobileMenuOpen ? "close" : "menu"}
                  initial={{ opacity: 0, rotate: -45 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 45 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center justify-center"
                >
                  {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* ── SearchBar (Feed page only) ──────────────────────────────── */}
        {onSearch && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <SearchBar onSearch={onSearch} />
          </motion.div>
        )}

        {/* ── Mobile Drawer ───────────────────────────────────────────── */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="mt-3 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/90 p-3 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-900/90 md:hidden"
            >
              <nav className="space-y-1">
                {NAV_LINKS.filter((l) => !l.auth || isAuthenticated).map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`block rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${isActive(link.to)
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"
                      }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="my-2 border-t border-slate-100 dark:border-white/5" />

              {/* Theme toggle row */}
              <button
                type="button"
                onClick={toggleTheme}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"
              >
                {isDark ? <SunIcon /> : <MoonIcon />}
                <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
              </button>

              {/* Auth actions */}
              {!loading && !isAuthenticated && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Link to="/login" className="btn-secondary py-2.5 text-sm" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
                  <Link to="/register" className="btn-primary  py-2.5 text-sm" onClick={() => setMobileMenuOpen(false)}>Get Started</Link>
                </div>
              )}

              {user && (
                <>
                  <div className="my-2 border-t border-slate-100 dark:border-white/5" />
                  <div className="flex items-center gap-3 px-4 py-2">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || "User"} className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
                        {avatarLetter}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{user.displayName || "Student"}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-1 w-full rounded-xl bg-red-50 px-4 py-2.5 text-left text-sm font-semibold text-red-500 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20"
                  >
                    Sign Out
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
