import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const Spinner = () => (
  <svg className="h-4 w-4 animate-spin text-current" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.3" strokeWidth="4" />
    <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4">
    <path
      d="M23.49 12.27c0-.79-.07-1.55-.21-2.27H12v4.3h6.45a5.53 5.53 0 0 1-2.39 3.63v3.01h3.87c2.27-2.09 3.56-5.18 3.56-8.67Z"
      fill="#4285F4"
    />
    <path
      d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.87-3.01c-1.07.72-2.45 1.14-4.07 1.14-3.13 0-5.79-2.11-6.74-4.95H1.27v3.11A12 12 0 0 0 12 24Z"
      fill="#34A853"
    />
    <path
      d="M5.26 14.28A7.19 7.19 0 0 1 4.88 12c0-.79.14-1.55.38-2.28V6.61H1.27A12 12 0 0 0 0 12c0 1.93.46 3.75 1.27 5.39l3.99-3.11Z"
      fill="#FBBC05"
    />
    <path
      d="M12 4.77c1.76 0 3.34.61 4.59 1.81l3.44-3.44C17.94 1.17 15.24 0 12 0A12 12 0 0 0 1.27 6.61l3.99 3.11c.95-2.84 3.61-4.95 6.74-4.95Z"
      fill="#EA4335"
    />
  </svg>
);

const GithubIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
    <path d="M12 .5A12 12 0 0 0 8.2 23.9c.6.1.8-.3.8-.6v-2.1c-3.4.7-4.1-1.6-4.1-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.2-.8.1-.8.1-.8 1.3.1 2 .9 2 .9 1.2 2 3.1 1.4 3.8 1.1.1-.9.5-1.4.9-1.7-2.7-.3-5.5-1.3-5.5-6A4.7 4.7 0 0 1 6 7.1 4.4 4.4 0 0 1 6.1 4s1-.3 3.3 1.2a11.7 11.7 0 0 1 6 0C17.7 3.7 18.7 4 18.7 4a4.4 4.4 0 0 1 .1 3.1 4.7 4.7 0 0 1 1.2 3.3c0 4.7-2.8 5.7-5.5 6 .5.4.9 1.2.9 2.3v3.5c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z" />
  </svg>
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const {
    signInWithGoogle,
    signInWithGithub,
    signInWithEmail,
    resetPassword,
    error,
    clearError,
  } = useAuthContext();

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/dashboard";
  const isBusy = loadingProvider !== null;

  const runLogin = async (provider, action) => {
    setLoadingProvider(provider);
    clearError();
    try {
      await action();
      navigate(from, { replace: true });
    } catch {
    } finally {
      setLoadingProvider(null);
    }
  };

  const onEmailSubmit = async (event) => {
    event.preventDefault();
    await runLogin("email", () => signInWithEmail(email, password));
  };

  const onResetSubmit = async (event) => {
    event.preventDefault();
    setLoadingProvider("reset");
    clearError();
    try {
      await resetPassword(resetEmail);
      setResetSent(true);
    } catch {
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <main className="app-bg">
      <Navbar />
      <div className="mx-auto w-full max-w-md p-4 md:p-8">
        <div className="section-shell p-6 shadow-2xl md:p-8">
          <p className="font-display text-xl font-bold text-blue-500 md:text-2xl">InternVue</p>
          <h1 className="text-main mt-2 font-display text-2xl font-semibold md:text-3xl">Sign in to InternVue</h1>

        {error ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-400">
            <span>!</span>
            <span>{error}</span>
            <button onClick={clearError} className="ml-auto text-red-600 hover:text-red-400">
              x
            </button>
          </div>
        ) : null}

        {showReset ? (
          <form onSubmit={onResetSubmit} className="mt-6 space-y-4">
            <input
              type="email"
              value={resetEmail}
              onChange={(event) => setResetEmail(event.target.value)}
              placeholder="Enter your account email"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-blue-500"
              required
            />
            <button
              type="submit"
              disabled={isBusy}
              className="w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60 md:text-base"
            >
              {loadingProvider === "reset" ? "Sending..." : "Send Reset Link"}
            </button>
            {resetSent ? (
              <p className="rounded-xl border border-emerald-800 bg-emerald-950 px-4 py-2 text-sm text-emerald-400">
                Check your inbox for a password reset link
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setShowReset(false);
                setResetSent(false);
              }}
              className="text-sm text-zinc-400 underline"
            >
              Back to login
            </button>
          </form>
        ) : (
          <>
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => runLogin("google", signInWithGoogle)}
                disabled={isBusy}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-60 md:text-base"
              >
                {loadingProvider === "google" ? <Spinner /> : <GoogleIcon />}
                Continue with Google
              </button>

              <button
                type="button"
                onClick={() => runLogin("github", signInWithGithub)}
                disabled={isBusy}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-700 bg-zinc-800 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60 md:text-base"
              >
                {loadingProvider === "github" ? <Spinner /> : <GithubIcon />}
                Continue with GitHub
              </button>
            </div>

            <div className="my-5 flex items-center gap-3 text-xs text-zinc-500">
              <div className="h-px flex-1 bg-zinc-800" />
              <span>or continue with email</span>
              <div className="h-px flex-1 bg-zinc-800" />
            </div>

            <form onSubmit={onEmailSubmit} className="space-y-3">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-blue-500"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-blue-500"
                required
              />
              <button
                type="submit"
                disabled={isBusy}
                className="glow-blue-sm w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-500 disabled:opacity-60 md:text-base"
              >
                {loadingProvider === "email" ? "Signing in..." : "Sign In with Email"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setShowReset(true)}
              className="mt-3 text-sm text-zinc-400 underline"
            >
              Forgot password?
            </button>
          </>
        )}

          <p className="mt-5 text-sm text-zinc-400">
            Don't have an account?{" "}
            <Link to="/register" className="text-blue-400 hover:text-blue-300">
              Register
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
