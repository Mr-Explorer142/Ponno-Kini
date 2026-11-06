import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Volume2, VolumeX, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import api from "@/api/axios";
import { t } from "@/i18n";
import { playNotificationSound } from "@/lib/notificationSound";
import { useAuthStore } from "@/store/useAuthStore";

export default function NotificationBell() {
    const token = useAuthStore((state) => state.token);
    if (!token) return null;

    return <NotificationBellContent key={token} />;
}

function NotificationBellContent() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState("");
    const [soundEnabled, setSoundEnabled] = useState(
        () => localStorage.getItem("ponno-kini-notification-sound") !== "off",
    );
    const knownNotificationIds = useRef(new Set());
    const soundEnabledRef = useRef(soundEnabled);

    useEffect(() => {
        soundEnabledRef.current = soundEnabled;
    }, [soundEnabled]);

    const loadNotifications = useCallback(async (playSound = false) => {
        try {
            const response = await api.get("/notifications");
            const nextNotifications = response.data.notifications ?? [];
            const hasNewUnread = nextNotifications.some(
                (notification) =>
                    !notification.read_at &&
                    !knownNotificationIds.current.has(notification.id),
            );

            if (playSound && hasNewUnread && soundEnabledRef.current) {
                void playNotificationSound();
            }

            nextNotifications.forEach((notification) =>
                knownNotificationIds.current.add(notification.id),
            );
            setNotifications(nextNotifications);
            setUnreadCount(response.data.unread_count ?? 0);
            setError("");
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                    t("Could not load notifications. Please try again."),
            );
        }
    }, []);

    useEffect(() => {
        let initialLoad = true;
        const poll = () => {
            void loadNotifications(!initialLoad);
            initialLoad = false;
        };

        poll();
        const interval = window.setInterval(poll, 30000);
        return () => window.clearInterval(interval);
    }, [loadNotifications]);

    useEffect(() => {
        if (!open) return undefined;

        const closeOnEscape = (event) => {
            if (event.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [open]);

    const markAsRead = async (id) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications((current) =>
                current.map((notification) =>
                    notification.id === id
                        ? { ...notification, read_at: new Date().toISOString() }
                        : notification,
                ),
            );
            setUnreadCount((count) => Math.max(0, count - 1));
            setError("");
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                    t("Could not update this notification. Please try again."),
            );
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.post("/notifications/read-all");
            setNotifications((current) =>
                current.map((notification) => ({
                    ...notification,
                    read_at: notification.read_at ?? new Date().toISOString(),
                })),
            );
            setUnreadCount(0);
            setError("");
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                    t("Could not update notifications. Please try again."),
            );
        }
    };

    const toggleSound = async () => {
        if (soundEnabled) {
            localStorage.setItem("ponno-kini-notification-sound", "off");
            setSoundEnabled(false);
            return;
        }

        if (!(await playNotificationSound())) {
            setError(t("Notification sound is unavailable in this browser."));
            return;
        }

        localStorage.setItem("ponno-kini-notification-sound", "on");
        setSoundEnabled(true);
        setError("");
    };

    return (
        <div className={open ? "relative z-[60]" : "relative"}>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("Notifications, :count unread", {
                    count: unreadCount,
                })}
                aria-expanded={open}
                aria-haspopup="dialog"
                onClick={() => setOpen((value) => !value)}
            >
                <span className="relative">
                    <Bell aria-hidden="true" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-2 -right-3 flex size-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </span>
            </Button>

            {open && (
                <>
                    <div
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] md:hidden"
                        aria-hidden="true"
                        onClick={() => setOpen(false)}
                    />
                <section
                    role="dialog"
                    aria-label={t("Notifications")}
                    className="fixed top-1/2 left-1/2 z-[60] flex max-h-[min(36rem,calc(100dvh-1rem))] w-[min(24rem,calc(100vw-1rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl md:absolute md:top-full md:right-0 md:left-auto md:mt-2 md:max-h-[min(36rem,calc(100dvh-5rem))] md:w-[22rem] md:translate-x-0 md:translate-y-0 md:rounded-xl md:shadow-xl"
                >
                    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2.5 sm:px-4 sm:py-3">
                        <h2 className="shrink-0 text-sm font-semibold sm:text-base">
                            {t("Notifications")}
                        </h2>
                        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 sm:size-9"
                                aria-label={t(
                                    soundEnabled
                                        ? "Disable notification sound"
                                        : "Enable notification sound",
                                )}
                                aria-pressed={soundEnabled}
                                title={t(
                                    soundEnabled
                                        ? "Disable notification sound"
                                        : "Enable notification sound",
                                )}
                                onClick={toggleSound}
                            >
                                {soundEnabled ? (
                                    <Volume2 aria-hidden="true" />
                                ) : (
                                    <VolumeX aria-hidden="true" />
                                )}
                            </Button>
                            {unreadCount > 0 && (
                                <button
                                    type="button"
                                    className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-muted"
                                    onClick={() => void markAllAsRead()}
                                >
                                    {t("Mark all as read")}
                                </button>
                            )}
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 sm:size-9"
                                aria-label={t("Close notifications")}
                                onClick={() => setOpen(false)}
                            >
                                <X aria-hidden="true" />
                            </Button>
                        </div>
                    </div>

                    {error && (
                        <p role="alert" className="shrink-0 px-4 py-3 text-sm text-destructive">
                            {error}
                        </p>
                    )}

                    <div className="min-h-0 max-h-96 flex-1 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                                {t("You have no notifications.")}
                            </p>
                        ) : (
                            notifications.map((notification) => (
                                <Link
                                    key={notification.id}
                                    to={notification.data.url || "/orders"}
                                    className={`block border-b border-border px-4 py-3 text-sm transition-colors last:border-b-0 hover:bg-muted ${
                                        notification.read_at ? "" : "bg-primary/5"
                                    }`}
                                    onClick={() => {
                                        setOpen(false);
                                        if (!notification.read_at) {
                                            void markAsRead(notification.id);
                                        }
                                    }}
                                >
                                    <span className="flex items-start gap-2">
                                        {!notification.read_at && (
                                            <span
                                                aria-label={t("Unread")}
                                                className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                                            />
                                        )}
                                        <span className="min-w-0 flex-1">
                                            <span className="block">
                                                {notification.data.message}
                                            </span>
                                            <time className="mt-1 block text-xs text-muted-foreground">
                                                {new Date(
                                                    notification.created_at,
                                                ).toLocaleString()}
                                            </time>
                                        </span>
                                    </span>
                                </Link>
                            ))
                        )}
                    </div>
                </section>
                </>
            )}
        </div>
    );
}
