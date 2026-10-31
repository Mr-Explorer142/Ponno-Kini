import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    LogOut,
    Menu,
    Moon,
    ShoppingBag,
    ShoppingCart,
    Sun,
    User,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";
import { useCartStore } from "@/store/useCartStore";
import { t } from "@/i18n";

function ThemeToggle({ theme, onToggleTheme, showLabel = false }) {
    const isDark = theme === "dark";
    const Icon = isDark ? Sun : Moon;
    const label = t(isDark ? "Switch to light mode" : "Switch to dark mode");

    return (
        <Button
            type="button"
            variant="ghost"
            size={showLabel ? "default" : "icon"}
            className={showLabel ? "justify-start" : ""}
            aria-label={label}
            aria-pressed={isDark}
            title={label}
            onClick={onToggleTheme}
        >
            <Icon aria-hidden="true" />
            {showLabel && t(isDark ? "Light mode" : "Dark mode")}
        </Button>
    );
}

export default function Navbar({ theme, onToggleTheme }) {
    const { isAuthenticated, user, logout } = useAuthStore();
    const cartCount = useCartStore((state) =>
        state.items.reduce((total, item) => total + item.quantity, 0),
    );
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [accountMenuOpen, setAccountMenuOpen] = useState(false);
    const menuButtonRef = useRef(null);
    const closeButtonRef = useRef(null);
    const drawerRef = useRef(null);

    useEffect(() => {
        if (!menuOpen) return;

        const previousOverflow = document.body.style.overflow;
        const menuButton = menuButtonRef.current;
        document.body.style.overflow = "hidden";
        closeButtonRef.current?.focus();

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setAccountMenuOpen(false);
                setMenuOpen(false);
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = previousOverflow;
            menuButton?.focus();
        };
    }, [menuOpen]);

    const handleLogout = async () => {
        await logout();
        setMenuOpen(false);
        setAccountMenuOpen(false);
        navigate("/login");
    };

    const handleDrawerKeyDown = (event) => {
        if (event.key !== "Tab") return;

        const focusableElements = drawerRef.current?.querySelectorAll(
            "a[href], button:not([disabled])",
        );
        if (!focusableElements?.length) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
        }
    };

    return (
        <header className="border-b border-border bg-background shadow-sm">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
                <Link to="/" className="text-xl font-bold text-primary inline-flex items-center gap-2">
                    <ShoppingBag className="size-5" aria-hidden="true" />
                    PonnoKini
                </Link>

                <nav className="hidden items-center gap-2 lg:flex">
                    <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
                    <Button asChild variant="ghost">
                        <Link
                            to="/cart"
                            className="inline-flex items-center gap-2"
                            aria-label={t("Cart, :count items", {
                                count: cartCount,
                            })}
                        >
                            <span className="relative">
                                <ShoppingCart aria-hidden="true" />
                                {cartCount > 0 && (
                                    <span className="absolute -top-2 -right-3 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                                        {cartCount > 99 ? "99+" : cartCount}
                                    </span>
                                )}
                            </span>
                            {t("Cart")}
                        </Link>
                    </Button>
                    <Button asChild variant="ghost">
                        <Link
                            to="/products"
                            className="inline-flex items-center gap-2"
                        >
                            <ShoppingBag aria-hidden="true" />
                            {t("Catalog")}
                        </Link>
                    </Button>

                    {isAuthenticated ? (
                        <>
                            <div className="relative">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="max-w-full"
                                    aria-expanded={accountMenuOpen}
                                    aria-haspopup="menu"
                                    onClick={() =>
                                        setAccountMenuOpen((open) => !open)
                                    }
                                >
                                    <User />
                                    <span className="break-all">
                                        {user?.name ?? t("Profile")}
                                    </span>
                                </Button>
                                {accountMenuOpen && (
                                    <div
                                        role="menu"
                                        aria-label={t("Account options")}
                                        className="absolute right-0 top-full z-20 mt-1 min-w-40 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
                                    >
                                        <Link
                                            role="menuitem"
                                            to="/profile"
                                            className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
                                            onClick={() =>
                                                setAccountMenuOpen(false)
                                            }
                                        >
                                            {t("Profile")}
                                        </Link>
                                        <Link
                                            role="menuitem"
                                            to="/orders"
                                            className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
                                            onClick={() =>
                                                setAccountMenuOpen(false)
                                            }
                                        >
                                            {t("Orders")}
                                        </Link>
                                    </div>
                                )}
                            </div>
                            <Button
                                className="cursor-pointer"
                                variant="outline"
                                onClick={handleLogout}
                            >
                                <LogOut aria-hidden="true" />
                                {t("Logout")}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button asChild variant="ghost">
                                <Link to="/login">{t("Log in")}</Link>
                            </Button>
                            <Button asChild>
                                <Link to="/register">{t("Sign Up")}</Link>
                            </Button>
                        </>
                    )}
                </nav>

                <div className="flex items-center gap-1 lg:hidden">
                    <Button asChild variant="ghost" size="icon">
                        <Link
                            to="/cart"
                            aria-label={t("Cart, :count items", {
                                count: cartCount,
                            })}
                        >
                            <span className="relative">
                                <ShoppingCart aria-hidden="true" />
                                {cartCount > 0 && (
                                    <span className="absolute -top-2 -right-3 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                                        {cartCount > 99 ? "99+" : cartCount}
                                    </span>
                                )}
                            </span>
                        </Link>
                    </Button>
                    <Button
                        ref={menuButtonRef}
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t("Open navigation menu")}
                        aria-expanded={menuOpen}
                        aria-controls="mobile-navigation"
                        onClick={() => setMenuOpen(true)}
                    >
                        <Menu aria-hidden="true" />
                    </Button>
                </div>
            </div>

            {menuOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <button
                        type="button"
                        aria-label={t("Close navigation menu")}
                        className="absolute inset-0 size-full cursor-pointer bg-black/40"
                        onClick={() => setMenuOpen(false)}
                    />
                    <nav
                        ref={drawerRef}
                        id="mobile-navigation"
                        role="dialog"
                        aria-modal="true"
                        aria-label={t("Navigation menu")}
                        onKeyDown={handleDrawerKeyDown}
                        className="absolute inset-y-0 right-0 flex w-[min(20rem,85vw)] flex-col gap-4 overflow-y-auto border-l border-border bg-background p-5 shadow-xl"
                    >
                        <div className="flex items-center justify-between border-b border-border pb-4">
                            <Link
                                to="/"
                                className="text-xl font-bold text-primary"
                                onClick={() => setMenuOpen(false)}
                            >
                                PonnoKini
                            </Link>
                            <Button
                                ref={closeButtonRef}
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={t("Close navigation menu")}
                                onClick={() => setMenuOpen(false)}
                            >
                                <X aria-hidden="true" />
                            </Button>
                        </div>

                        <div className="flex flex-col items-stretch gap-2">
                            <Button
                                asChild
                                variant="ghost"
                                className="justify-start"
                            >
                                <Link
                                    to="/cart"
                                    className="inline-flex items-center gap-2"
                                    onClick={() => setMenuOpen(false)}
                                >
                                    <ShoppingCart aria-hidden="true" />
                                    {t("Cart")} ({cartCount})
                                </Link>
                            </Button>
                            <ThemeToggle
                                theme={theme}
                                onToggleTheme={onToggleTheme}
                                showLabel
                            />
                            <Button
                                asChild
                                variant="ghost"
                                className="justify-start"
                            >
                                <Link
                                    to="/products"
                                    className="inline-flex items-center gap-2"
                                    onClick={() => setMenuOpen(false)}
                                >
                                    <ShoppingBag aria-hidden="true" />
                                    {t("Catalog")}
                                </Link>
                            </Button>

                            {isAuthenticated ? (
                                <>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="max-w-full justify-start"
                                        aria-expanded={accountMenuOpen}
                                        aria-haspopup="menu"
                                        onClick={() =>
                                            setAccountMenuOpen((open) => !open)
                                        }
                                    >
                                        <User aria-hidden="true" />
                                        <span className="break-all">
                                            {user?.name ?? "Profile"}
                                        </span>
                                    </Button>
                                    {accountMenuOpen && (
                                        <div
                                            role="menu"
                                            aria-label={t("Account options")}
                                            className="ml-4 flex flex-col border-l border-border pl-3"
                                        >
                                            <Link
                                                role="menuitem"
                                                to="/profile"
                                                className="rounded-md px-3 py-2 text-sm hover:bg-muted"
                                                onClick={() => {
                                                    setAccountMenuOpen(false);
                                                    setMenuOpen(false);
                                                }}
                                            >
                                                {t("Profile")}
                                            </Link>
                                            <Link
                                                role="menuitem"
                                                to="/orders"
                                                className="rounded-md px-3 py-2 text-sm hover:bg-muted"
                                                onClick={() => {
                                                    setAccountMenuOpen(false);
                                                    setMenuOpen(false);
                                                }}
                                            >
                                                {t("Orders")}
                                            </Link>
                                        </div>
                                    )}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="justify-start"
                                        onClick={handleLogout}
                                    >
                                        <LogOut aria-hidden="true" />
                                        {t("Logout")}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        asChild
                                        variant="ghost"
                                        className="justify-start"
                                    >
                                        <Link
                                            to="/login"
                                            onClick={() => setMenuOpen(false)}
                                        >
                                            {t("Log in")}
                                        </Link>
                                    </Button>
                                    <Button asChild className="justify-start">
                                        <Link
                                            to="/register"
                                            onClick={() => setMenuOpen(false)}
                                        >
                                            {t("Sign Up")}
                                        </Link>
                                    </Button>
                                </>
                            )}
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
}
