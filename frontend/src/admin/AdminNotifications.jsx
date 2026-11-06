import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Volume2, VolumeX } from "lucide-react";
import api from "@/api/axios";
import { Button } from "@/components/ui/button";
import { playNotificationSound } from "@/lib/notificationSound";
import {
    EmptyState,
    Loading,
    Notice,
    PageHeading,
} from "./AdminShared";

export default function AdminNotifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [unreadCount, setUnreadCount] = useState(0);
    const [soundEnabled, setSoundEnabled] = useState(
        () => localStorage.getItem("ponno-kini-notification-sound") !== "off",
    );

    const loadNotifications = useCallback(async (signal) => {
        try {
            const response = await api.get("/notifications", { signal });
            setNotifications(response.data.notifications ?? []);
            setUnreadCount(response.data.unread_count ?? 0);
            setError("");
        } catch (requestError) {
            if (!signal?.aborted) {
                setError(
                    requestError.response?.data?.message ||
                        "Notifications could not be loaded.",
                );
            }
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        void Promise.resolve().then(() => {
            if (!controller.signal.aborted) {
                loadNotifications(controller.signal);
            }
        });
        return () => controller.abort();
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
                    "This notification could not be marked as read.",
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
                    "Notifications could not be marked as read.",
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
            setError("Notification sound is unavailable in this browser.");
            return;
        }

        localStorage.setItem("ponno-kini-notification-sound", "on");
        setSoundEnabled(true);
        setError("");
    };

    return (
        <div className="space-y-6">
            <PageHeading
                title="Notifications"
                description={
                    unreadCount
                        ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`
                        : "You are all caught up."
                }
                action={
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            aria-pressed={soundEnabled}
                            aria-label={
                                soundEnabled
                                    ? "Disable notification sound"
                                    : "Enable notification sound"
                            }
                            title={
                                soundEnabled
                                    ? "Disable notification sound"
                                    : "Enable notification sound"
                            }
                            onClick={toggleSound}
                        >
                            {soundEnabled ? (
                                <Volume2 aria-hidden="true" />
                            ) : (
                                <VolumeX aria-hidden="true" />
                            )}
                            Sound {soundEnabled ? "On" : "Off"}
                        </Button>
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={() => void markAllAsRead()}
                                className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>
                }
            />
            <Notice>{error}</Notice>
            {loading ? (
                <Loading label="Loading notifications..." />
            ) : notifications.length ? (
                <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                    {notifications.map((notification) => {
                        const content = (
                            <span className="flex items-start gap-3">
                                <span
                                    className={`mt-1.5 size-2 shrink-0 rounded-full ${
                                        notification.read_at
                                            ? "bg-transparent"
                                            : "bg-primary"
                                    }`}
                                    aria-hidden="true"
                                />
                                <span className="min-w-0 flex-1">
                                    <span className="block font-medium">
                                        {notification.data.message}
                                    </span>
                                    <time className="mt-1 block text-xs text-muted-foreground">
                                        {new Date(
                                            notification.created_at,
                                        ).toLocaleString()}
                                    </time>
                                </span>
                            </span>
                        );

                        return (
                            <div
                                key={notification.id}
                                className={`px-4 py-4 ${
                                    notification.read_at ? "" : "bg-primary/5"
                                }`}
                            >
                                {notification.data.url ? (
                                    <Link
                                        to={notification.data.url}
                                        className="block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        onClick={() => {
                                            if (!notification.read_at) {
                                                void markAsRead(notification.id);
                                            }
                                        }}
                                    >
                                        {content}
                                    </Link>
                                ) : (
                                    <button
                                        type="button"
                                        className="block w-full text-left"
                                        onClick={() => {
                                            if (!notification.read_at) {
                                                void markAsRead(notification.id);
                                            }
                                        }}
                                    >
                                        {content}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <EmptyState>You have no notifications.</EmptyState>
            )}
        </div>
    );
}
