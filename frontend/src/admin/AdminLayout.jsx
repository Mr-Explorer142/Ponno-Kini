import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
    Bell,
    Boxes,
    CreditCard,
    LayoutDashboard,
    LogOut,
    MessageCircleQuestion,
    Package,
    Settings,
    ShoppingCart,
    Users,
} from "lucide-react";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/api/axios";
import { playNotificationSound } from "@/lib/notificationSound";

const navigation = [
    { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/admin/products", label: "Products", icon: Package },
    { to: "/admin/categories", label: "Categories", icon: Boxes },
    { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
    { to: "/admin/payments", label: "Payments", icon: CreditCard },
    { to: "/admin/questions", label: "Questions", icon: MessageCircleQuestion },
    { to: "/admin/users", label: "Users", icon: Users },
];
const activityNavigation = [
    { to: "/admin/notifications", label: "Notifications", icon: Bell },
];

export default function AdminLayout() {
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const navigate = useNavigate();
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [notificationError, setNotificationError] = useState("");
    const knownNotificationIds = useRef(new Set());
    const hasLoadedNotifications = useRef(false);

    useEffect(() => {
        let active = true;
        const loadUnreadCount = async () => {
            try {
                const response = await api.get("/notifications");
                if (active) {
                    const notifications = response.data.notifications ?? [];
                    const hasNewUnread =
                        hasLoadedNotifications.current &&
                        notifications.some(
                            (notification) =>
                                !notification.read_at &&
                                !knownNotificationIds.current.has(
                                    notification.id,
                                ),
                        );

                    if (
                        hasNewUnread &&
                        localStorage.getItem(
                            "ponno-kini-notification-sound",
                        ) !== "off"
                    ) {
                        void playNotificationSound();
                    }

                    notifications.forEach((notification) =>
                        knownNotificationIds.current.add(notification.id),
                    );
                    hasLoadedNotifications.current = true;
                    setUnreadNotifications(response.data.unread_count ?? 0);
                    setNotificationError("");
                }
            } catch (requestError) {
                if (active) {
                    setNotificationError(
                        requestError.response?.data?.message ||
                            "Notification count could not be loaded.",
                    );
                }
            }
        };

        const initialLoad = window.setTimeout(() => void loadUnreadCount(), 0);
        const interval = window.setInterval(
            () => void loadUnreadCount(),
            30000,
        );
        return () => {
            active = false;
            window.clearTimeout(initialLoad);
            window.clearInterval(interval);
        };
    }, []);

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
                        <h1 className="mt-1 text-lg font-bold">
                            Admin workspace
                        </h1>
                        <div className="mt-3 flex items-center gap-2 lg:hidden">
                            <Avatar className="size-8">
                                <AvatarImage
                                    src={user?.avatar ?? undefined}
                                    alt={user?.name ?? "Admin"}
                                />
                                <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
                                    {user?.name
                                        ?.split(/\s+/)
                                        .filter(Boolean)
                                        .slice(0, 2)
                                        .map((part) => part[0]?.toUpperCase())
                                        .join("") || "A"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                    {user?.name}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {user?.email}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 lg:hidden">
                        <NavLink
                            to="/admin/settings"
                            aria-label="Settings"
                            title="Settings"
                            className={({ isActive }) =>
                                `inline-flex size-9 items-center justify-center rounded-lg ${
                                    isActive
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`
                            }
                        >
                            <Settings className="size-4" />
                        </NavLink>
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="cursor-pointer inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                        >
                            <LogOut className="size-4" />
                            Sign out
                        </button>
                    </div>
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
                <section className="border-t border-border px-3 py-3 lg:mt-3">
                    <h2 className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Updates
                    </h2>
                    <nav aria-label="Admin updates" className="space-y-1">
                        {activityNavigation.map(({ to, label, icon: Icon }) => (
                            <NavLink
                                key={to}
                                to={to}
                                aria-label={`${label}, ${unreadNotifications} unread`}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                                        isActive
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    }`
                                }
                            >
                                <Icon className="size-4" />
                                <span className="flex-1">{label}</span>
                                {unreadNotifications > 0 && (
                                    <span className="flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] leading-none text-destructive-foreground">
                                        {unreadNotifications > 99
                                            ? "99+"
                                            : unreadNotifications}
                                    </span>
                                )}
                            </NavLink>
                        ))}
                    </nav>
                    {notificationError && (
                        <p
                            role="alert"
                            className="px-3 pt-2 text-xs text-destructive"
                        >
                            {notificationError}
                        </p>
                    )}
                </section>
                <div className="hidden border-t border-border px-5 py-4 lg:absolute lg:right-0 lg:bottom-0 lg:left-0 lg:block">
                    <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="size-9">
                            <AvatarImage
                                src={user?.avatar ?? undefined}
                                alt={user?.name ?? "Admin"}
                            />
                            <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
                                {user?.name
                                    ?.split(/\s+/)
                                    .filter(Boolean)
                                    .slice(0, 2)
                                    .map((part) => part[0]?.toUpperCase())
                                    .join("") || "A"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                                {user?.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                                {user?.email}
                            </p>
                        </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                        <NavLink
                            to="/admin/settings"
                            className={({ isActive }) =>
                                `inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                                    isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`
                            }
                        >
                            <Settings className="size-4" />
                            Settings
                        </NavLink>
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="cursor-pointer inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                            <LogOut className="size-4" />
                            Sign out
                        </button>
                    </div>
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
