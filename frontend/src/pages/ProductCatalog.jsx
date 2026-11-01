import { useEffect, useState } from "react";
import { ArrowDownWideNarrow, SlidersHorizontal, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/api/axios";
import { t } from "@/i18n";

const SORT_OPTIONS = [
    { value: "latest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "price_asc", label: "Price: low to high" },
    { value: "price_desc", label: "Price: high to low" },
    { value: "best_selling", label: "Best selling" },
];

function CatalogFilters({
    searchParams,
    updateFilter,
    categories,
    onApply,
    onClose,
    mobile = false,
}) {
    return (
        <form
            onSubmit={onApply}
            className={`space-y-4 rounded-2xl border border-border bg-card p-4 ${
                mobile
                    ? ""
                    : "lg:grid lg:grid-cols-[minmax(12rem,1.5fr)_repeat(2,minmax(8rem,1fr))_auto] lg:items-end lg:gap-4 lg:space-y-0"
            }`}
        >
            <div className={`flex items-center justify-between ${mobile ? "" : "lg:col-span-full"}`}>
                <h2 className="font-semibold">{t("Filters")}</h2>
                {mobile && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t("Close filters")}
                        onClick={onClose}
                    >
                        <X aria-hidden="true" />
                    </Button>
                )}
            </div>

            <label className="flex flex-col gap-2 text-sm font-medium">
                {t("Category")}
                <select
                    value={searchParams.get("category_id") ?? ""}
                    onChange={(event) =>
                        updateFilter("category_id", event.target.value)
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                    <option value="">{t("All categories")}</option>
                    {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                            {t(category.name)}
                        </option>
                    ))}
                </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium">
                {t("Min price")}
                <Input
                    type="number"
                    min="0"
                    name="min_price"
                    defaultValue={searchParams.get("min_price") ?? ""}
                    placeholder="৳0"
                />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
                {t("Max price")}
                <Input
                    type="number"
                    min="0"
                    name="max_price"
                    defaultValue={searchParams.get("max_price") ?? ""}
                    placeholder={t("Any")}
                />
            </label>

            <Button type="submit" className="h-10 w-full">
                <SlidersHorizontal aria-hidden="true" />
                {t("Apply")}
            </Button>
        </form>
    );
}

function ProductSkeleton() {
    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">
            {Array.from({ length: 20 }, (_, index) => (
                <div
                    key={index}
                    className="aspect-[4/5] animate-pulse rounded-2xl bg-secondary"
                />
            ))}
        </div>
    );
}

