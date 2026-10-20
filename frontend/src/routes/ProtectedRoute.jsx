import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore.js";

const ProtectedRoute = () => {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
