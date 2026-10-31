import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
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

export default function AdminCategories() {
    const [categories, setCategories] = useState([]);
    const [meta, setMeta] = useState(null);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [editing, setEditing] = useState(null);
    const [name, setName] = useState("");

    const loadCategories = useCallback(async (signal) => {
        try {
            const response = await api.get("/admin/categories", {
                params: { page },
                signal,
            });
            setCategories(response.data.data ?? []);
            setMeta(response.data.meta ?? null);
            setError("");
        } catch (requestError) {
            if (!signal?.aborted) {
                setError(
                    requestError.response?.data?.message ||
                        "Categories could not be loaded.",
                );
            }
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        const controller = new AbortController();
        void Promise.resolve().then(() => {
            if (!controller.signal.aborted) loadCategories(controller.signal);
        });
        return () => controller.abort();
    }, [loadCategories]);

    const resetForm = () => {
        setEditing(null);
        setName("");
    };

    const saveCategory = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        setNotice("");
        try {
            setLoading(true);
            if (editing) {
                await api.put(`/categories/${editing.id}`, { name });
                setNotice("Category updated.");
            } else {
                await api.post("/categories", { name });
                setNotice("Category created.");
                setPage(1);
            }
            resetForm();
            await loadCategories();
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                    "The category could not be saved.",
            );
        } finally {
            setSaving(false);
        }
    };

    const deleteCategory = async (category) => {
        if (!window.confirm(`Delete "${category.name}"?`)) return;
        setError("");
        setNotice("");
        try {
            await api.delete(`/categories/${category.id}`);
            setNotice("Category deleted.");
            setLoading(true);
            await loadCategories();
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                    "The category could not be deleted.",
            );
        }
    };

    return (
        <div className="space-y-6">
            <PageHeading
                title="Categories"
                description="Organize products into storefront categories."
            />
            <Notice>{error}</Notice>
            <Notice variant="success">{notice}</Notice>
            <form onSubmit={saveCategory} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row">
                <Input
                    required
                    maxLength={255}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Category name"
                    aria-label="Category name"
                    className="h-10 px-3 sm:max-w-sm"
                />
                <Button type="submit" disabled={saving}>
                    {editing ? <Pencil /> : <Plus />}
                    {saving ? "Saving..." : editing ? "Save category" : "Add category"}
                </Button>
                {editing && (
                    <Button type="button" variant="outline" onClick={resetForm}>
                        Cancel
                    </Button>
                )}
            </form>

            {loading ? (
                <Loading label="Loading categories..." />
            ) : categories.length ? (
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[520px] text-left text-sm">
                            <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Category</th>
                                    <th className="px-4 py-3 font-semibold">Products</th>
                                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {categories.map((category) => (
                                    <tr key={category.id}>
                                        <td className="px-4 py-3 font-medium">{category.name}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{category.products_count}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditing(category);
                                                        setName(category.name);
                                                    }}
                                                >
                                                    <Pencil /> Edit
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    disabled={category.products_count > 0}
                                                    title={category.products_count ? "Remove or move its products first" : undefined}
                                                    onClick={() => deleteCategory(category)}
                                                >
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
                <EmptyState>No categories have been created.</EmptyState>
            )}
            <Pagination
                meta={meta}
                page={page}
                setPage={(nextPage) => {
                    setLoading(true);
                    setPage(nextPage);
                }}
            />
        </div>
    );
}
