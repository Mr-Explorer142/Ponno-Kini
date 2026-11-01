import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";

export default function AdminRoute() {
    const user = useAuthStore((state) => state.user);

    if (!user) {
        return (
            <div className="grid min-h-screen place-items-center">
                <div
                    className="h-8 w-40 animate-pulse rounded-md bg-muted"
                    aria-label="Loading administrator access"
                />
            </div>
        );
    }

    const isAdmin = user.roles?.some((role) =>
        typeof role === "string" ? role === "admin" : role?.name === "admin",
    );

    return isAdmin ? <Outlet /> : <Navigate to="/" replace />;
}
