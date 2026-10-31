import { useEffect, useState } from "react";
import { AlertTriangle, Banknote, Clock3, ShoppingBag } from "lucide-react";
import api from "@/api/axios";
import { EmptyState, Loading, Notice, PageHeading } from "./AdminShared";
import { formatPrice } from "./AdminFormat";

const cards = [
    { key: "today_orders", label: "Orders today", icon: ShoppingBag, format: (value) => value ?? 0 },
    { key: "pending_orders", label: "Pending orders", icon: Clock3, format: (value) => value ?? 0 },
    { key: "total_sales", label: "Total paid sales", icon: Banknote, format: formatPrice },
    { key: "low_stock_count", label: "Low-stock products", icon: AlertTriangle, format: (value) => value ?? 0 },
];

export default function AdminDashboard() {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();
        api.get("/admin/dashboard", { signal: controller.signal })
            .then((response) => setReport(response.data))
            .catch((requestError) => {
                if (!controller.signal.aborted) {
                    setError(
                        requestError.response?.data?.message ||
                            "The dashboard could not be loaded.",
                    );
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, []);

    return (
        <div className="space-y-6">
            <PageHeading
                title="Store overview"
                description="A quick look at today's activity and inventory."
            />
            <Notice>{error}</Notice>
            {loading ? (
                <Loading label="Loading store metrics..." />
            ) : report ? (
                <>
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {cards.map(({ key, label, icon: Icon, format }) => (
                            <article
                                key={key}
                                className="rounded-xl border border-border bg-card p-5"
                            >
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">{label}</p>
                                    <Icon className="size-4 text-primary" />
                                </div>
                                <p className="mt-4 text-2xl font-bold">
                                    {format(report[key])}
                                </p>
                            </article>
                        ))}
                    </section>
                    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
                        <div>
                            <h3 className="font-semibold">Low-stock products</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Products with 5 or fewer units remaining.
                            </p>
                        </div>
                        {report.low_stock_products?.length ? (
                            <div className="divide-y divide-border">
                                {report.low_stock_products.map((product) => (
                                    <div
                                        key={product.id}
                                        className="flex items-center gap-3 py-3"
                                    >
                                        {product.image_url ? (
                                            <img
                                                src={product.image_url}
                                                alt=""
                                                className="size-11 rounded-lg object-cover"
                                            />
                                        ) : (
                                            <div className="grid size-11 place-items-center rounded-lg bg-muted">
                                                <ShoppingBag className="size-4 text-muted-foreground" />
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">
                                                {product.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {product.category?.name ?? "Uncategorized"}
                                            </p>
                                        </div>
                                        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                                            {product.stock} left
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState>All products have healthy stock.</EmptyState>
                        )}
                    </section>
                </>
            ) : null}
        </div>
    );
}
