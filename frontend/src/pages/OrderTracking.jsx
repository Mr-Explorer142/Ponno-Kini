import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Circle, Clock3, PackageCheck, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/api/axios";
import { getIntlLocale, t } from "@/i18n";

const ORDER_STEPS = ["pending", "processing", "completed"];
const TERMINAL_STATUSES = new Set(["completed", "cancelled", "failed"]);

const titleCase = (value = "") =>
    value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDate = (value) =>
    value
        ? new Date(value).toLocaleString(getIntlLocale(), {
              dateStyle: "medium",
              timeStyle: "short",
          })
        : "—";

export default function OrderTracking() {
    const { orderId } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const loadOrder = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const response = await api.get(`/orders/${orderId}`);
            setOrder(response.data.data ?? response.data);
            setError("");
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                    t("Order tracking could not be loaded. Please try again."),
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [orderId]);

    useEffect(() => {
        const timeout = window.setTimeout(() => void loadOrder(), 0);
        return () => window.clearTimeout(timeout);
    }, [loadOrder]);

    const orderStatus = order?.status;
    useEffect(() => {
        if (!orderStatus || TERMINAL_STATUSES.has(orderStatus)) return undefined;
        const interval = window.setInterval(() => {
            void loadOrder(true);
        }, 15000);
        return () => window.clearInterval(interval);
    }, [loadOrder, orderStatus]);

    const currentStep = ORDER_STEPS.indexOf(order?.status);
    const isCancelled = ["cancelled", "failed"].includes(order?.status);

    return (
        <section className="mx-auto w-full max-w-3xl space-y-6">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold sm:text-3xl">
                        {t("Track your order")}
                    </h1>
                    {order && (
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t("Order :number", { number: order.order_number })}
                        </p>
                    )}
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t("Status updates automatically while this page is open.")}
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => void loadOrder(true)}
                    disabled={loading || refreshing}
                >
                    <RefreshCw
                        aria-hidden="true"
                        className={refreshing ? "animate-spin" : ""}
                    />
                    {t(refreshing ? "Refreshing..." : "Refresh status")}
                </Button>
            </header>

            {error && (
                <p
                    role="alert"
                    className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                >
                    {t(error)}
                </p>
            )}

            {loading ? (
                <div
                    className="h-56 animate-pulse rounded-xl border border-border bg-card"
                    role="status"
                    aria-label={t("Loading order tracking")}
                />
            ) : order ? (
                <article className="space-y-6 rounded-xl border border-border bg-card p-5 sm:p-7">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
                        <div>
                            <p className="text-sm text-muted-foreground">
                                {t("Current order status")}
                            </p>
                            <p className="mt-1 text-lg font-semibold">
                                {t(titleCase(order.status))}
                            </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {t("Payment:")} {t(titleCase(order.payment_status))}
                        </p>
                    </div>

                    {isCancelled ? (
                        <div className="flex items-start gap-3 rounded-lg bg-destructive/10 p-4 text-destructive">
                            <X className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                            <p className="text-sm">
                                {t(
                                    order.status === "cancelled"
                                        ? "This order has been cancelled."
                                        : "This order could not be completed.",
                                )}
                            </p>
                        </div>
                    ) : (
                        <ol
                            className="grid gap-5 sm:grid-cols-3"
                            aria-label={t("Order progress")}
                        >
                            {ORDER_STEPS.map((step, index) => {
                                const isComplete =
                                    currentStep >= 0 && index < currentStep;
                                const isCurrent =
                                    order.status === step ||
                                    (order.status === "completed" &&
                                        step === "completed");
                                const Icon = isComplete
                                    ? Check
                                    : isCurrent
                                      ? Clock3
                                      : Circle;

                                return (
                                    <li
                                        key={step}
                                        aria-current={isCurrent ? "step" : undefined}
                                        className="flex items-center gap-3 sm:flex-col sm:items-start"
                                    >
                                        <span
                                            className={`grid size-10 shrink-0 place-items-center rounded-full ${
                                                isComplete || isCurrent
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted text-muted-foreground"
                                            }`}
                                        >
                                            <Icon
                                                className="size-5"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <span
                                            className={
                                                isCurrent
                                                    ? "font-semibold"
                                                    : "text-muted-foreground"
                                            }
                                        >
                                            {t(titleCase(step))}
                                        </span>
                                    </li>
                                );
                            })}
                        </ol>
                    )}

                    <p className="flex items-center gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
                        <PackageCheck className="size-4" aria-hidden="true" />
                        {t("Placed :date", {
                            date: formatDate(order.created_at),
                        })}
                    </p>
                </article>
            ) : null}

            <Button asChild variant="outline">
                <Link to="/orders">{t("Back to your orders")}</Link>
            </Button>
        </section>
    );
}
