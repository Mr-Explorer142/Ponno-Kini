import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Volume2, VolumeX } from "lucide-react";
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
        () => localStorage.getItem("ponno-kini-notification-sound") === "on",
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
                playNotificationSound();
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

    const toggleSound = () => {
        if (soundEnabled) {
            localStorage.setItem("ponno-kini-notification-sound", "off");
            setSoundEnabled(false);
            return;
        }

        if (!playNotificationSound()) {
            setError(t("Notification sound is unavailable in this browser."));
            return;
        }

        localStorage.setItem("ponno-kini-notification-sound", "on");
        setSoundEnabled(true);
        setError("");
    };

    return (
        <div className="relative">
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
                <section
                    role="dialog"
                    aria-label={t("Notifications")}
                    className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-xl"
                >
                    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                        <h2 className="font-semibold">{t("Notifications")}</h2>
                        <div className="flex items-center gap-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
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
                        </div>
                    </div>

                    {error && (
                        <p role="alert" className="px-4 py-3 text-sm text-destructive">
                            {error}
                        </p>
                    )}

                    <div className="max-h-96 overflow-y-auto">
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
            )}
        </div>
    );
}
