import { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, googleProvider, githubProvider } from "../firebase/firebase";
import axiosInstance from "../api/axiosInstance";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [mongoUser, setMongoUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        try {
          const idToken = await firebaseUser.getIdToken();
          const syncResponse = await axiosInstance.post(
            "/api/auth/sync",
            {
              name: firebaseUser.displayName,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
              firebaseUid: firebaseUser.uid,
            },
            {
              headers: { Authorization: `Bearer ${idToken}` },
            }
          );

          setMongoUser(syncResponse.data?.user || null);
        } catch (syncErr) {
          console.warn("MongoDB sync failed (non-fatal):", syncErr.message);
        }
      } else {
        setUser(null);
        setMongoUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (err) {
      setError(getFirebaseErrorMessage(err.code));
      throw err;
    }
  };

  const signInWithGithub = async () => {
    setError(null);
    try {
      const result = await signInWithPopup(auth, githubProvider);
      return result.user;
    } catch (err) {
      if (err.code === "auth/account-exists-with-different-credential") {
        setError("An account already exists with this email using a different login method.");
      } else {
        setError(getFirebaseErrorMessage(err.code));
      }
      throw err;
    }
  };

  const signInWithEmail = async (email, password) => {
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (err) {
      setError(getFirebaseErrorMessage(err.code));
      throw err;
    }
  };

  const registerWithEmail = async (email, password, displayName) => {
    setError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });
      return result.user;
    } catch (err) {
      setError(getFirebaseErrorMessage(err.code));
      throw err;
    }
  };

  const logout = async () => {
    setError(null);
    try {
      await signOut(auth);
      setUser(null);
      setMongoUser(null);
    } catch (err) {
      setError(getFirebaseErrorMessage(err.code));
    }
  };

  const resetPassword = async (email) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      setError(getFirebaseErrorMessage(err.code));
      throw err;
    }
  };

  const getIdToken = async () => {
    if (!user) return null;
    return user.getIdToken();
  };

  return {
    user,
    mongoUser,
    loading,
    error,
    isAuthenticated: !!user,
    signInWithGoogle,
    signInWithGithub,
    signInWithEmail,
    registerWithEmail,
    logout,
    resetPassword,
    getIdToken,
    clearError: () => setError(null),
    refreshProfile: async () => {
      if (!auth.currentUser) return null;
      const response = await axiosInstance.get("/api/auth/me");
      setMongoUser(response.data?.user || null);
      return response.data?.user || null;
    },
  };
}

function getFirebaseErrorMessage(code) {
  const messages = {
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Try again.",
    "auth/email-already-in-use": "This email is already registered.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/popup-closed-by-user": "Sign-in cancelled. Please try again.",
    "auth/popup-blocked": "Popup blocked. Please allow popups for this site.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/invalid-credential": "Invalid credentials. Please check and try again.",
    "auth/cancelled-popup-request": "Only one sign-in popup at a time.",
  };
  return messages[code] || `Authentication error: ${code}`;
}
