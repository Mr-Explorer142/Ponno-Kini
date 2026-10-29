import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    ArrowRight,
    BookOpen,
    Check,
    ChevronRight,
    HeartHandshake,
    House,
    PackageOpen,
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

const formatPrice = (price) =>
    `৳${new Intl.NumberFormat("en-BD").format(Number(price) || 0)}`;

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
                    {title}
                </h2>
                {description && (
                    <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                        {description}
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

function ProductCard({ product, badge }) {
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
                {error}
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
                            `We couldn't load ${section.label}. Please refresh the page to try again.`;
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
                            GOOD FINDS, ALL IN ONE PLACE
                        </p>
                        <h1 className="text-4xl leading-[1.08] font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                            Find your next{" "}
                            <span className="text-primary">favorite thing.</span>
                        </h1>
                        <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
                            Discover thoughtful picks for your home, your
                            everyday, and everything in between.
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
                                Shop now
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
                            Curated picks, delivered nationwide
                        </div>
                    </div>
                    <div className="mx-auto w-full max-w-md">
                        <img
                            src={heroArt}
                            alt="Illustration of PonnoKini shopping bags"
                            className="w-full rounded-2xl"
                            fetchPriority="high"
                        />
                    </div>
                </div>
            </section>

            <section aria-labelledby="categories-heading">
                <SectionHeading
                    id="categories-heading"
                    eyebrow="Explore"
                    title="Find your kind of thing"
                    description="Browse the collections that make shopping a little easier."
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
                                            {category.name}
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
                        New collections are on the way. Check back soon.
                    </p>
                )}
            </section>

            <section aria-labelledby="bestsellers-heading">
                <SectionHeading
                    id="bestsellers-heading"
                    eyebrow="Customer favorites"
                    title="Best sellers"
                    description="Popular picks ranked by quantity in successfully paid orders."
                    href="/products?sort=best_selling"
                    linkLabel="Shop best sellers"
                />
                <ProductGrid
                    products={bestSellers}
                    loading={loading.bestSellers}
                    error={errors.bestSellers}
                    emptyMessage="Our best sellers are coming soon. Explore the catalog to find your next favorite."
                    badge={(index) => (index === 0 ? "Customer favorite" : null)}
                />
            </section>

            <section aria-labelledby="new-drops-heading">
                <SectionHeading
                    id="new-drops-heading"
                    eyebrow="Just arrived"
                    title="New drops"
                    description="The latest additions to the PonnoKini collection."
                    href="/products?sort=latest"
                    linkLabel="See all new arrivals"
                />
                <ProductGrid
                    products={newDrops}
                    loading={loading.newDrops}
                    error={errors.newDrops}
                    emptyMessage="We're adding new products soon. In the meantime, take a look at the catalog."
                    badge={(index) => (index === 0 ? "Just added" : null)}
                />
            </section>

            <section
                aria-labelledby="deals-heading"
                className="overflow-hidden rounded-3xl border border-border bg-gradient-to-r from-orange-100 via-orange-50 to-amber-100 p-6 dark:from-background dark:via-secondary dark:to-background sm:p-9"
            >
                <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
                    <div className="max-w-2xl">
                        <p className="mb-2 text-sm font-semibold tracking-wide text-primary uppercase">
                            Worth keeping an eye on
                        </p>
                        <h2
                            id="deals-heading"
                            className="text-2xl font-bold tracking-tight sm:text-3xl"
                        >
                            Limited-time deals
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                            No active promotions right now. Browse the catalog
                            and check back soon for upcoming offers.
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
                            Explore the catalog
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
                    eyebrow="Shop with confidence"
                    title="A better way to shop"
                    description="The little things that make every order feel easier."
                />
                <div className="grid gap-6 sm:grid-cols-3 sm:gap-5">
                    {customerBenefits.map(({ icon: Icon, title, description }) => (
                        <div key={title} className="flex items-start gap-4">
                            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
                                <Icon className="size-6" aria-hidden="true" />
                            </span>
                            <div>
                                <h3 className="font-semibold text-foreground">
                                    {title}
                                </h3>
                                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                    {description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section aria-labelledby="reviews-heading">
                <SectionHeading
                    id="reviews-heading"
                    eyebrow="Kind words"
                    title="What shoppers are saying"
                    description="Thoughts shared by customers who have shopped with us."
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
                                    aria-label={`${review.rating} out of 5 stars`}
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
                                            ? `Reviewed ${review.product.name}`
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
                            Your experience could be the first story here.
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Shop a favorite and share what you think.
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
                                Explore products
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
