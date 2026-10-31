import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Package, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/api/axios";

const formatPrice = (price) =>
    `৳${new Intl.NumberFormat("en-BD").format(Number(price) || 0)}`;

const formatDate = (value) =>
    value
        ? new Date(value).toLocaleString("en-BD", {
              dateStyle: "medium",
              timeStyle: "short",
          })
        : "—";

const titleCase = (value = "") =>
    value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [downloadingOrder, setDownloadingOrder] = useState(null);
    const [downloadError, setDownloadError] = useState("");

    useEffect(() => {
        let active = true;

        api.get("/orders", { params: { page } })
            .then((response) => {
                if (!active) return;
                setOrders(response.data.data ?? []);
                setLastPage(response.data.meta?.last_page ?? 1);
            })
            .catch((requestError) => {
                if (!active) return;
                setError(
                    requestError.response?.data?.message ||
                        "Your order history could not be loaded. Please try again.",
                );
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [page]);

    const downloadInvoice = async (order) => {
        setDownloadingOrder(order.id);
        setDownloadError("");

        try {
            const response = await api.get(`/orders/${order.id}/invoice`, {
                responseType: "blob",
            });
            const url = URL.createObjectURL(response.data);
            const link = document.createElement("a");
            link.href = url;
            link.download = `Invoice-${order.order_number}.pdf`;
            document.body.append(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (requestError) {
            console.error("Unable to download invoice:", requestError);
            setDownloadError(
                "The invoice could not be downloaded. Please try again.",
            );
        } finally {
            setDownloadingOrder(null);
        }
    };

    const changePage = (nextPage) => {
        setError("");
        setLoading(true);
        setPage(nextPage);
    };

    return (
        <section className="mx-auto w-full max-w-4xl space-y-5">
            <header>
                <h1 className="text-2xl font-bold sm:text-3xl">Your orders</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    View order details and download invoices.
                </p>
            </header>

            {error && (
                <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                </p>
            )}
            {downloadError && (
                <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {downloadError}
                </p>
            )}

            {loading ? (
                <div
                    className="space-y-4"
                    role="status"
                    aria-label="Loading orders"
                >
                    {[1, 2].map((item) => (
                        <div
                            key={item}
                            className="h-52 animate-pulse rounded-xl border border-border bg-card"
                        />
                    ))}
                </div>
            ) : orders.length === 0 && !error ? (
                <div className="rounded-xl border border-border bg-card px-5 py-12 text-center">
                    <Package className="mx-auto size-10 text-muted-foreground" />
                    <h2 className="mt-4 text-lg font-semibold">
                        No orders yet
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Your completed checkouts will appear here.
                    </p>
                    <Button asChild className="mt-5">
                        <Link to="/products">
                            <ShoppingBag aria-hidden="true" />
                            Browse products
                        </Link>
                    </Button>
                </div>
            ) : (
                <div className="space-y-4" aria-busy={loading}>
                    {orders.map((order) => (
                        <article
                            key={order.id}
                            className="rounded-xl border border-border bg-card p-4 sm:p-6"
                        >
                            <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                    <h2 className="break-all font-semibold">
                                        Order {order.order_number}
                                    </h2>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Placed {formatDate(order.created_at)}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                    disabled={downloadingOrder !== null}
                                    onClick={() => downloadInvoice(order)}
                                >
                                    <Download aria-hidden="true" />
                                    {downloadingOrder === order.id
                                        ? "Preparing invoice..."
                                        : "Download invoice"}
                                </Button>
                            </div>

                            <div className="grid gap-3 py-4 text-sm sm:grid-cols-3">
                                <p>
                                    <span className="text-muted-foreground">
                                        Order status:{" "}
                                    </span>
                                    <span className="font-medium">
                                        {titleCase(order.status)}
                                    </span>
                                </p>
                                <p>
                                    <span className="text-muted-foreground">
                                        Payment:{" "}
                                    </span>
                                    <span className="font-medium">
                                        {titleCase(order.payment_status)}
                                    </span>
                                </p>
                                <p>
                                    <span className="text-muted-foreground">
                                        Total:{" "}
                                    </span>
                                    <span className="font-semibold">
                                        {formatPrice(order.total_amount)}
                                    </span>
                                </p>
                            </div>

                            <div className="space-y-3 border-t border-border pt-4">
                                <h3 className="text-sm font-semibold">
                                    Items ({order.items?.length ?? 0})
                                </h3>
                                {order.items?.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex justify-between gap-4 text-sm"
                                    >
                                        <span className="min-w-0">
                                            <span className="font-medium">
                                                {item.product?.name ??
                                                    "Product no longer available"}
                                            </span>
                                            <span className="text-muted-foreground">
                                                {" "}
                                                × {item.quantity}
                                            </span>
                                        </span>
                                        <span className="shrink-0">
                                            {formatPrice(item.subtotal)}
                                        </span>
                                    </div>
                                ))}
                                <div className="flex justify-between gap-4 text-sm text-muted-foreground">
                                    <span>Delivery</span>
                                    <span>{formatPrice(order.delivery_charge)}</span>
                                </div>
                            </div>

                            {order.shipping_address && (
                                <div className="mt-4 border-t border-border pt-4 text-sm">
                                    <h3 className="font-semibold">
                                        Shipping address
                                    </h3>
                                    <p className="mt-1 text-muted-foreground">
                                        {[
                                            order.shipping_address.street,
                                            order.shipping_address.city,
                                            order.shipping_address.postal_code,
                                            order.shipping_address.country,
                                        ]
                                            .filter(Boolean)
                                            .join(", ")}
                                    </p>
                                    {order.shipping_address.phone && (
                                        <p className="text-muted-foreground">
                                            {order.shipping_address.phone}
                                        </p>
                                    )}
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            )}

            {!loading && lastPage > 1 && (
                <nav
                    aria-label="Order history pages"
                    className="flex items-center justify-between"
                >
                    <Button
                        type="button"
                        variant="outline"
                        disabled={page <= 1}
                        onClick={() => changePage(page - 1)}
                    >
                        Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Page {page} of {lastPage}
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={page >= lastPage}
                        onClick={() => changePage(page + 1)}
                    >
                        Next
                    </Button>
                </nav>
            )}
        </section>
    );
}
