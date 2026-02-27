import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider, githubProvider } from "../firebase/firebase";
import { useAuthContext } from "../context/AuthContext";
import axiosInstance from "../api/axiosInstance";
import Navbar from "../components/Navbar";

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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

export default function RegisterPage() {
  const navigate = useNavigate();
  const { registerWithEmail, error, clearError } = useAuthContext();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [socialError, setSocialError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  const isSocialLoading = loadingProvider !== null;
  const disableAllButtons = isSocialLoading || isLoading;

  const validate = () => {
    const nextErrors = {};
    if (displayName.trim().length < 2) nextErrors.displayName = "Display name must be at least 2 characters.";
    if (!validateEmail(email)) nextErrors.email = "Please enter a valid email address.";
    if (password.length < 6) nextErrors.password = "Password must be at least 6 characters.";
    if (confirmPassword !== password) nextErrors.confirmPassword = "Passwords do not match.";
    setValidationErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSocialSignup = async (providerName, provider) => {
    clearError();
    setSocialError("");
    setLoadingProvider(providerName);

    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      const idToken = await firebaseUser.getIdToken();

      await axiosInstance.post(
        "/api/auth/social-signup",
        {
          name: firebaseUser.displayName || "",
          email: firebaseUser.email || "",
          photoURL: firebaseUser.photoURL || "",
          firebaseUid: firebaseUser.uid,
          provider: providerName,
        },
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      const message = requestError.response?.data?.error || requestError.message || "Social signup failed.";
      setSocialError(message);
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    clearError();
    setSocialError("");

    if (!validate()) return;

    setIsLoading(true);
    try {
      await registerWithEmail(email, password, displayName);
      navigate("/dashboard", { replace: true });
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="app-bg">
      <Navbar />
      <div className="mx-auto w-full max-w-md p-4 md:p-8">
        <div className="section-shell p-6 shadow-2xl md:p-8">
          <p className="font-display text-xl font-bold text-blue-500 md:text-2xl">InternVue</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-slate-900 dark:text-white md:text-3xl">Create your account</h1>

          {socialError ? (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-400">
              <span>!</span>
              <span>{socialError}</span>
              <button onClick={() => setSocialError("")} className="ml-auto text-red-600 hover:text-red-400">
                x
              </button>
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-400">
              <span>!</span>
              <span>{error}</span>
              <button onClick={clearError} className="ml-auto text-red-600 hover:text-red-400">
                x
              </button>
            </div>
          ) : null}

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => handleSocialSignup("google", googleProvider)}
              disabled={disableAllButtons}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 disabled:opacity-60 md:text-base"
            >
              {loadingProvider === "google" ? <Spinner /> : <GoogleIcon />}
              Continue with Google
            </button>

            <button
              type="button"
              onClick={() => handleSocialSignup("github", githubProvider)}
              disabled={disableAllButtons}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60 md:text-base"
            >
              {loadingProvider === "github" ? <Spinner /> : <GithubIcon />}
              Continue with GitHub
            </button>
          </div>

          <div className="my-5 flex items-center gap-3 text-xs text-zinc-500">
            <div className="h-px flex-1 bg-zinc-800" />
            <span>--- or ---</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <input
                type="text"
                placeholder="Display name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-blue-500"
                required
              />
              {validationErrors.displayName ? (
                <p className="mt-1 text-xs text-red-400">{validationErrors.displayName}</p>
              ) : null}
            </div>

            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-blue-500"
                required
              />
              {validationErrors.email ? (
                <p className="mt-1 text-xs text-red-400">{validationErrors.email}</p>
              ) : null}
            </div>

            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-blue-500"
                required
              />
              {validationErrors.password ? (
                <p className="mt-1 text-xs text-red-400">{validationErrors.password}</p>
              ) : null}
            </div>

            <div>
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-blue-500"
                required
              />
              {validationErrors.confirmPassword ? (
                <p className="mt-1 text-xs text-red-400">{validationErrors.confirmPassword}</p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={disableAllButtons}
              className="glow-blue-sm w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-500 disabled:opacity-60 md:text-base"
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="mt-5 text-sm text-zinc-400">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-400 hover:text-blue-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
