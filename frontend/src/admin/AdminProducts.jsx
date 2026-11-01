import { useCallback, useEffect, useState } from "react";
import {
    Bot,
    ImagePlus,
    Pencil,
    Plus,
    Search,
    Sparkles,
    Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/api/axios";
import {
    EmptyState,
    Loading,
    Notice,
    PageHeading,
    Pagination,
} from "./AdminShared";
import { formatPrice } from "./AdminFormat";

const blankProduct = {
    name: "",
    description: "",
    price: "",
    discount_price: "",
    stock: "3",
    category_id: "",
};

function messageFrom(error, fallback) {
    const validationMessage = Object.values(error.response?.data?.errors ?? {})
        .flat()
        .at(0);
    return validationMessage || error.response?.data?.message || fallback;
}

export default function AdminProducts() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [meta, setMeta] = useState(null);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({ search: "", category_id: "", stock: "" });
    const [applied, setApplied] = useState({ search: "", category_id: "", stock: "" });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [draft, setDraft] = useState(blankProduct);
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [removeImage, setRemoveImage] = useState(false);
    const [saving, setSaving] = useState(false);
    const [generatingDescription, setGeneratingDescription] = useState(false);
    const [generatingImage, setGeneratingImage] = useState(false);

    const loadProducts = useCallback(async (signal) => {
        try {
            const response = await api.get("/admin/products", {
                params: { ...applied, page },
                signal,
            });
            setProducts(response.data.data ?? []);
            setMeta(response.data.meta ?? null);
        } catch (requestError) {
            if (!signal?.aborted) {
                setError(
                    requestError.response?.data?.message ||
                        "Products could not be loaded.",
                );
            }
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, [applied, page]);

    useEffect(() => {
        const controller = new AbortController();
        void Promise.resolve().then(() => {
            if (!controller.signal.aborted) loadProducts(controller.signal);
        });
        return () => controller.abort();
    }, [loadProducts]);

    useEffect(() => {
        const controller = new AbortController();
        api.get("/admin/categories", { params: { page: 1 }, signal: controller.signal })
            .then((response) => setCategories(response.data.data ?? []))
            .catch((requestError) => {
                if (!controller.signal.aborted) {
                    setError(
                        requestError.response?.data?.message ||
                            "Categories could not be loaded.",
                    );
                }
            });
        return () => controller.abort();
    }, []);

    const startCreate = () => {
        setEditing(null);
        setDraft({ ...blankProduct, category_id: categories[0]?.id ?? "" });
        setImage(null);
        setImagePreview(null);
        setRemoveImage(false);
        setNotice("");
        setError("");
        setFormOpen(true);
    };

    const startEdit = (product) => {
        setEditing(product);
        setDraft({
            name: product.name,
            description: product.description,
            price: product.price,
            discount_price: product.discount_price ?? "",
            stock: product.stock ?? 0,
            category_id: product.category?.id ?? "",
        });
        setImage(null);
        setImagePreview(product.image_url ?? null);
        setRemoveImage(false);
        setNotice("");
        setError("");
        setFormOpen(true);
    };

    const saveProduct = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        const data = new FormData();
        Object.entries(draft).forEach(([key, value]) => data.append(key, value));
        if (image) data.append("image", image);
        data.append("remove_image", removeImage ? "1" : "0");

        try {
            const endpoint = editing ? `/products/${editing.id}` : "/products";
            await api.post(endpoint, data, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setFormOpen(false);
            setNotice(editing ? "Product updated." : "Product created.");
            setLoading(true);
            await loadProducts();
        } catch (requestError) {
            setError(messageFrom(requestError, "The product could not be saved."));
        } finally {
            setSaving(false);
        }
    };

    const generateDescription = async () => {
        if (!draft.name.trim()) {
            setError("Enter a product name before generating a description.");
            return;
        }
        setGeneratingDescription(true);
        setError("");
        try {
            const response = await api.post("/ai/generate-description", {
                product_name: draft.name,
                features: draft.description,
                tone: "professional",
            });
            setDraft((current) => ({ ...current, description: response.data.description }));
        } catch (requestError) {
            setError(messageFrom(requestError, "A description could not be generated."));
        } finally {
            setGeneratingDescription(false);
        }
    };

    const generateProductImage = async () => {
        if (!draft.name.trim()) {
            setError("Enter a product name before generating an image.");
            return;
        }

        setGeneratingImage(true);
        setError("");
        setNotice("");
        try {
            const response = await api.post("/ai/generate-image", {
                product_name: draft.name,
                description: draft.description,
            });
            const { image: imageData, mime_type: mimeType } = response.data;
            const binary = atob(imageData);
            const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
            const extension = {
                "image/png": "png",
                "image/jpeg": "jpg",
                "image/webp": "webp",
            }[mimeType];

            if (!extension) {
                throw new Error("Gemini returned an unsupported image format.");
            }

            const filename = `${draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "product"}.${extension}`;
            setImage(new File([bytes], filename, { type: mimeType }));
            setImagePreview(`data:${mimeType};base64,${imageData}`);
            setRemoveImage(false);
            setNotice("Generated image is ready. Save the product to publish it.");
        } catch (requestError) {
            setError(
                messageFrom(requestError, "A product image could not be generated."),
            );
        } finally {
            setGeneratingImage(false);
        }
    };

    const selectImage = (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result !== "string") {
                setError("The selected image could not be previewed.");
                return;
            }
            setImage(file);
            setImagePreview(reader.result);
            setRemoveImage(false);
            setError("");
        };
        reader.onerror = () => setError("The selected image could not be read.");
        reader.readAsDataURL(file);
    };

    const clearImage = () => {
        setImage(null);
        setImagePreview(null);
        setRemoveImage(Boolean(editing?.image_url));
    };

    const undoImageRemoval = () => {
        setImagePreview(editing?.image_url ?? null);
        setRemoveImage(false);
    };

    const deleteProduct = async (product) => {
        if (!window.confirm(`Delete "${product.name}"?`)) return;
        setError("");
        setNotice("");
        try {
            await api.delete(`/products/${product.id}`);
            setNotice("Product deleted.");
            setLoading(true);
            await loadProducts();
        } catch (requestError) {
            setError(messageFrom(requestError, "The product could not be deleted."));
        }
    };

    const applyFilters = (event) => {
        event.preventDefault();
        setLoading(true);
        setPage(1);
        setApplied({ ...filters, search: filters.search.trim() });
    };

    const changePage = (nextPage) => {
        setLoading(true);
        setPage(nextPage);
    };

    return (
        <div className="space-y-6">
            <PageHeading
                title="Products"
                description="Manage product details, pricing, images, and inventory."
                action={
                    <Button type="button" onClick={startCreate}>
                        <Plus /> Add product
                    </Button>
                }
            />
            <Notice>{error}</Notice>
            <Notice variant="success">{notice}</Notice>

            {formOpen && (
                <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
                    <div className="mb-5 flex items-center justify-between gap-4">
                        <h3 className="text-lg font-semibold">
                            {editing ? "Edit product" : "Create product"}
                        </h3>
                        <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                            Close
                        </Button>
                    </div>
                    <form onSubmit={saveProduct} className="grid gap-4 md:grid-cols-2">
                        <label className="flex flex-col gap-2 text-sm font-medium">
                            Product name
                            <Input
                                required
                                maxLength={255}
                                value={draft.name}
                                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                                className="h-10 px-3"
                            />
                        </label>
                        <label className="flex flex-col gap-2 text-sm font-medium">
                            Category
                            <select
                                required
                                value={draft.category_id}
                                onChange={(event) => setDraft({ ...draft, category_id: event.target.value })}
                                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                            >
                                <option value="">Select category</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>{category.name}</option>
                                ))}
                            </select>
                        </label>
                        <label className="flex flex-col gap-2 text-sm font-medium">
                            Price (৳)
                            <Input
                                required
                                type="number"
                                min="0"
                                step="1"
                                value={draft.price}
                                onChange={(event) => setDraft({ ...draft, price: event.target.value })}
                                className="h-10 px-3"
                            />
                        </label>
                        <label className="flex flex-col gap-2 text-sm font-medium">
                            Discount price (৳, optional)
                            <Input
                                type="number"
                                min="0"
                                step="1"
                                max={draft.price || undefined}
                                value={draft.discount_price}
                                onChange={(event) =>
                                    setDraft({
                                        ...draft,
                                        discount_price: event.target.value,
                                    })
                                }
                                className="h-10 px-3"
                            />
                            <span className="text-xs font-normal text-muted-foreground">
                                Leave blank for no discount. Must not exceed the regular price.
                            </span>
                        </label>
                        <label className="flex flex-col gap-2 text-sm font-medium">
                            Stock quantity
                            <Input
                                required
                                type="number"
                                min="0"
                                step="1"
                                value={draft.stock}
                                onChange={(event) => setDraft({ ...draft, stock: event.target.value })}
                                className="h-10 px-3"
                            />
                        </label>
                        <div className="space-y-1.5 md:col-span-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <label htmlFor="admin-product-description" className="text-sm font-medium">
                                    Description
                                </label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={generatingDescription}
                                    onClick={generateDescription}
                                >
                                    <Bot />
                                    {generatingDescription
                                        ? "Generating description..."
                                        : "Generate description with Gemini"}
                                </Button>
                            </div>
                            <textarea
                                id="admin-product-description"
                                required
                                rows={5}
                                value={draft.description}
                                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                            />
                        </div>
                        <section
                            aria-label="Product image"
                            className="space-y-3 rounded-xl border border-border bg-muted/20 p-4 md:col-span-2"
                        >
                            <div>
                                <h4 className="text-sm font-semibold">Product image</h4>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Upload an image or generate a product photo with Gemini.
                                </p>
                            </div>
                            {imagePreview ? (
                                <img
                                    src={imagePreview}
                                    alt={`${draft.name || "Product"} preview`}
                                    className="size-36 rounded-lg border border-border bg-background object-cover"
                                />
                            ) : (
                                <div className="grid size-36 place-items-center rounded-lg border border-dashed border-border bg-background text-center text-xs text-muted-foreground">
                                    <span>
                                        <ImagePlus className="mx-auto mb-2 size-6" />
                                        No image selected
                                    </span>
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-muted">
                                    <ImagePlus className="size-4" />
                                    {image ? "Choose another image" : "Upload image"}
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="sr-only"
                                        onChange={selectImage}
                                    />
                                </label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={generatingImage || !draft.name.trim()}
                                    onClick={generateProductImage}
                                >
                                    <Sparkles />
                                    {generatingImage ? "Generating image..." : "Generate image with Gemini"}
                                </Button>
                                {(imagePreview || removeImage) && (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        onClick={removeImage ? undoImageRemoval : clearImage}
                                    >
                                        <Trash2 />
                                        {removeImage ? "Undo image removal" : "Remove image"}
                                    </Button>
                                )}
                            </div>
                            {image && (
                                <p className="text-xs text-muted-foreground">
                                    {image.name} · {(image.size / 1024).toFixed(0)} KB
                                </p>
                            )}
                            {removeImage && (
                                <p className="text-xs text-amber-700 dark:text-amber-400">
                                    The image will be removed when you save this product.
                                </p>
                            )}
                        </section>
                        <div className="flex gap-2 md:col-span-2">
                            <Button type="submit" disabled={saving || categories.length === 0}>
                                {saving ? "Saving..." : editing ? "Save changes" : "Create product"}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </section>
            )}

            <form onSubmit={applyFilters} className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1fr)_minmax(10rem,0.7fr)_minmax(10rem,0.7fr)_auto] lg:items-end">
                <label className="flex flex-col gap-2 text-sm font-medium">
                    Search
                    <span className="relative block">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={filters.search}
                            onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                            placeholder="Product name or description"
                            className="pl-9"
                        />
                    </span>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                    Category
                    <select
                        value={filters.category_id}
                        onChange={(event) => setFilters({ ...filters, category_id: event.target.value })}
                        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    >
                        <option value="">All categories</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                    Inventory
                    <select
                        value={filters.stock}
                        onChange={(event) => setFilters({ ...filters, stock: event.target.value })}
                        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    >
                        <option value="">All stock levels</option>
                        <option value="low">Low stock (5 or fewer)</option>
                        <option value="in_stock">In stock</option>
                        <option value="out_of_stock">Out of stock</option>
                    </select>
                </label>
                <Button type="submit">Apply filters</Button>
            </form>

            {loading ? (
                <Loading label="Loading products..." />
            ) : products.length ? (
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[740px] text-left text-sm">
                            <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Product</th>
                                    <th className="px-4 py-3 font-semibold">Category</th>
                                    <th className="px-4 py-3 font-semibold">Price</th>
                                    <th className="px-4 py-3 font-semibold">Stock</th>
                                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {products.map((product) => (
                                    <tr key={product.id}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {product.image_url ? (
                                                    <img src={product.image_url} alt="" className="size-11 rounded-lg object-cover" />
                                                ) : (
                                                    <div className="grid size-11 place-items-center rounded-lg bg-muted">
                                                        <ImagePlus className="size-4 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <span className="font-medium">{product.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">{product.category?.name}</td>
                                        <td className="px-4 py-3 font-medium">
                                            {product.discount_price !== null &&
                                            product.discount_price !== undefined ? (
                                                <span className="flex flex-col">
                                                    <span className="text-primary">
                                                        {formatPrice(product.discount_price)}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground line-through">
                                                        {formatPrice(product.price)}
                                                    </span>
                                                </span>
                                            ) : (
                                                formatPrice(product.price)
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={product.stock <= 5 ? "font-semibold text-amber-700 dark:text-amber-400" : ""}>
                                                {product.stock}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                <Button type="button" variant="outline" size="sm" onClick={() => startEdit(product)}>
                                                    <Pencil /> Edit
                                                </Button>
                                                <Button type="button" variant="destructive" size="sm" onClick={() => deleteProduct(product)}>
                                                    <Trash2 /> Delete
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <EmptyState>No products match these filters.</EmptyState>
            )}
            <Pagination meta={meta} page={page} setPage={changePage} />
        </div>
    );
}
