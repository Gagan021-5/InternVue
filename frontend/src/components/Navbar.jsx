import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SearchBar from "./SearchBar";
import { useAuthContext } from "../context/AuthContext";
import { useThemeContext } from "../context/ThemeContext";

const SunIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

export default function Navbar({ onSearch }) {
  const { user, logout, loading, isAuthenticated } = useAuthContext();
  const { isDark, toggleTheme } = useThemeContext();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClickOutside = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    window.addEventListener("click", onClickOutside);
    return () => window.removeEventListener("click", onClickOutside);
  }, []);

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
    await logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/50 dark:border-white/5 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl transition-colors duration-500">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="font-display text-2xl font-extrabold tracking-tight text-blue-600 dark:text-blue-500 hover:opacity-80 transition-opacity">
            InternVue<span className="text-slate-800 dark:text-white">.</span>
          </Link>

          <button
            type="button"
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-slate-700 dark:text-white backdrop-blur-md md:hidden"
            onClick={() => setMobileMenuOpen((current) => !current)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>

          <div className="hidden items-center gap-4 md:flex">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-slate-700 dark:text-white shadow-sm transition-all hover:scale-105 hover:bg-white dark:hover:bg-white/10"
              aria-label="Toggle dark and light mode"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>

            {loading ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            ) : null}

            {!loading && !isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link to="/login" className="px-5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Sign In
                </Link>
                <Link to="/register" className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-blue-500/40">
                  Get Started
                </Link>
              </div>
            ) : null}

            {user ? (
              <div className="relative ml-2" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((current) => !current)}
                  className="flex items-center gap-3 rounded-full border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 p-1.5 pr-4 text-sm font-semibold text-slate-700 dark:text-white shadow-sm transition-all hover:bg-white dark:hover:bg-white/10 focus:ring-2 focus:ring-blue-500/50"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "User"}
                      className="h-8 w-8 rounded-full object-cover shadow-sm"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-display text-xs font-bold text-white shadow-sm">
                      {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="max-w-[120px] truncate">
                    {user.displayName || user.email}
                  </span>
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen ? (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-zinc-900/95 shadow-xl backdrop-blur-xl transition-all">
                    <div className="border-b border-slate-100 dark:border-zinc-800 px-5 py-4">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{user.displayName || "Student"}</p>
                      <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{user.email}</p>
                    </div>
                    <div className="p-2">
                      <Link
                        to="/dashboard"
                        className="block rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <Link
                        to="/feed"
                        className="block rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Browse Jobs
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="mt-1 block w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {onSearch ? (
          <div className="mt-3">
            <SearchBar onSearch={onSearch} />
          </div>
        ) : null}

        {mobileMenuOpen ? (
          <div className="section-shell mt-3 space-y-2 p-3 md:hidden">
            <button
              type="button"
              onClick={toggleTheme}
              className="theme-toggle inline-flex w-full items-center justify-center gap-2 px-3 py-2 text-sm"
              aria-label="Toggle dark and light mode"
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
              <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
            </button>

            {loading ? (
              <div className="flex justify-center py-1">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              </div>
            ) : null}

            {!loading && !isAuthenticated ? (
              <>
                <Link
                  to="/login"
                  className="btn-secondary block w-full px-3 py-2 text-center text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="btn-primary block w-full px-3 py-2 text-center text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get Started -&gt;
                </Link>
              </>
            ) : null}

            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="btn-secondary block w-full px-3 py-2 text-center text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/feed"
                  className="btn-secondary block w-full px-3 py-2 text-center text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Browse Jobs
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full rounded-xl border border-red-900 bg-red-950 px-3 py-2 text-sm font-semibold text-red-300"
                >
                  Sign Out
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
