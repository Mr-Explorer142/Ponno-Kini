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
    const [added, setAdded] = useState(false);

    const handleAdd = () => {
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
        >
            {added ? (
                <Check aria-hidden="true" />
            ) : (
                <ShoppingCart aria-hidden="true" />
            )}
            {t(added ? "Added to cart" : "Add to Cart")}
        </Button>
    );
}
