import { Link, useNavigate } from "react-router-dom";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";

export default function Navbar() {
    const { isAuthenticated, user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    return (
        <header className="border-b border-orange-200 bg-white shadow-sm">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
                <Link to="/" className="text-xl font-bold text-primary">
                    PonnoKini
                </Link>

                <nav className="flex items-center gap-2">
                    <Button asChild variant="ghost">
                        <Link to="/products">Catalog</Link>
                    </Button>

                    {isAuthenticated ? (
                        <>
                            <Button asChild variant="ghost">
                                <Link to="/profile">
                                    <User />
                                    <span className="max-w-32 truncate">
                                        {user?.name ?? "Profile"}
                                    </span>
                                </Link>
                            </Button>
                            <Button variant="outline" onClick={handleLogout}>
                                Logout
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button asChild variant="ghost">
                                <Link to="/login">Log in</Link>
                            </Button>
                            <Button asChild>
                                <Link to="/register">Sign Up</Link>
                            </Button>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
}
