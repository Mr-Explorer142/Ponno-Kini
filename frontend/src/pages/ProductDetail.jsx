import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    ArrowLeft,
    PackageOpen,
    ShoppingBag,
    Sparkles,
    Star,
} from "lucide-react";
import ProductCard from "@/components/ProductCard";
import AddToCartButton from "@/components/AddToCartButton";
import { Button } from "@/components/ui/button";
import api from "@/api/axios";

const formatPrice = (price) =>
    `৳${new Intl.NumberFormat("en-BD").format(Number(price) || 0)}`;

function ProductImage({ product }) {
    const [imageFailed, setImageFailed] = useState(false);

    return (
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-border bg-secondary/50">
            {product.image_url && !imageFailed ? (
                <img
                    src={product.image_url}
                    alt={product.name}
                    className="size-full object-cover"
                    onError={() => setImageFailed(true)}
                />
            ) : (
                <PackageOpen
                    className="size-20 text-primary/40"
                    aria-hidden="true"
                />
            )}
        </div>
    );
}

export default function ProductDetail() {
    const { id } = useParams();
    const [productResult, setProductResult] = useState(null);
    const [recommendationResult, setRecommendationResult] = useState(null);

    useEffect(() => {
        const controller = new AbortController();

        const loadProduct = async () => {
            try {
                const response = await api.get(`/product/${id}`, {
                    signal: controller.signal,
                });
                if (controller.signal.aborted) return;

                setProductResult({
                    id,
                    product: response.data.data ?? response.data,
                    error: "",
                });

                try {
                    const recommendationResponse = await api.post(
                        `/products/${id}/recommendations`,
                        {},
                        { signal: controller.signal },
                    );
                    if (!controller.signal.aborted) {
                        setRecommendationResult({
                            id,
                            recommendations:
                                recommendationResponse.data.data ?? [],
                            error: "",
                        });
                    }
                } catch (requestError) {
                    if (controller.signal.aborted) return;
                    console.error(
                        "Unable to load product recommendations:",
                        requestError,
                    );
                    if (!controller.signal.aborted) {
                        setRecommendationResult({
                            id,
                            recommendations: [],
                            error: "Recommendations are temporarily unavailable.",
                        });
                    }
                }
            } catch (requestError) {
                if (controller.signal.aborted) return;
                console.error("Unable to load product details:", requestError);
                setProductResult({
                    id,
                    product: null,
                    error:
                        requestError.response?.status === 404
                            ? "This product could not be found."
                            : "We couldn't load this product. Please try again.",
                });
            }
        };

        loadProduct();

        return () => controller.abort();
    }, [id]);

    const productState = productResult?.id === id ? productResult : null;
    const recommendationState =
        recommendationResult?.id === id ? recommendationResult : null;
    const loading = !productState;
    const product = productState?.product;
    const error = productState?.error;
    const recommendationsLoading = Boolean(
        product && !recommendationState,
    );
    const recommendations = recommendationState?.recommendations ?? [];
    const recommendationsError = recommendationState?.error;

    if (loading) {
        return (
            <div className="mx-auto max-w-5xl animate-pulse space-y-6">
                <div className="h-5 w-32 rounded bg-secondary" />
                <div className="grid gap-8 md:grid-cols-2">
                    <div className="aspect-square rounded-2xl bg-secondary" />
                    <div className="space-y-4 py-4">
                        <div className="h-8 w-3/4 rounded bg-secondary" />
                        <div className="h-6 w-1/3 rounded bg-secondary" />
                        <div className="h-24 rounded bg-secondary" />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="mx-auto max-w-2xl py-16 text-center">
                <h1 className="text-2xl font-bold">Product unavailable</h1>
                <p role="alert" className="mt-3 text-muted-foreground">
                    {error || "This product could not be found."}
                </p>
                <Button asChild className="mt-6 gap-2 px-4">
                    <Link to="/products" className="inline-flex items-center gap-2">
                        <ArrowLeft aria-hidden="true" />
                        Back to catalog
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-14 pb-10">
            <Link
                to="/products"
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
            >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to catalog
            </Link>

            <section className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
                <ProductImage key={product.id} product={product} />

                <div className="flex flex-row flex-wrap items-center gap-3 lg:py-4">
                    {product.category?.name && (
                        <p className="text-sm font-semibold tracking-wide text-primary uppercase">
                            {product.category.name}
                        </p>
                    )}
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                        {product.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-4">
                        <p className="text-2xl font-bold text-primary">
                            {formatPrice(product.price)}
                        </p>
                        {Number(product.average_rating) > 0 && (
                            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                                <Star
                                    className="size-4 fill-amber-400 text-amber-400"
                                    aria-hidden="true"
                                />
                                {Number(product.average_rating).toFixed(1)}
                                {product.reviews?.length > 0 &&
                                    ` (${product.reviews.length} reviews)`}
                            </span>
                        )}
                    </div>
                    <div className="border-t border-border pt-5">
                        <h2 className="mb-2 text-lg font-semibold">
                            Product details
                        </h2>
                        <p className="leading-relaxed whitespace-pre-line text-muted-foreground">
                            {product.description}
                        </p>
                    </div>
                    <AddToCartButton product={product} size="lg" />
                    <Button
                        asChild
                        size="lg"
                        variant="outline"
                        className="gap-2 px-4"
                    >
                        <Link
                            to="/products"
                            className="inline-flex items-center gap-2"
                        >
                            <ShoppingBag aria-hidden="true" />
                            Continue shopping
                        </Link>
                    </Button>
                </div>
            </section>

            <section aria-labelledby="recommendations-heading">
                <div className="mb-6 flex items-start gap-3">
                    <Sparkles
                        className="mt-1 size-5 shrink-0 text-primary"
                        aria-hidden="true"
                    />
                    <div>
                        <h2
                            id="recommendations-heading"
                            className="text-2xl font-bold tracking-tight"
                        >
                            You might also like
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Relevant picks selected for this product.
                        </p>
                    </div>
                </div>
                {recommendationsLoading ? (
                    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
                        {Array.from({ length: 4 }, (_, index) => (
                            <div
                                key={index}
                                className="aspect-[4/5] animate-pulse rounded-2xl bg-secondary"
                            />
                        ))}
                    </div>
                ) : recommendationsError ? (
                    <p
                        role="status"
                        className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground"
                    >
                        {recommendationsError}
                    </p>
                ) : recommendations.length ? (
                    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
                        {recommendations.map((recommendedProduct) => (
                            <ProductCard
                                key={recommendedProduct.id}
                                product={recommendedProduct}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                        There are no related products to show right now.
                    </p>
                )}
            </section>
        </div>
    );
}
