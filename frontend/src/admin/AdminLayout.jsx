import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
    Boxes,
    LayoutDashboard,
    LogOut,
    MessageCircleQuestion,
    Package,
    Settings,
    ShoppingCart,
    Users,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

const navigation = [
    { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/admin/products", label: "Products", icon: Package },
    { to: "/admin/categories", label: "Categories", icon: Boxes },
    { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
    { to: "/admin/questions", label: "Questions", icon: MessageCircleQuestion },
    { to: "/admin/users", label: "Customers", icon: Users },
    { to: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout() {
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    return (
        <div className="min-h-screen bg-muted/40 lg:flex">
            <aside className="border-b border-border bg-card lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
                <div className="flex items-center justify-between px-5 py-5 lg:block">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                            PonnoKini
                        </p>
                        <h1 className="mt-1 text-lg font-bold">Admin workspace</h1>
                    </div>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted lg:hidden"
                    >
                        <LogOut className="size-4" />
                        Sign out
                    </button>
                </div>
                <nav
                    aria-label="Admin navigation"
                    className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:px-3"
                >
                    {navigation.map(({ to, label, icon: Icon, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            className={({ isActive }) =>
                                `flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                                    isActive
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`
                            }
                        >
                            <Icon className="size-4" />
                            {label}
                        </NavLink>
                    ))}
                </nav>
                <div className="hidden border-t border-border px-5 py-4 lg:absolute lg:right-0 lg:bottom-0 lg:left-0 lg:block">
                    <p className="truncate text-sm font-medium">{user?.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                        <LogOut className="size-4" />
                        Sign out
                    </button>
                </div>
            </aside>
            <div className="min-w-0 flex-1">
                <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