export default function ProductCatalog() {
    const [searchParams, setSearchParams] = useSearchParams();
    const queryString = searchParams.toString();
    const filterKey = JSON.stringify([
        searchParams.get("min_price") ?? "",
        searchParams.get("max_price") ?? "",
    ]);
    const [result, setResult] = useState(null);
    const [categories, setCategories] = useState([]);
    const [categoryError, setCategoryError] = useState("");
    const [filtersOpen, setFiltersOpen] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        api.get("/categories", { signal: controller.signal })
            .then((response) => setCategories(response.data.data ?? []))
            .catch((requestError) => {
                if (controller.signal.aborted) return;
                console.error("Unable to load product categories:", requestError);
                setCategoryError(
                    "Categories could not be loaded. You can still browse all products.",
                );
            });

        return () => controller.abort();
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const params = new URLSearchParams(queryString);
        params.set("per_page", "20");

        api.get("/products", {
            params,
            signal: controller.signal,
        })
            .then((response) => {
                setResult({
                    queryString,
                    products: response.data.data ?? [],
                    meta: response.data.meta ?? null,
                    error: "",
                });
            })
            .catch((requestError) => {
                if (controller.signal.aborted) return;
                console.error("Unable to load product catalog:", requestError);
                setResult({
                    queryString,
                    products: [],
                    meta: null,
                    error: "We couldn't load products. Please try again in a moment.",
                });
            });

        return () => controller.abort();
    }, [queryString]);

    const updateFilter = (key, value) => {
        const nextParams = new URLSearchParams(searchParams);
        if (value) nextParams.set(key, value);
        else nextParams.delete(key);
        nextParams.delete("page");
        setSearchParams(nextParams);
    };

    const applyFilters = (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const nextParams = new URLSearchParams(searchParams);
        for (const key of ["min_price", "max_price"]) {
            const value = String(formData.get(key) ?? "").trim();
            if (value) nextParams.set(key, value);
            else nextParams.delete(key);
        }
        nextParams.delete("page");
        setSearchParams(nextParams);
        setFiltersOpen(false);
    };

    const changePage = (page) => {
        const nextParams = new URLSearchParams(searchParams);
        if (page > 1) nextParams.set("page", String(page));
        else nextParams.delete("page");
        setSearchParams(nextParams);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const loading = !result || result.queryString !== queryString;
    const products = loading ? [] : result.products;
    const meta = loading ? null : result.meta;
    const error = loading ? "" : result.error;

    return (
        <div className="space-y-8 pb-10">
            <header className="space-y-3">
                <p className="text-sm font-semibold tracking-wide text-primary uppercase">
                    {t("PonnoKini collection")}
                </p>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    {t("Product catalog")}
                </h1>
                <p className="max-w-2xl text-muted-foreground">
                    {t("Browse our products and use the filters to find just what you’re looking for.")}
                </p>
            </header>

            {categoryError && (
                <p className="rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground">
                    {t(categoryError)}
                </p>
            )}

            <div>
                <div className="mb-6 hidden lg:block">
                    <CatalogFilters
                        key={`desktop-${filterKey}`}
                        searchParams={searchParams}
                        updateFilter={updateFilter}
                        categories={categories}
                        onApply={applyFilters}
                    />
                </div>

                {filtersOpen && (
                    <div className="fixed inset-0 z-50 lg:hidden">
                        <button
                            type="button"
                            aria-label={t("Close filters")}
                            className="absolute inset-0 size-full cursor-pointer bg-black/40"
                            onClick={() => setFiltersOpen(false)}
                        />
                        <aside
                            role="dialog"
                            aria-modal="true"
                            aria-label={t("Filters")}
                            className="absolute inset-y-0 left-0 w-[min(22rem,85vw)] overflow-y-auto border-r border-border bg-background p-4 shadow-xl"
                        >
                            <CatalogFilters
                                key={`mobile-${filterKey}`}
                                searchParams={searchParams}
                                updateFilter={updateFilter}
                                categories={categories}
                                onApply={applyFilters}
                                onClose={() => setFiltersOpen(false)}
                                mobile
                            />
                        </aside>
                    </div>
                )}

                <section aria-label={t("Products")} className="min-w-0">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <p
                            className="text-sm text-muted-foreground"
                            aria-live="polite"
                        >
                            {meta
                                ? t(":count products", { count: meta.total })
                                : t("Browse our products")}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="lg:hidden"
                                onClick={() => setFiltersOpen(true)}
                            >
                                <SlidersHorizontal aria-hidden="true" />
                                {t("Filters")}
                            </Button>
                            <label className="flex items-center gap-2 text-sm">
                                <ArrowDownWideNarrow
                                    aria-hidden="true"
                                    className="size-4"
                                />
                                <span>{t("Sort")}</span>
                                <select
                                    value={searchParams.get("sort") ?? "latest"}
                                    onChange={(event) =>
                                        updateFilter("sort", event.target.value)
                                    }
                                    className="h-9 rounded-md border border-input bg-background px-3"
                                >
                                    {SORT_OPTIONS.map((option) => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {t(option.label)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    </div>

                    {loading ? (
                        <ProductSkeleton />
                    ) : error ? (
                        <p
                            role="alert"
                            className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
                        >
                            {t(error)}
                        </p>
                    ) : products.length ? (
                        <>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">
                                {products.map((product) => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                    />
                                ))}
                            </div>
                            {meta?.last_page > 1 && (
                                <nav
                                    aria-label={t("Catalog pages")}
                                    className="mt-8 flex items-center justify-center gap-4"
                                >
                                    <Button
                                        variant="outline"
                                        disabled={meta.current_page <= 1}
                                        onClick={() =>
                                            changePage(meta.current_page - 1)
                                        }
                                    >
                                        {t("Previous")}
                                    </Button>
                                    <span className="text-sm text-muted-foreground">
                                        {t("Page :current of :total", {
                                            current: meta.current_page,
                                            total: meta.last_page,
                                        })}
                                    </span>
                                    <Button
                                        variant="outline"
                                        disabled={
                                            meta.current_page >= meta.last_page
                                        }
                                        onClick={() =>
                                            changePage(meta.current_page + 1)
                                        }
                                    >
                                        {t("Next")}
                                    </Button>
                                </nav>
                            )}
                        </>
                    ) : (
                        <div className="rounded-2xl border border-border bg-card p-8 text-center">
                            <h2 className="text-lg font-semibold">
                                {t("No products found")}
                            </h2>
                            <p className="mt-2 text-sm text-muted-foreground">
                                {t("Try adjusting your search or filters.")}
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
