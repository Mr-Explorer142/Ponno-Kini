import { useEffect, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/api/axios";

const SORT_OPTIONS = [
    { value: "latest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "price_asc", label: "Price: low to high" },
    { value: "price_desc", label: "Price: high to low" },
    { value: "best_selling", label: "Best selling" },
];

function CatalogFilters({
    searchParams,
    setSearchParams,
    updateFilter,
    categories,
}) {
    const [search, setSearch] = useState(searchParams.get("search") ?? "");
    const [minPrice, setMinPrice] = useState(
        searchParams.get("min_price") ?? "",
    );
    const [maxPrice, setMaxPrice] = useState(
        searchParams.get("max_price") ?? "",
    );

    const handleSearch = (event) => {
        event.preventDefault();
        const nextParams = new URLSearchParams(searchParams);
        if (search.trim()) nextParams.set("search", search.trim());
        else nextParams.delete("search");
        if (minPrice) nextParams.set("min_price", minPrice);
        else nextParams.delete("min_price");
        if (maxPrice) nextParams.set("max_price", maxPrice);
        else nextParams.delete("max_price");
        nextParams.delete("page");
        setSearchParams(nextParams);
    };

    return (
        <form
            onSubmit={handleSearch}
            className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[minmax(14rem,2fr)_minmax(10rem,1fr)_repeat(2,minmax(7rem,0.7fr))_auto] lg:items-end"
        >
            <label className="flex flex-col gap-2 text-sm font-medium">
                Search products
                <span className="relative block">
                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Name or description"
                        className="pl-9"
                    />
                </span>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium">
                Category
                <select
                    value={searchParams.get("category_id") ?? ""}
                    onChange={(event) =>
                        updateFilter("category_id", event.target.value)
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                    <option value="">All categories</option>
                    {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                            {category.name}
                        </option>
                    ))}
                </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium">
                Min price
                <Input
                    type="number"
                    min="0"
                    value={minPrice}
                    onChange={(event) => setMinPrice(event.target.value)}
                    placeholder="৳0"
                />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
                Max price
                <Input
                    type="number"
                    min="0"
                    value={maxPrice}
                    onChange={(event) => setMaxPrice(event.target.value)}
                    placeholder="Any"
                />
            </label>

            <Button type="submit" className="h-10">
                <SlidersHorizontal aria-hidden="true" />
                Apply
            </Button>
        </form>
    );
}

function ProductSkeleton() {
    return (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
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
        searchParams.get("search") ?? "",
        searchParams.get("min_price") ?? "",
        searchParams.get("max_price") ?? "",
    ]);
    const [result, setResult] = useState(null);
    const [categories, setCategories] = useState([]);
    const [categoryError, setCategoryError] = useState("");

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
                    PonnoKini collection
                </p>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Product catalog
                </h1>
                <p className="max-w-2xl text-muted-foreground">
                    Browse our products and use the filters to find just what
                    you’re looking for.
                </p>
            </header>

            <CatalogFilters
                key={filterKey}
                searchParams={searchParams}
                setSearchParams={setSearchParams}
                updateFilter={updateFilter}
                categories={categories}
            />

            {categoryError && (
                <p className="rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground">
                    {categoryError}
                </p>
            )}

            <section aria-label="Products">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <p
                        className="text-sm text-muted-foreground"
                        aria-live="polite"
                    >
                        {meta ? `${meta.total} products` : "Browse our products"}
                    </p>
                    <label className="flex items-center gap-2 text-sm">
                        Sort by
                        <select
                            value={searchParams.get("sort") ?? "latest"}
                            onChange={(event) =>
                                updateFilter("sort", event.target.value)
                            }
                            className="h-9 rounded-md border border-input bg-background px-3"
                        >
                            {SORT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                {loading ? (
                    <ProductSkeleton />
                ) : error ? (
                    <p
                        role="alert"
                        className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
                    >
                        {error}
                    </p>
                ) : products.length ? (
                    <>
                        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
                            {products.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                        {meta?.last_page > 1 && (
                            <nav
                                aria-label="Catalog pages"
                                className="mt-8 flex items-center justify-center gap-4"
                            >
                                <Button
                                    variant="outline"
                                    disabled={meta.current_page <= 1}
                                    onClick={() =>
                                        changePage(meta.current_page - 1)
                                    }
                                >
                                    Previous
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    Page {meta.current_page} of {meta.last_page}
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
                                    Next
                                </Button>
                            </nav>
                        )}
                    </>
                ) : (
                    <div className="rounded-2xl border border-border bg-card p-8 text-center">
                        <h2 className="text-lg font-semibold">
                            No products found
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Try adjusting your search or filters.
                        </p>
                    </div>
                )}
            </section>
        </div>
    );
}
