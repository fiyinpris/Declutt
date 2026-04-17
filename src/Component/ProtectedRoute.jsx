import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, profile } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && profile?.role !== allowedRole)
    return <Navigate to="/" replace />;

  return children;
};

export default ProtectedRoute;
