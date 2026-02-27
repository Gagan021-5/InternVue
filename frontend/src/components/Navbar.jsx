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
    <header className="nav-shell sticky top-0 z-40">
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="inline-flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-blue-600">
            <img
              src="/logoo.jpeg"
              alt="InternVue logo"
              className="h-8 w-8 rounded-lg object-cover ring-1 ring-slate-200/60 dark:ring-white/20"
            />
            <span>
              InternVue<span className="text-main">.</span>
            </span>
          </Link>

          <button
            type="button"
            className="btn-secondary ml-auto block px-3 py-1.5 text-sm md:hidden"
            onClick={() => setMobileMenuOpen((current) => !current)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? "Close" : "Menu"}
          </button>

          <div className="ml-auto hidden items-center gap-3 md:flex">
            <button
              type="button"
              onClick={toggleTheme}
              className="theme-toggle inline-flex h-10 w-10 items-center justify-center"
              aria-label="Toggle dark and light mode"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>

            {loading ? <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /> : null}

            {!loading && !isAuthenticated ? (
              <>
                <Link to="/login" className="btn-secondary px-4 py-2 text-sm">
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary px-5 py-2 text-sm">
                  Get Started
                </Link>
              </>
            ) : null}

            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((current) => !current)}
                  className="btn-secondary flex items-center gap-2 px-3 py-1.5"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || "User"} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="max-w-[140px] truncate text-sm font-semibold text-main">{user.displayName || user.email}</span>
                  <span className="text-xs text-muted">v</span>
                </button>

                {dropdownOpen ? (
                  <div className="section-shell absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden">
                    <div className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                      <p className="truncate text-sm font-semibold text-main">{user.displayName || "Student"}</p>
                      <p className="truncate text-xs text-muted">{user.email}</p>
                    </div>
                    <div className="p-2">
                      <Link
                        to="/dashboard"
                        className="block rounded-lg px-3 py-2 text-sm text-soft hover:surface-soft"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <Link
                        to="/feed"
                        className="block rounded-lg px-3 py-2 text-sm text-soft hover:surface-soft"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Browse Jobs
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50"
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
          <div className="mt-4">
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
                <Link to="/login" className="btn-secondary block w-full px-3 py-2 text-center text-sm" onClick={() => setMobileMenuOpen(false)}>
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary block w-full px-3 py-2 text-center text-sm" onClick={() => setMobileMenuOpen(false)}>
                  Get Started
                </Link>
              </>
            ) : null}

            {user ? (
              <>
                <Link to="/dashboard" className="btn-secondary block w-full px-3 py-2 text-center text-sm" onClick={() => setMobileMenuOpen(false)}>
                  Dashboard
                </Link>
                <Link to="/feed" className="btn-secondary block w-full px-3 py-2 text-center text-sm" onClick={() => setMobileMenuOpen(false)}>
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
