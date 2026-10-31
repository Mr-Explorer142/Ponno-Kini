import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    ArrowRight,
    BookOpen,
    Check,
    ChevronRight,
    HeartHandshake,
    House,
    RefreshCw,
    ShieldCheck,
    ShoppingBag,
    Smartphone,
    Sparkles,
    Star,
    Truck,
    Watch,
} from "lucide-react";
import heroArt from "@/assets/home-hero.svg";
import api from "@/api/axios";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/ProductCard";
import { t } from "@/i18n";

const categoryIcons = [
    { match: /electronic|gadget|tech/, icon: Smartphone },
    { match: /fashion|apparel|accessor|beauty/, icon: Watch },
    { match: /home|kitchen|furniture/, icon: House },
    { match: /book|stationery|school/, icon: BookOpen },
    { match: /sport|outdoor|fitness/, icon: HeartHandshake },
];

const customerBenefits = [
    {
        icon: Truck,
        title: "Nationwide delivery",
        description: "Reliable delivery to customers across Bangladesh.",
    },
    {
        icon: ShieldCheck,
        title: "Secure digital payments",
        description: "Checkout protected by trusted SSLCommerz payments.",
    },
    {
        icon: RefreshCw,
        title: "Returns & exchanges",
        description: "Our team is here to help if something is not right.",
    },
];

function SectionHeading({ id, eyebrow, title, description, href, linkLabel }) {
    return (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
                <p className="mb-2 text-sm font-semibold tracking-wide text-primary uppercase">
                    {eyebrow}
                </p>
                <h2
                    id={id}
                    className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
                >
                    {t(title)}
                </h2>
                {description && (
                    <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                        {t(description)}
                    </p>
                )}
            </div>
            {href && (
                <Link
                    to={href}
                    className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                    {linkLabel}
                    <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
            )}
        </div>
    );
}

