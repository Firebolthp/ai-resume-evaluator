import { Navigate, Outlet } from "react-router";
import { usePuterStore } from "~/lib/puter";

export default function AuthGuard() {
  const { puterReady, isLoading, auth } = usePuterStore();

  // Still initializing Puter
  if (!puterReady || isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  // Not authenticated → redirect
  if (!auth.isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
}
