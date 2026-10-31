import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";

export default function AdminRoute() {
    const { isAuthenticated, user, userLoaded } = useAuthStore();

    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (!userLoaded) {
        return (
            <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
                Checking administrator access...
            </div>
        );
    }
    if (!user) return <Navigate to="/login" replace />;
    if (!user.email_verified_at) return <Navigate to="/verify-email" replace />;

    const isAdmin = user.roles?.some((role) => role.name === "admin");
    return isAdmin ? <Outlet /> : <Navigate to="/products" replace />;
}
