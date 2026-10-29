import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Menu, Moon, ShoppingBag, Sun, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";

function ThemeToggle({ theme, onToggleTheme, showLabel = false }) {
    const isDark = theme === "dark";
    const Icon = isDark ? Sun : Moon;
    const label = isDark ? "Switch to light mode" : "Switch to dark mode";

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
            {showLabel && (isDark ? "Light mode" : "Dark mode")}
        </Button>
    );
}

export default function Navbar({ theme, onToggleTheme }) {
    const { isAuthenticated, user, logout } = useAuthStore();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
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
                            to="/products"
                            className="inline-flex items-center gap-2"
                        >
                            <ShoppingBag aria-hidden="true" />
                            Catalog
                        </Link>
                    </Button>

                    {isAuthenticated ? (
                        <>
                            <Button
                                asChild
                                variant="ghost"
                                className="max-w-full"
                            >
                                <Link
                                    to="/profile"
                                    className="inline-flex min-w-0 items-center gap-2 whitespace-normal"
                                >
                                    <User />
                                    <span className="break-all">
                                        {user?.name ?? "Profile"}
                                    </span>
                                </Link>
                            </Button>
                            <Button
                                className="cursor-pointer"
                                variant="outline"
                                onClick={handleLogout}
                            >
                                <LogOut aria-hidden="true" />
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

                <Button
                    ref={menuButtonRef}
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    aria-label="Open navigation menu"
                    aria-expanded={menuOpen}
                    aria-controls="mobile-navigation"
                    onClick={() => setMenuOpen(true)}
                >
                    <Menu aria-hidden="true" />
                </Button>
            </div>

            {menuOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <button
                        type="button"
                        aria-label="Close navigation menu"
                        className="absolute inset-0 size-full cursor-default bg-black/40"
                        onClick={() => setMenuOpen(false)}
                    />
                    <nav
                        ref={drawerRef}
                        id="mobile-navigation"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Navigation menu"
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
                                aria-label="Close navigation menu"
                                onClick={() => setMenuOpen(false)}
                            >
                                <X aria-hidden="true" />
                            </Button>
                        </div>

                        <div className="flex flex-col items-stretch gap-2">
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
                                    Catalog
                                </Link>
                            </Button>

                            {isAuthenticated ? (
                                <>
                                    <Button
                                        asChild
                                        variant="ghost"
                                        className="max-w-full justify-start"
                                    >
                                        <Link
                                            to="/profile"
                                            className="inline-flex min-w-0 items-center gap-2 whitespace-normal"
                                            onClick={() => setMenuOpen(false)}
                                        >
                                            <User aria-hidden="true" />
                                            <span className="break-all">
                                                {user?.name ?? "Profile"}
                                            </span>
                                        </Link>
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="justify-start"
                                        onClick={handleLogout}
                                    >
                                        <LogOut aria-hidden="true" />
                                        Logout
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
                                            Log in
                                        </Link>
                                    </Button>
                                    <Button asChild className="justify-start">
                                        <Link
                                            to="/register"
                                            onClick={() => setMenuOpen(false)}
                                        >
                                            Sign Up
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
