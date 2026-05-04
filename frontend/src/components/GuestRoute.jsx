import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/** Redirect authenticated users away from login/signup screens */
export function GuestRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
