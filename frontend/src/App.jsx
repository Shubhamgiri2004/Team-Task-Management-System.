/**
 * Routes:
 * - Portal home / separate Admin & Member auth
 * - Signup (members only, enforced by API)
 * - Dashboard, Project, Tasks (protected)
 */
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { GuestRoute } from "./components/GuestRoute";
import { AppLayout } from "./components/AppLayout";
import PortalHome from "./pages/PortalHome";
import LoginAdmin from "./pages/LoginAdmin";
import LoginMember from "./pages/LoginMember";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import ProjectPage from "./pages/ProjectPage";
import TasksPage from "./pages/TasksPage";

function HomeGate() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <PortalHome />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeGate />} />
          <Route path="/login" element={<Navigate to="/member/login" replace />} />
          <Route
            path="/admin/login"
            element={
              <GuestRoute>
                <LoginAdmin />
              </GuestRoute>
            }
          />
          <Route
            path="/member/login"
            element={
              <GuestRoute>
                <LoginMember />
              </GuestRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <GuestRoute>
                <Signup />
              </GuestRoute>
            }
          />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects/:projectId" element={<ProjectPage />} />
            <Route path="/tasks" element={<TasksPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
