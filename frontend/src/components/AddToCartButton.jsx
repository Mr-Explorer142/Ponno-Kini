import { useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/useCartStore";
import { t } from "@/i18n";

export default function AddToCartButton({
    product,
    size = "default",
    className,
}) {
    const addItem = useCartStore((state) => state.addItem);
    const quantityInCart = useCartStore(
        (state) =>
            state.items.find((item) => item.product.id === product.id)
                ?.quantity ?? 0,
    );
    const [added, setAdded] = useState(false);
    const stock = Number(product.stock) || 0;
    const unavailable = stock <= 0;
    const limitReached = quantityInCart >= stock;

    const handleAdd = () => {
        if (unavailable || limitReached) return;
        addItem(product);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1200);
    };

    return (
        <Button
            type="button"
            size={size}
            className={className}
            onClick={handleAdd}
            disabled={unavailable || limitReached}
        >
            {unavailable ? (
                t("Out of stock")
            ) : limitReached ? (
                t("Stock limit reached")
            ) : added ? (
                <Check aria-hidden="true" />
            ) : (
                <ShoppingCart aria-hidden="true" />
            )}
            {!unavailable &&
                !limitReached &&
                t(added ? "Added to cart" : "Add to Cart")}
        </Button>
    );
}
