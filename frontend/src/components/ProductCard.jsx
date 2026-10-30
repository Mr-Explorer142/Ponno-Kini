import { useState } from "react";
import { Link } from "react-router-dom";
import { PackageOpen, Star } from "lucide-react";

const formatPrice = (price) =>
    `৳${new Intl.NumberFormat("en-BD").format(Number(price) || 0)}`;

function ProductImage({ product }) {
    const [imageFailed, setImageFailed] = useState(false);

    return (
        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-secondary/60">
            {product.image_url && !imageFailed ? (
                <img
                    src={product.image_url}
                    alt={product.name}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={() => setImageFailed(true)}
                />
            ) : (
                <PackageOpen
                    className="size-12 text-primary/50"
                    aria-hidden="true"
                />
            )}
        </div>
    );
}

export default function ProductCard({ product, badge }) {
    return (
        <article className="group min-w-0 overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg hover:shadow-orange-950/5">
            <Link
                to={`/products/${product.id}`}
                className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
                <div className="relative">
                    <ProductImage product={product} />
                    {badge && (
                        <span className="absolute top-3 left-3 rounded-full bg-background/95 px-3 py-1 text-xs font-semibold text-primary shadow-sm">
                            {badge}
                        </span>
                    )}
                </div>
                <div className="space-y-2 p-3 sm:p-4">
                    {product.category?.name && (
                        <p className="truncate text-xs text-muted-foreground">
                            {product.category.name}
                        </p>
                    )}
                    <h3 className="line-clamp-2 min-h-10 text-sm font-semibold text-foreground sm:text-base">
                        {product.name}
                    </h3>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-primary">
                            {formatPrice(product.price)}
                        </span>
                        {Number(product.average_rating) > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Star
                                    className="size-3.5 fill-amber-400 text-amber-400"
                                    aria-hidden="true"
                                />
                                {Number(product.average_rating).toFixed(1)}
                            </span>
                        )}
                    </div>
                </div>
            </Link>
        </article>
    );
}
