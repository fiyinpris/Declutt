import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isAdminUser } from "../utils/admin";

const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, profile } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  // Admin pages: role "admin" or the verified owner account. The database rules make the
  // same check, so this only decides what to show.
  const allowed =
    allowedRole === "admin"
      ? isAdminUser(user, profile)
      : !allowedRole || profile?.role === allowedRole;
  if (!allowed) return <Navigate to="/" replace />;

  return children;
};

export default ProtectedRoute;
