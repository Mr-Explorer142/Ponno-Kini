import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/api/axios";
import { useAuthStore } from "@/store/useAuthStore";
import { useCartStore } from "@/store/useCartStore";
import { getIntlLocale, t } from "@/i18n";

const formatPrice = (price) =>
    `৳${new Intl.NumberFormat(getIntlLocale()).format(Number(price) || 0)}`;

const emptyAddress = {
    street: "",
    city: "",
    postal_code: "",
    country: "Bangladesh",
    phone: "",
};

const manualChatLinks = {
    Messenger: import.meta.env.VITE_ADMIN_MESSENGER_URL || "https://www.messenger.com/",
    Instagram: import.meta.env.VITE_ADMIN_INSTAGRAM_URL || "https://www.instagram.com/direct/inbox/",
    WhatsApp: import.meta.env.VITE_ADMIN_WHATSAPP_URL || "https://wa.me/",
    Facebook: import.meta.env.VITE_ADMIN_FACEBOOK_URL || "https://www.facebook.com/messages/",
};

export default function Cart() {
    const items = useCartStore((state) => state.items);
    const updateQuantity = useCartStore((state) => state.updateQuantity);
    const removeItem = useCartStore((state) => state.removeItem);
    const updateProduct = useCartStore((state) => state.updateProduct);
    const clearCart = useCartStore((state) => state.clearCart);
    const { user, isAuthenticated } = useAuthStore();
    const [addressOverrides, setAddressOverrides] = useState({});
    const address = {
        ...emptyAddress,
        ...(user?.address ?? {}),
        ...addressOverrides,
        country: "Bangladesh",
    };
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("online");
    const [checkedProductIds, setCheckedProductIds] = useState("");
    const [stockCheckError, setStockCheckError] = useState("");
    const [manualNotice, setManualNotice] = useState("");
    const cartProductIds = items.map(({ product }) => product.id).join(",");
    const stockChecking = Boolean(cartProductIds) && checkedProductIds !== cartProductIds;

    useEffect(() => {
        if (!cartProductIds) return undefined;

        let active = true;
        const currentItems = useCartStore.getState().items;
        Promise.resolve().then(() => {
            if (active) setStockCheckError("");
        });

        Promise.all(currentItems.map(async ({ product }) => {
            try {
                const response = await api.get(`/product/${product.id}`);
                if (active) updateProduct(response.data.data ?? response.data);
            } catch (requestError) {
                if (!active) return;
                if (requestError.response?.status === 404) {
                    updateProduct({ ...product, stock: 0 });
                } else {
                    setStockCheckError(
                        requestError.response?.data?.message ||
                            "Current stock could not be checked. Please retry before ordering.",
                    );
                }
            }
        })).finally(() => {
            if (active) setCheckedProductIds(cartProductIds);
        });

        return () => {
            active = false;
        };
    }, [cartProductIds, updateProduct]);

    const subtotal = items.reduce(
        (total, item) => total + Number(item.product.price) * item.quantity,
        0,
    );
    const deliveryCharge =
        address.city.trim().toLowerCase() === "dhaka" ? 70 : 120;
    const total = subtotal + (items.length ? deliveryCharge : 0);
    const hasAvailableStock = items.every(
        ({ product, quantity }) =>
            Number(product.stock) >= quantity && Number(product.stock) > 0,
    );

    const updateAddress = (event) => {
        const { name, value } = event.target;
        setAddressOverrides((current) => ({ ...current, [name]: value }));
    };

    const proceedToPayment = async (event) => {
        event.preventDefault();
        if (stockChecking || stockCheckError || !hasAvailableStock) {
            setError(
                stockCheckError ||
                    "One or more products no longer have enough stock. Update your cart and try again.",
            );
            return;
        }
        setSubmitting(true);
        setError("");

        try {
            const orderResponse = await api.post("/orders", {
                shipping_address: address,
                payment_method: paymentMethod,
                items: items.map(({ product, quantity }) => ({
                    product_id: product.id,
                    quantity,
                })),
            });
            const order = orderResponse.data.data ?? orderResponse.data;
            if (paymentMethod === "cod") {
                clearCart();
                window.location.assign(
                    `/order-result?order_id=${order.id}&payment=cod`,
                );
                return;
            }
            const paymentResponse = await api.post(`/orders/${order.id}/pay`);
            window.location.assign(paymentResponse.data.payment_url);
        } catch (requestError) {
            console.error("Unable to start checkout:", requestError);
            const validationError = Object.values(
                requestError.response?.data?.errors ?? {},
            )
                .flat()
                .at(0);
            setError(
                validationError ||
                    requestError.response?.data?.message ||
                    "Checkout could not be started. Please check your details and try again.",
            );
            setSubmitting(false);
        }
    };

    const manualOrderMessage = [
        "Manual order request",
        ...items.map(({ product, quantity }) =>
            `${product.name} × ${quantity} — ${formatPrice(Number(product.price) * quantity)}`,
        ),
        `Subtotal: ${formatPrice(subtotal)}`,
        `Delivery: ${formatPrice(deliveryCharge)}`,
        `Total: ${formatPrice(total)}`,
        `Shipping address: ${[
            address.street,
            address.city,
            address.postal_code,
            address.country,
            address.phone,
        ].filter(Boolean).join(", ") || "Not provided"}`,
    ].join("\n");

    const openManualChat = async (platform) => {
        setManualNotice("");
        try {
            const destination = new URL(manualChatLinks[platform]);
            if (platform === "WhatsApp") {
                destination.searchParams.set("text", manualOrderMessage);
            }
            window.open(destination.toString(), "_blank", "noopener,noreferrer");
            await navigator.clipboard.writeText(manualOrderMessage);
            setManualNotice(
                t("Order details copied. Paste them into your :platform chat.", {
                    platform,
                }),
            );
        } catch {
            setManualNotice(
                "The chat opened. Copy the order details below and paste them into the conversation.",
            );
        }
    };

    if (!items.length) {
        return (
            <section className="mx-auto max-w-2xl py-16 text-center">
                <ShoppingBag className="mx-auto size-12 text-primary" />
                <h1 className="mt-4 text-3xl font-bold">{t("Your cart is empty")}</h1>
                <p className="mt-2 text-muted-foreground">
                    {t("Add a few products before heading to checkout.")}
                </p>
                <Button asChild className="mt-6 gap-2 px-4">
                    <Link to="/products">{t("Continue shopping")}</Link>
                </Button>
            </section>
        );
    }

    return (
        <div className="mx-auto max-w-5xl space-y-8 pb-10">
            <header>
                <p className="text-sm font-semibold tracking-wide text-primary uppercase">
                    {t("Checkout")}
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight">
                    {t("Your cart")}
                </h1>
            </header>

            <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
                <section
                    aria-label={t("Cart items")}
                    className="divide-y divide-border rounded-2xl border border-border bg-card"
                >
                    {items.map(({ product, quantity }) => (
                        <article
                            key={product.id}
                            className="flex flex-wrap items-center gap-4 p-4"
                        >
                            {product.image_url ? (
                                <img
                                    src={product.image_url}
                                    alt=""
                                    className="size-20 rounded-xl object-cover"
                                />
                            ) : (
                                <div className="size-20 rounded-xl bg-secondary" />
                            )}
                            <div className="min-w-0 flex-1">
                                <Link
                                    to={`/products/${product.id}`}
                                    className="font-semibold hover:text-primary"
                                >
                                    {product.name}
                                </Link>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {formatPrice(product.price)} {t("each")}
                                </p>
                                <p className={`mt-1 text-xs ${Number(product.stock) > 0 ? "text-muted-foreground" : "font-medium text-destructive"}`}>
                                    {Number(product.stock) > 0
                                        ? t(":count in stock", { count: product.stock })
                                        : t("Out of stock")}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    aria-label={t("Decrease :product quantity", {
                                        product: product.name,
                                    })}
                                    onClick={() =>
                                        updateQuantity(product.id, quantity - 1)
                                    }
                                >
                                    <Minus aria-hidden="true" />
                                </Button>
                                <Input
                                    type="number"
                                    min="1"
                                    max={Math.min(99, Number(product.stock) || 99)}
                                    value={quantity}
                                    aria-label={t(":product quantity", {
                                        product: product.name,
                                    })}
                                    className="w-16 text-center"
                                    onChange={(event) =>
                                        updateQuantity(
                                            product.id,
                                            Math.min(
                                                99,
                                                Number(product.stock) || 99,
                                                Math.max(
                                                    0,
                                                    Number(event.target.value) || 0,
                                                ),
                                            ),
                                        )
                                    }
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    aria-label={t("Increase :product quantity", {
                                        product: product.name,
                                    })}
                                    disabled={quantity >= Math.min(99, Number(product.stock) || 0)}
                                    onClick={() =>
                                        updateQuantity(product.id, quantity + 1)
                                    }
                                >
                                    <Plus aria-hidden="true" />
                                </Button>
                            </div>
                            <div className="w-full text-right font-semibold sm:w-24">
                                {formatPrice(Number(product.price) * quantity)}
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={t("Remove :product", {
                                    product: product.name,
                                })}
                                onClick={() => removeItem(product.id)}
                            >
                                <Trash2 aria-hidden="true" />
                            </Button>
                        </article>
                    ))}
                </section>

                <form
                    onSubmit={proceedToPayment}
                    className="space-y-5 rounded-2xl border border-border bg-card p-5"
                >
                    <div>
                        <h2 className="text-xl font-semibold">
                            {t("Delivery details")}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t("We currently deliver within Bangladesh.")}
                        </p>
                    </div>

                    <label className="block space-y-2 text-sm font-medium">
                        {t("Street address")}
                        <Input
                            name="street"
                            value={address.street}
                            onChange={updateAddress}
                            placeholder={t("House, road, area (e.g. Uttara)")}
                            autoComplete="street-address"
                            required
                        />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="block space-y-2 text-sm font-medium">
                            {t("City / district")}
                            <Input
                                name="city"
                                value={address.city}
                                onChange={updateAddress}
                                placeholder={t("Dhaka or Madaripur")}
                                autoComplete="address-level2"
                                required
                            />
                        </label>
                        <label className="block space-y-2 text-sm font-medium">
                            {t("Postal code")}
                            <Input
                                name="postal_code"
                                value={address.postal_code}
                                onChange={updateAddress}
                                placeholder="1230"
                                autoComplete="postal-code"
                                required
                            />
                        </label>
                    </div>
                    <label className="block space-y-2 text-sm font-medium">
                        {t("Phone")}
                        <Input
                            name="phone"
                            type="tel"
                            value={address.phone}
                            onChange={updateAddress}
                            placeholder="01XXXXXXXXX"
                            autoComplete="tel"
                            required
                        />
                    </label>

                    <fieldset className="space-y-2 border-t border-border pt-4">
                        <legend className="text-sm font-semibold">
                            {t("Payment method")}
                        </legend>
                        <label className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
                            <input
                                type="radio"
                                name="payment_method"
                                value="online"
                                checked={paymentMethod === "online"}
                                onChange={() => setPaymentMethod("online")}
                            />
                            <span>{t("Online payment")} (SSLCommerz)</span>
                        </label>
                        <label className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
                            <input
                                type="radio"
                                name="payment_method"
                                value="cod"
                                checked={paymentMethod === "cod"}
                                onChange={() => setPaymentMethod("cod")}
                            />
                            <span>{t("Cash on delivery")}</span>
                        </label>
                    </fieldset>

                    <div className="space-y-2 border-t border-border pt-4 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">
                                {t("Subtotal")}
                            </span>
                            <span>{formatPrice(subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">
                                {t("Delivery")}{" "}
                                {address.city.trim().toLowerCase() === "dhaka"
                                    ? t("inside Dhaka")
                                    : t("outside Dhaka")}
                            </span>
                            <span>{formatPrice(deliveryCharge)}</span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
                            <span>{t("Total")}</span>
                            <span>{formatPrice(total)}</span>
                        </div>
                    </div>

                    {!isAuthenticated ? (
                        <Button asChild className="w-full">
                            <Link to="/login">{t("Log in to continue to payment")}</Link>
                        </Button>
                    ) : !user?.email_verified_at ? (
                        <Button asChild className="w-full">
                            <Link to="/verify-email">
                                {t("Verify email to continue")}
                            </Link>
                        </Button>
                    ) : (
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={submitting || stockChecking || Boolean(stockCheckError) || !hasAvailableStock}
                        >
                            {submitting
                                ? paymentMethod === "cod"
                                    ? t("Placing order...")
                                    : t("Connecting to payment...")
                                : paymentMethod === "cod"
                                    ? t("Place COD order")
                                    : t("Proceed to payment")}
                        </Button>
                    )}

                    {(error || stockCheckError) && (
                        <p
                            role="alert"
                            className="text-sm text-destructive"
                        >
                            {t(error || stockCheckError)}
                        </p>
                    )}
                    {stockChecking && (
                        <p role="status" className="text-sm text-muted-foreground">
                            {t("Checking current stock...")}
                        </p>
                    )}
                    {!hasAvailableStock && !stockChecking && (
                        <p role="alert" className="text-sm text-destructive">
                            {t("Reduce quantities or remove unavailable products before ordering.")}
                        </p>
                    )}

                    <div className="space-y-3 border-t border-border pt-4">
                        <div>
                            <h3 className="font-semibold">{t("Order manually via chat")}</h3>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {t("We will copy your cart details so you can paste them into the selected chat. This does not reserve stock or place an order.")}
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.keys(manualChatLinks).map((platform) => (
                                <Button
                                    key={platform}
                                    type="button"
                                    variant="outline"
                                    onClick={() => openManualChat(platform)}
                                >
                                    <MessageCircle aria-hidden="true" />
                                    {platform}
                                </Button>
                            ))}
                        </div>
                        {manualNotice && (
                            <p role="status" className="text-sm text-muted-foreground">
                                {manualNotice}
                            </p>
                        )}
                        <details className="text-sm">
                            <summary className="cursor-pointer font-medium">
                                {t("View order details to copy")}
                            </summary>
                            <textarea
                                readOnly
                                value={manualOrderMessage}
                                aria-label={t("Manual order details")}
                                className="mt-2 min-h-32 w-full rounded-lg border border-input bg-background p-3 text-xs"
                            />
                        </details>
                    </div>
                </form>
            </div>
        </div>
    );
}
