import { useState } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
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

export default function Cart() {
    const items = useCartStore((state) => state.items);
    const updateQuantity = useCartStore((state) => state.updateQuantity);
    const removeItem = useCartStore((state) => state.removeItem);
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

    const subtotal = items.reduce(
        (total, item) => total + Number(item.product.price) * item.quantity,
        0,
    );
    const deliveryCharge =
        address.city.trim().toLowerCase() === "dhaka" ? 70 : 120;
    const total = subtotal + (items.length ? deliveryCharge : 0);

    const updateAddress = (event) => {
        const { name, value } = event.target;
        setAddressOverrides((current) => ({ ...current, [name]: value }));
    };

    const proceedToPayment = async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setError("");

        try {
            const orderResponse = await api.post("/orders", {
                shipping_address: address,
                items: items.map(({ product, quantity }) => ({
                    product_id: product.id,
                    quantity,
                })),
            });
            const order = orderResponse.data.data ?? orderResponse.data;
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
                                    max="99"
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
                                    disabled={quantity >= 99}
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
                            disabled={submitting}
                        >
                            {submitting
                                ? t("Connecting to payment...")
                                : t("Proceed to payment")}
                        </Button>
                    )}

                    {error && (
                        <p
                            role="alert"
                            className="text-sm text-destructive"
                        >
                            {t(error)}
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
}
