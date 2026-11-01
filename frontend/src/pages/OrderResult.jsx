import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, CircleX, Download, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/api/axios";
import { useCartStore } from "@/store/useCartStore";
import { getIntlLocale, t } from "@/i18n";

const formatPrice = (price) =>
    `৳${new Intl.NumberFormat(getIntlLocale()).format(Number(price) || 0)}`;

export default function OrderResult() {
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get("order_id");
    const paymentResult = searchParams.get("payment");
    const removeItems = useCartStore((state) => state.removeItems);
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
                if (
                    loadedOrder.payment_status === "paid" ||
                    loadedOrder.payment_method === "cod"
                ) {
                    removeItems(
                        (loadedOrder.items ?? []).map(
                            (item) => item.product_id,
                        ),
                    );
                }
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
    }, [orderId, removeItems]);

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
    const codOrder = order?.payment_method === "cod" && paymentResult === "cod";
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
                            {t("Thank you for your order!")}
                        </h1>
                        <p className="mt-3 text-muted-foreground">
                            {t("Your payment was successful and your order is now being processed.")}
                        </p>
                        <div className="mt-6 rounded-xl bg-secondary/60 p-4 text-left text-sm">
                            <p>
                                <strong>{t("Order number:")}</strong>{" "}
                                {order.order_number}
                            </p>
                            <p className="mt-1">
                                <strong>{t("Order status:")}</strong>{" "}
                                {t(order.status)}
                            </p>
                            <p className="mt-1">
                                <strong>{t("Total paid:")}</strong>{" "}
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
                                    ? t("Preparing invoice...")
                                    : t("Download invoice")}
                            </Button>
                            <Button asChild className="gap-2 px-4">
                                <Link
                                    to="/products"
                                    className="inline-flex items-center gap-2"
                                >
                                    <ShoppingBag aria-hidden="true" />
                                    {t("Continue shopping")}
                                </Link>
                            </Button>
                        </div>
                    </>
                ) : codOrder ? (
                    <>
                        <CheckCircle2 className="mx-auto size-14 text-green-600" />
                        <h1 className="mt-4 text-3xl font-bold">
                            {t("Your order has been placed")}
                        </h1>
                        <p className="mt-3 text-muted-foreground">
                            {t("Pay cash when your order is delivered.")}
                        </p>
                        <div className="mt-6 rounded-xl bg-secondary/60 p-4 text-left text-sm">
                            <p>
                                <strong>{t("Order number:")}</strong>{" "}
                                {order.order_number}
                            </p>
                            <p className="mt-1">
                                <strong>{t("Order status:")}</strong>{" "}
                                {t(order.status)}
                            </p>
                            <p className="mt-1">
                                <strong>{t("Total due:")}</strong>{" "}
                                {formatPrice(order.total_amount)}
                            </p>
                        </div>
                        <div className="mt-6 flex justify-center">
                            <Button asChild variant="outline">
                                <Link to="/orders">{t("View your orders")}</Link>
                            </Button>
                        </div>
                    </>
                ) : failed ? (
                    <>
                        <CircleX className="mx-auto size-14 text-destructive" />
                        <h1 className="mt-4 text-3xl font-bold">
                            {t("Payment was not completed")}
                        </h1>
                        <p className="mt-3 text-muted-foreground">
                            {t("Your order has not been marked as paid. You can return to your cart and try again.")}
                        </p>
                        {order && (
                            <p className="mt-4 text-sm text-muted-foreground">
                                {t("Order number:")} {order.order_number}
                            </p>
                        )}
                        <Button asChild className="mt-6">
                            <Link to="/cart">{t("Return to cart")}</Link>
                        </Button>
                    </>
                ) : (
                    <>
                        <div className="mx-auto size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                        <h1 className="mt-4 text-2xl font-bold">
                            {t("Checking your payment")}
                        </h1>
                        <p className="mt-2 text-muted-foreground">
                            {t("Please wait while we confirm your order status.")}
                        </p>
                    </>
                )}
                {(error ||
                    (!orderId &&
                        "We couldn't find the order associated with this payment.")) && (
                    <p role="alert" className="mt-4 text-sm text-destructive">
                        {t(error ||
                            "We couldn't find the order associated with this payment.")}
                    </p>
                )}
            </div>
        </section>
    );
}