function ProductGrid({ products, loading, error, emptyMessage, badge }) {
    if (loading) {
        return (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                    <div
                        key={index}
                        className="aspect-[4/5] animate-pulse rounded-2xl bg-secondary"
                    />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {t(error)}
            </p>
        );
    }

    if (!products.length) {
        return (
            <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
                {emptyMessage}
            </p>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {products.slice(0, 4).map((product, index) => (
                <ProductCard
                    key={product.id}
                    product={product}
                    badge={badge?.(index)}
                />
            ))}
        </div>
    );
}

export default function Home() {
    const [categories, setCategories] = useState([]);
    const [bestSellers, setBestSellers] = useState([]);
    const [newDrops, setNewDrops] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState({
        categories: true,
        bestSellers: true,
        newDrops: true,
        reviews: true,
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        const controller = new AbortController();
        const sections = [
            {
                key: "categories",
                label: "categories",
                request: () => api.get("/categories", { signal: controller.signal }),
                setData: setCategories,
            },
            {
                key: "bestSellers",
                label: "best sellers",
                request: () =>
                    api.get("/products", {
                        params: { sort: "best_selling" },
                        signal: controller.signal,
                    }),
                setData: setBestSellers,
            },
            {
                key: "newDrops",
                label: "new arrivals",
                request: () =>
                    api.get("/products", {
                        params: { sort: "latest" },
                        signal: controller.signal,
                    }),
                setData: setNewDrops,
            },
            {
                key: "reviews",
                label: "customer reviews",
                request: () => api.get("/reviews", { signal: controller.signal }),
                setData: setReviews,
            },
        ];

        Promise.allSettled(sections.map((section) => section.request())).then(
            (results) => {
                if (controller.signal.aborted) return;

                const nextErrors = {};
                results.forEach((result, index) => {
                    const section = sections[index];
                    if (result.status === "fulfilled") {
                        section.setData(result.value.data.data ?? []);
                    } else {
                        console.error(
                            `Unable to load homepage ${section.label}:`,
                            result.reason,
                        );
                        nextErrors[section.key] =
                            t(
                                "We couldn't load :section. Please refresh the page to try again.",
                                { section: t(section.label) },
                            );
                    }
                    setLoading((current) => ({
                        ...current,
                        [section.key]: false,
                    }));
                });
                setErrors(nextErrors);
            },
        );

        return () => controller.abort();
    }, []);

    return (
        <div className="space-y-14 pb-8 sm:space-y-20">
            <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-orange-50 via-orange-100 to-amber-100 px-5 py-9 dark:from-background dark:via-secondary dark:to-background sm:px-10 sm:py-12 lg:px-14 lg:py-16">
                <div className="pointer-events-none absolute -top-20 -right-20 -z-10 size-64 rounded-full bg-orange-200/50 blur-3xl dark:bg-primary/10" />
                <div className="grid items-center gap-8 md:grid-cols-[1.05fr_0.95fr] lg:gap-12">
                    <div className="max-w-xl">
                        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs font-semibold tracking-wide text-primary sm:text-sm">
                            <Sparkles className="size-4" aria-hidden="true" />
                            {t("Good finds, all in one place")}
                        </p>
                        <h1 className="text-4xl leading-[1.08] font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                            {t("Find your next favorite thing.")}
                        </h1>
                        <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
                            {t("Discover thoughtful picks for your home, your everyday, and everything in between.")}
                        </p>
                        <Button
                            asChild
                            size="lg"
                            className="mt-7 h-11 rounded-full px-6 text-base"
                        >
                            <Link
                                to="/products"
                                className="inline-flex items-center gap-2"
                            >
                                {t("Shop now")}
                                <ArrowRight
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            </Link>
                        </Button>
                        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                            <Check
                                className="size-4 text-primary"
                                aria-hidden="true"
                            />
                            {t("Curated picks, delivered nationwide")}
                        </div>
                    </div>
                    <div className="mx-auto w-full max-w-md">
                        <img
                            src={heroArt}
                            alt={t("Illustration of PonnoKini shopping bags")}
                            className="w-full rounded-2xl"
                            fetchPriority="high"
                        />
                    </div>
                </div>
            </section>

            <section aria-labelledby="categories-heading">
                <SectionHeading
                    id="categories-heading"
                    eyebrow={t("Explore")}
                    title={t("Find your kind of thing")}
                    description={t("Browse the collections that make shopping a little easier.")}
                />
                {loading.categories ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        {Array.from({ length: 5 }, (_, index) => (
                            <div
                                key={index}
                                className="h-36 animate-pulse rounded-2xl bg-secondary"
                            />
                        ))}
                    </div>
                ) : errors.categories ? (
                    <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                        {errors.categories}
                    </p>
                ) : categories.length ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
                        {categories.slice(0, 5).map((category, index) => {
                            const Icon =
                                categoryIcons.find(({ match }) =>
                                    match.test(category.name),
                                )?.icon ?? categoryIcons[index % categoryIcons.length].icon;
                            return (
                                <Link
                                    key={category.id}
                                    to={`/products?category_id=${category.id}`}
                                    className="group flex min-h-36 flex-col justify-between rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg hover:shadow-orange-950/5 sm:p-5"
                                >
                                    <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                                        <Icon
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <span className="mt-4 flex items-center justify-between gap-2 text-sm font-semibold text-foreground sm:text-base">
                                        <span className="line-clamp-2">
                                            {t(category.name)}
                                        </span>
                                        <ChevronRight
                                            className="size-4 shrink-0 text-muted-foreground"
                                            aria-hidden="true"
                                        />
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
                        {t("New collections are on the way. Check back soon.")}
                    </p>
                )}
            </section>

            <section aria-labelledby="bestsellers-heading">
                <SectionHeading
                    id="bestsellers-heading"
                    eyebrow={t("Customer favorites")}
                    title={t("Best sellers")}
                    description={t("Popular picks ranked by quantity in successfully paid orders.")}
                    href="/products?sort=best_selling"
                    linkLabel={t("Shop best sellers")}
                />
                <ProductGrid
                    products={bestSellers}
                    loading={loading.bestSellers}
                    error={errors.bestSellers}
                    emptyMessage={t("Our best sellers are coming soon. Explore the catalog to find your next favorite.")}
                    badge={(index) => (index === 0 ? t("Customer favorite") : null)}
                />
            </section>

            <section aria-labelledby="new-drops-heading">
                <SectionHeading
                    id="new-drops-heading"
                    eyebrow={t("Just arrived")}
                    title={t("New drops")}
                    description={t("The latest additions to the PonnoKini collection.")}
                    href="/products?sort=latest"
                    linkLabel={t("See all new arrivals")}
                />
                <ProductGrid
                    products={newDrops}
                    loading={loading.newDrops}
                    error={errors.newDrops}
                    emptyMessage={t("We're adding new products soon. In the meantime, take a look at the catalog.")}
                    badge={(index) => (index === 0 ? t("Just added") : null)}
                />
            </section>

            <section
                aria-labelledby="deals-heading"
                className="overflow-hidden rounded-3xl border border-border bg-gradient-to-r from-orange-100 via-orange-50 to-amber-100 p-6 dark:from-background dark:via-secondary dark:to-background sm:p-9"
            >
                <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
                    <div className="max-w-2xl">
                        <p className="mb-2 text-sm font-semibold tracking-wide text-primary uppercase">
                            {t("Worth keeping an eye on")}
                        </p>
                        <h2
                            id="deals-heading"
                            className="text-2xl font-bold tracking-tight sm:text-3xl"
                        >
                            {t("Limited-time deals")}
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                            {t("No active promotions right now. Browse the catalog and check back soon for upcoming offers.")}
                        </p>
                    </div>
                    <Button
                        asChild
                        variant="outline"
                        className="shrink-0 rounded-full border-border bg-card"
                    >
                        <Link
                            to="/products"
                            className="inline-flex items-center gap-2"
                        >
                            {t("Explore the catalog")}
                            <ArrowRight
                                className="size-4"
                                aria-hidden="true"
                            />
                        </Link>
                    </Button>
                </div>
            </section>

            <section
                aria-labelledby="benefits-heading"
                className="rounded-3xl bg-card px-5 py-8 ring-1 ring-border sm:px-8 sm:py-10"
            >
                <SectionHeading
                    id="benefits-heading"
                    eyebrow={t("Shop with confidence")}
                    title={t("A better way to shop")}
                    description={t("The little things that make every order feel easier.")}
                />
                <div className="grid gap-6 sm:grid-cols-3 sm:gap-5">
                    {customerBenefits.map(({ icon: Icon, title, description }) => (
                        <div key={title} className="flex items-start gap-4">
                            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
                                <Icon className="size-6" aria-hidden="true" />
                            </span>
                            <div>
                                <h3 className="font-semibold text-foreground">
                                    {t(title)}
                                </h3>
                                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                    {t(description)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section aria-labelledby="reviews-heading">
                <SectionHeading
                    id="reviews-heading"
                    eyebrow={t("Kind words")}
                    title={t("What shoppers are saying")}
                    description={t("Thoughts shared by customers who have shopped with us.")}
                />
                {loading.reviews ? (
                    <div className="grid gap-4 md:grid-cols-3">
                        {Array.from({ length: 3 }, (_, index) => (
                            <div
                                key={index}
                                className="h-48 animate-pulse rounded-2xl bg-secondary"
                            />
                        ))}
                    </div>
                ) : errors.reviews ? (
                    <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                        {errors.reviews}
                    </p>
                ) : reviews.length ? (
                    <div className="grid gap-4 md:grid-cols-3">
                        {reviews.slice(0, 3).map((review) => (
                            <article
                                key={review.id}
                                className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 sm:p-6"
                            >
                                <div
                                    className="flex gap-1 text-amber-400"
                                    aria-label={t("out of :count stars", {
                                        count: review.rating,
                                    })}
                                >
                                    {Array.from({ length: 5 }, (_, index) => (
                                        <Star
                                            key={index}
                                            className={`size-4 ${index < review.rating ? "fill-current" : "text-secondary"}`}
                                            aria-hidden="true"
                                        />
                                    ))}
                                </div>
                                <p className="mt-4 flex-1 text-sm leading-relaxed text-foreground">
                                    {review.comment}
                                </p>
                                <div className="mt-5 border-t border-border pt-4">
                                    <p className="font-semibold text-foreground">
                                        {review.user}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {review.product?.name
                                            ? t("Reviewed :product", {
                                                  product: review.product.name,
                                              })
                                            : review.created_at}
                                    </p>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-border bg-card p-6 text-center">
                        <ShoppingBag
                            className="mx-auto size-8 text-primary"
                            aria-hidden="true"
                        />
                        <p className="mt-3 font-semibold text-foreground">
                            {t("Your experience could be the first story here.")}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t("Shop a favorite and share what you think.")}
                        </p>
                        <Button
                            asChild
                            variant="outline"
                            className="mt-4 rounded-full"
                        >
                            <Link
                                to="/products"
                                className="inline-flex items-center gap-2"
                            >
                                {t("Explore products")}
                                <ArrowRight
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            </Link>
                        </Button>
                    </div>
                )}
            </section>
        </div>
    );
}
