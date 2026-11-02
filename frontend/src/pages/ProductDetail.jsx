import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    ArrowLeft,
    MessageCircleQuestion,
    PackageOpen,
    Send,
    ShoppingBag,
    Sparkles,
    Star,
} from "lucide-react";
import ProductCard from "@/components/ProductCard";
import AddToCartButton from "@/components/AddToCartButton";
import { Button } from "@/components/ui/button";
import api from "@/api/axios";
import { getIntlLocale, t } from "@/i18n";
import { useAuthStore } from "@/store/useAuthStore";

const formatPrice = (price) =>
    `৳${new Intl.NumberFormat(getIntlLocale()).format(Number(price) || 0)}`;

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
    const [rating, setRating] = useState("5");
    const [reviewComment, setReviewComment] = useState("");
    const [questionText, setQuestionText] = useState("");
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [questionSubmitting, setQuestionSubmitting] = useState(false);
    const [reviewError, setReviewError] = useState("");
    const [questionError, setQuestionError] = useState("");
    const [reviewNotice, setReviewNotice] = useState("");
    const [questionNotice, setQuestionNotice] = useState("");
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const user = useAuthStore((state) => state.user);

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
    const reviews = product?.reviews ?? [];
    const questions = product?.questions ?? [];

    const submitReview = async (event) => {
        event.preventDefault();
        setReviewSubmitting(true);
        setReviewError("");
        setReviewNotice("");

        try {
            const response = await api.post(`/products/${id}/reviews`, {
                rating: Number(rating),
                comment: reviewComment.trim() || null,
            });
            const submittedReview = response.data.review;

            setProductResult((current) => {
                if (!current || current.id !== id) return current;

                const nextReviews = [
                    submittedReview,
                    ...(current.product.reviews ?? []).filter(
                        (review) => review.id !== submittedReview.id,
                    ),
                ];

                return {
                    ...current,
                    product: {
                        ...current.product,
                        reviews: nextReviews,
                        average_rating: (
                            nextReviews.reduce(
                                (total, review) => total + Number(review.rating),
                                0,
                            ) / nextReviews.length
                        ).toFixed(1),
                    },
                };
            });
            setReviewComment("");
            setReviewNotice(t("Your review has been published."));
        } catch (requestError) {
            setReviewError(
                requestError.response?.data?.message ||
                    t("Your review could not be submitted. Please try again."),
            );
        } finally {
            setReviewSubmitting(false);
        }
    };

    const submitQuestion = async (event) => {
        event.preventDefault();
        if (!questionText.trim()) {
            setQuestionError(t("Please enter a question."));
            return;
        }

        setQuestionSubmitting(true);
        setQuestionError("");
        setQuestionNotice("");

        try {
            const response = await api.post(`/products/${id}/questions`, {
                question: questionText.trim(),
            });
            const submittedQuestion = response.data.question;

            setProductResult((current) => {
                if (!current || current.id !== id) return current;
                return {
                    ...current,
                    product: {
                        ...current.product,
                        questions: [
                            submittedQuestion,
                            ...(current.product.questions ?? []),
                        ],
                    },
                };
            });
            setQuestionText("");
            setQuestionNotice(t("Your question has been sent to the team."));
        } catch (requestError) {
            setQuestionError(
                requestError.response?.data?.message ||
                    t("Your question could not be submitted. Please try again."),
            );
        } finally {
            setQuestionSubmitting(false);
        }
    };

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
                <h1 className="text-2xl font-bold">{t("Product unavailable")}</h1>
                <p role="alert" className="mt-3 text-muted-foreground">
                    {t(error || "This product could not be found.")}
                </p>
                <Button asChild className="mt-6 gap-2 px-4">
                    <Link to="/products" className="inline-flex items-center gap-2">
                        <ArrowLeft aria-hidden="true" />
                        {t("Back to catalog")}
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
                {t("Back to catalog")}
            </Link>

            <section className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
                <ProductImage key={product.id} product={product} />

                <div className="flex flex-row flex-wrap items-center gap-3 lg:py-4">
                    {product.category?.name && (
                        <p className="text-sm font-semibold tracking-wide text-primary uppercase">
                            {t(product.category.name)}
                        </p>
                    )}
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                        {product.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-4">
                        <p className="text-2xl font-bold text-primary">
                            {formatPrice(product.discount_price ?? product.price)}
                        </p>
                        {product.discount_price !== null &&
                            product.discount_price !== undefined && (
                                <p className="text-lg text-muted-foreground line-through">
                                    {formatPrice(product.price)}
                                </p>
                            )}
                        {Number(product.average_rating) > 0 && (
                            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                                <Star
                                    className="size-4 fill-amber-400 text-amber-400"
                                    aria-hidden="true"
                                />
                                {Number(product.average_rating).toFixed(1)}
                                {product.reviews?.length > 0 &&
                                    ` (${t(":count reviews", {
                                        count: product.reviews.length,
                                    })})`}
                            </span>
                        )}
                    </div>
                    <p className={`text-sm ${Number(product.stock) > 0 ? "text-muted-foreground" : "font-medium text-destructive"}`}>
                        {Number(product.stock) > 0
                            ? t(":count in stock", { count: product.stock })
                            : t("Out of stock")}
                    </p>
                    <div className="border-t border-border pt-5">
                        <h2 className="mb-2 text-lg font-semibold">
                            {t("Product details")}
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
                            {t("Continue shopping")}
                        </Link>
                    </Button>
                </div>
            </section>

            <section className="grid gap-8 lg:grid-cols-2">
                <section aria-labelledby="reviews-heading" className="space-y-5">
                    <div className="flex items-start gap-3">
                        <Star
                            className="mt-1 size-5 shrink-0 fill-amber-400 text-amber-400"
                            aria-hidden="true"
                        />
                        <div>
                            <h2 id="reviews-heading" className="text-2xl font-bold tracking-tight">
                                {t("Customer reviews")}
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {t(":count reviews", { count: reviews.length })}
                            </p>
                        </div>
                    </div>

                    {isAuthenticated ? user?.email_verified_at ? (
                        <form onSubmit={submitReview} className="space-y-4 rounded-xl border border-border bg-card p-5">
                            <h3 className="font-semibold">{t("Share your experience")}</h3>
                            <fieldset className="space-y-2">
                                <legend className="text-sm font-medium">{t("Your rating")}</legend>
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((value) => (
                                        <span key={value}>
                                            <input
                                                id={`rating-${id}-${value}`}
                                                className="peer sr-only"
                                                type="radio"
                                                name={`rating-${id}`}
                                                value={value}
                                                checked={Number(rating) === value}
                                                onChange={(event) => setRating(event.target.value)}
                                                aria-label={t(":count stars", { count: value })}
                                            />
                                            <label
                                                htmlFor={`rating-${id}-${value}`}
                                                className="inline-flex cursor-pointer rounded-sm p-1 text-muted-foreground transition-colors hover:text-amber-400 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
                                            >
                                                <Star
                                                    className={`size-7 ${Number(rating) >= value ? "fill-amber-400 text-amber-400" : ""}`}
                                                    aria-hidden="true"
                                                />
                                            </label>
                                        </span>
                                    ))}
                                </div>
                            </fieldset>
                            <label className="flex flex-col gap-2 text-sm font-medium">
                                {t("Review (optional)")}
                                <textarea
                                    maxLength={1000}
                                    rows={3}
                                    value={reviewComment}
                                    onChange={(event) => setReviewComment(event.target.value)}
                                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                                />
                            </label>
                            {reviewError && <p role="alert" className="text-sm text-destructive">{reviewError}</p>}
                            {reviewNotice && <p role="status" className="text-sm text-green-700 dark:text-green-400">{reviewNotice}</p>}
                            <Button type="submit" disabled={reviewSubmitting}>
                                <Send aria-hidden="true" />
                                {reviewSubmitting ? t("Submitting...") : t("Submit review")}
                            </Button>
                            <p className="text-xs text-muted-foreground">
                                {t("Only customers who purchased this product can review it.")}
                            </p>
                        </form>
                    ) : (
                        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                            {t("Verify your email before submitting a review or question.")}{" "}
                            <Link className="font-medium text-primary underline" to="/verify-email">{t("Verify email")}</Link>
                        </p>
                    ) : (
                        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                            <Link className="font-medium text-primary underline" to="/login">{t("Log in")}</Link>
                            {" "}{t("to submit a review.")}
                        </p>
                    )}

                    {reviews.length ? (
                        <div className="space-y-3">
                            {reviews.map((review) => (
                                <article key={review.id} className="rounded-xl border border-border bg-card p-5">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="font-semibold">{review.user}</p>
                                        <time className="text-xs text-muted-foreground">{review.created_at}</time>
                                    </div>
                                    <p className="mt-2 flex items-center gap-1 text-sm" aria-label={t("out of :count stars", { count: review.rating })}>
                                        {Array.from({ length: 5 }, (_, index) => (
                                            <Star
                                                key={index}
                                                className={`size-4 ${index < Number(review.rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
                                                aria-hidden="true"
                                            />
                                        ))}
                                        <span className="ml-1">{review.rating}/5</span>
                                    </p>
                                    {review.comment && (
                                        <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                                            {review.comment}
                                        </p>
                                    )}
                                </article>
                            ))}
                        </div>
                    ) : (
                        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                            {t("No reviews yet. Be the first to share your experience.")}
                        </p>
                    )}
                </section>

                <section aria-labelledby="questions-heading" className="space-y-5">
                    <div className="flex items-start gap-3">
                        <MessageCircleQuestion
                            className="mt-1 size-5 shrink-0 text-primary"
                            aria-hidden="true"
                        />
                        <div>
                            <h2 id="questions-heading" className="text-2xl font-bold tracking-tight">
                                {t("Questions & answers")}
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {t("Ask our team about this product.")}
                            </p>
                        </div>
                    </div>

                    {isAuthenticated ? user?.email_verified_at ? (
                        <form onSubmit={submitQuestion} className="space-y-4 rounded-xl border border-border bg-card p-5">
                            <label className="flex flex-col gap-2 text-sm font-medium">
                                {t("Your question")}
                                <textarea
                                    required
                                    maxLength={1000}
                                    rows={3}
                                    value={questionText}
                                    onChange={(event) => setQuestionText(event.target.value)}
                                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                                />
                            </label>
                            {questionError && <p role="alert" className="text-sm text-destructive">{questionError}</p>}
                            {questionNotice && <p role="status" className="text-sm text-green-700 dark:text-green-400">{questionNotice}</p>}
                            <Button type="submit" disabled={questionSubmitting}>
                                <Send aria-hidden="true" />
                                {questionSubmitting ? t("Sending...") : t("Send question")}
                            </Button>
                        </form>
                    ) : (
                        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                            {t("Verify your email before submitting a review or question.")}{" "}
                            <Link className="font-medium text-primary underline" to="/verify-email">{t("Verify email")}</Link>
                        </p>
                    ) : (
                        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                            <Link className="font-medium text-primary underline" to="/login">{t("Log in")}</Link>
                            {" "}{t("to ask a question.")}
                        </p>
                    )}

                    {questions.length ? (
                        <div className="space-y-3">
                            {questions.map((question) => (
                                <article key={question.id} className="space-y-3 rounded-xl border border-border bg-card p-5">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="font-semibold">{question.user}</p>
                                        <time className="text-xs text-muted-foreground">{question.created_at}</time>
                                    </div>
                                    <p className="whitespace-pre-wrap text-sm">{question.question}</p>
                                    {question.answer ? (
                                        <div className="rounded-lg bg-muted/50 p-4">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                                                {t("Answer from PonnoKini")}
                                            </p>
                                            <p className="mt-2 whitespace-pre-wrap text-sm">{question.answer}</p>
                                            {question.answered_by && (
                                                <p className="mt-2 text-xs text-muted-foreground">
                                                    {t("Answered by :name", { name: question.answered_by })}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">{t("Waiting for the team to answer.")}</p>
                                    )}
                                </article>
                            ))}
                        </div>
                    ) : (
                        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                            {t("No questions yet. Ask the first question.")}
                        </p>
                    )}
                </section>
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
                            {t("You might also like")}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t("Relevant picks selected for this product.")}
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
                        {t("There are no related products to show right now.")}
                    </p>
                )}
            </section>
        </div>
    );
}
