import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, CircleX, Download, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/api/axios";
import { useCartStore } from "@/store/useCartStore";

const formatPrice = (price) =>
    `৳${new Intl.NumberFormat("en-BD").format(Number(price) || 0)}`;

export default function OrderResult() {
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get("order_id");
    const paymentResult = searchParams.get("payment");
    const clearCart = useCartStore((state) => state.clearCart);
    const [order, setOrder] = useState(null);
    const [error, setError] = useState("");
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        if (!orderId) {
            return;
        }

        let active = true;
        api.get(`/orders/${orderId}`)
            .then((response) => {
                if (!active) return;
                const loadedOrder = response.data.data ?? response.data;
                setOrder(loadedOrder);
                if (loadedOrder.payment_status === "paid") clearCart();
            })
            .catch((requestError) => {
                if (!active) return;
                console.error("Unable to load payment result:", requestError);
                setError(
                    requestError.response?.data?.message ||
                        "Order details could not be loaded. Please try again.",
                );
            });

        return () => {
            active = false;
        };
    }, [orderId, clearCart]);

    const downloadInvoice = async () => {
        setDownloading(true);
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
            setError("The invoice could not be downloaded. Please try again.");
        } finally {
            setDownloading(false);
        }
    };

    const paid = order?.payment_status === "paid";
    const failed =
        paymentResult === "failed" ||
        paymentResult === "cancelled" ||
        order?.payment_status === "failed" ||
        order?.payment_status === "cancelled";

    return (
        <section className="mx-auto max-w-2xl py-12">
            <div className="rounded-2xl border border-border bg-card p-6 text-center sm:p-10">
                {paid ? (
                    <>
                        <CheckCircle2 className="mx-auto size-14 text-green-600" />
                        <h1 className="mt-4 text-3xl font-bold">
                            Thank you for your order!
                        </h1>
                        <p className="mt-3 text-muted-foreground">
                            Your payment was successful and your order is now
                            being processed.
                        </p>
                        <div className="mt-6 rounded-xl bg-secondary/60 p-4 text-left text-sm">
                            <p>
                                <strong>Order number:</strong>{" "}
                                {order.order_number}
                            </p>
                            <p className="mt-1">
                                <strong>Order status:</strong>{" "}
                                {order.status}
                            </p>
                            <p className="mt-1">
                                <strong>Total paid:</strong>{" "}
                                {formatPrice(order.total_amount)}
                            </p>
                        </div>
                        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={downloading}
                                onClick={downloadInvoice}
                            >
                                <Download aria-hidden="true" />
                                {downloading
                                    ? "Preparing invoice..."
                                    : "Download invoice"}
                            </Button>
                            <Button asChild className="gap-2 px-4">
                                <Link
                                    to="/products"
                                    className="inline-flex items-center gap-2"
                                >
                                    <ShoppingBag aria-hidden="true" />
                                    Continue shopping
                                </Link>
                            </Button>
                        </div>
                    </>
                ) : failed ? (
                    <>
                        <CircleX className="mx-auto size-14 text-destructive" />
                        <h1 className="mt-4 text-3xl font-bold">
                            Payment was not completed
                        </h1>
                        <p className="mt-3 text-muted-foreground">
                            Your order has not been marked as paid. You can
                            return to your cart and try again.
                        </p>
                        {order && (
                            <p className="mt-4 text-sm text-muted-foreground">
                                Order number: {order.order_number}
                            </p>
                        )}
                        <Button asChild className="mt-6">
                            <Link to="/cart">Return to cart</Link>
                        </Button>
                    </>
                ) : (
                    <>
                        <div className="mx-auto size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                        <h1 className="mt-4 text-2xl font-bold">
                            Checking your payment
                        </h1>
                        <p className="mt-2 text-muted-foreground">
                            Please wait while we confirm your order status.
                        </p>
                    </>
                )}
                {(error ||
                    (!orderId &&
                        "We couldn't find the order associated with this payment.")) && (
                    <p role="alert" className="mt-4 text-sm text-destructive">
                        {error ||
                            "We couldn't find the order associated with this payment."}
                    </p>
                )}
            </div>
        </section>
    );
}
