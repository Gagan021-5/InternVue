import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import FeedPage from "./pages/FeedPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import JobDetailsPage from "./pages/JobDetailsPage";
import FloatingChatbot from "./components/FloatingChatbot";
import { useAuthContext } from "./context/AuthContext";

import ErrorBoundary from "./components/ErrorBoundary";

const DashboardRouter = () => {
  const { mongoUser } = useAuthContext();
  if (mongoUser?.role === "admin") {
    return <AdminDashboard />;
  }
  return <StudentDashboard />;
};

export default function App() {
  const { mongoUser } = useAuthContext();

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/feed"
          element={
            <ProtectedRoute>
              <FeedPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/job/:id"
          element={
            <ProtectedRoute>
              <JobDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardRouter />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {mongoUser && mongoUser.role === "student" && <FloatingChatbot />}
    </ErrorBoundary>
  );
}
