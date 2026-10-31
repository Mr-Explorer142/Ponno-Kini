import { useCallback, useEffect, useState } from "react";
import { Download, ExternalLink, Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/api/axios";
import {
    EmptyState,
    Loading,
    Notice,
    PageHeading,
    Pagination,
} from "./AdminShared";
import { formatDate, formatPrice } from "./AdminFormat";

const orderStatuses = ["pending", "processing", "completed", "cancelled", "failed"];
const paymentStatuses = ["pending", "paid", "failed", "refunded"];
const blankOrder = () => ({
    user_id: "",
    status: "pending",
    payment_method: "online",
    delivery_charge: "70",
    shipping_address: {
        street: "",
        city: "Dhaka",
        postal_code: "",
        country: "Bangladesh",
        phone: "",
    },
    items: [{ product_id: "", quantity: "1" }],
});
const titleCase = (value = "") =>
    value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const messageFrom = (error, fallback) =>
    Object.values(error.response?.data?.errors ?? {}).flat().at(0) ||
    error.response?.data?.message ||
    fallback;

export default function AdminOrders() {
    const [orders, setOrders] = useState([]);
    const [meta, setMeta] = useState(null);
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState("");
    const [paymentStatus, setPaymentStatus] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [selected, setSelected] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [savingStatus, setSavingStatus] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [orderOptions, setOrderOptions] = useState({ customers: [], products: [] });
    const [optionsLoaded, setOptionsLoaded] = useState(false);
    const [optionsLoading, setOptionsLoading] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [editingOrderId, setEditingOrderId] = useState(null);
    const [draft, setDraft] = useState(blankOrder);
    const [savingOrder, setSavingOrder] = useState(false);

    const loadOrders = useCallback(async (signal) => {
        try {
            const response = await api.get("/admin/orders", {
                params: {
                    page,
                    ...(status ? { status } : {}),
                    ...(paymentStatus ? { payment_status: paymentStatus } : {}),
                },
                signal,
            });
            setOrders(response.data.data ?? []);
            setMeta(response.data.meta ?? null);
            setError("");
        } catch (requestError) {
            if (!signal?.aborted) {
                setError(
                    requestError.response?.data?.message ||
                        "Orders could not be loaded.",
                );
            }
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, [page, status, paymentStatus]);

    useEffect(() => {
        const controller = new AbortController();
        void Promise.resolve().then(() => {
            if (!controller.signal.aborted) loadOrders(controller.signal);
        });
        return () => controller.abort();
    }, [loadOrders]);

    const openOrder = async (order) => {
        setFormOpen(false);
        setDetailLoading(true);
        setSelected(null);
        setError("");
        try {
            const response = await api.get(`/admin/orders/${order.id}`);
            setSelected(response.data);
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                    "Order details could not be loaded.",
            );
        } finally {
            setDetailLoading(false);
        }
    };

    const loadOrderOptions = async () => {
        if (optionsLoaded) return orderOptions;
        setOptionsLoading(true);
        setError("");
        try {
            const response = await api.get("/admin/order-options");
            const options = {
                customers: response.data.customers ?? [],
                products: response.data.products ?? [],
            };
            setOrderOptions(options);
            setOptionsLoaded(true);
            return options;
        } catch (requestError) {
            setError(messageFrom(requestError, "Order form options could not be loaded."));
            return null;
        } finally {
            setOptionsLoading(false);
        }
    };

    const startCreate = async () => {
        const options = await loadOrderOptions();
        if (!options) return;
        setEditingOrderId(null);
        setDraft({
            ...blankOrder(),
            user_id: String(options.customers[0]?.id ?? ""),
        });
        setNotice("");
        setError("");
        setFormOpen(true);
    };

    const startEdit = async () => {
        if (!selected || !(await loadOrderOptions())) return;
        setEditingOrderId(selected.id);
        setDraft({
            user_id: String(selected.user_id ?? ""),
            status: selected.status,
            payment_method: selected.payment_method ?? "online",
            delivery_charge: String(selected.delivery_charge ?? 0),
            shipping_address: {
                street: selected.shipping_address?.street ?? "",
                city: selected.shipping_address?.city ?? "",
                postal_code: selected.shipping_address?.postal_code ?? "",
                country: selected.shipping_address?.country ?? "Bangladesh",
                phone: selected.shipping_address?.phone ?? "",
            },
            items: selected.items.map((item) => ({
                product_id: String(item.product?.id ?? ""),
                quantity: String(item.quantity),
            })),
        });
        setNotice("");
        setError("");
        setFormOpen(true);
    };

    const updateAddress = (field, value) => {
        setDraft((current) => ({
            ...current,
            shipping_address: { ...current.shipping_address, [field]: value },
        }));
    };

    const updateItem = (index, field, value) => {
        setDraft((current) => ({
            ...current,
            items: current.items.map((item, itemIndex) =>
                itemIndex === index ? { ...item, [field]: value } : item,
            ),
        }));
    };

    const saveOrder = async (event) => {
        event.preventDefault();
        setSavingOrder(true);
        setError("");
        setNotice("");
        const payload = {
            user_id: Number(draft.user_id),
            status: draft.status,
            delivery_charge: Number(draft.delivery_charge),
            shipping_address: draft.shipping_address,
            items: draft.items.map((item) => ({
                product_id: Number(item.product_id),
                quantity: Number(item.quantity),
            })),
        };
        if (!editingOrderId) payload.payment_method = draft.payment_method;
        try {
            const response = editingOrderId
                ? await api.put(`/admin/orders/${editingOrderId}`, payload)
                : await api.post("/admin/orders", payload);
            setSelected(response.data);
            setFormOpen(false);
            setNotice(editingOrderId ? "Order updated." : "Order created.");
            await loadOrders();
        } catch (requestError) {
            setError(messageFrom(requestError, "The order could not be saved."));
        } finally {
            setSavingOrder(false);
        }
    };

    const updateStatus = async (nextStatus) => {
        if (!selected) return;
        setSavingStatus(true);
        setError("");
        setNotice("");
        try {
            await api.patch(`/orders/${selected.id}/status`, { status: nextStatus });
            setSelected((current) => ({ ...current, status: nextStatus }));
            setNotice("Order status updated.");
            await loadOrders();
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                    "The order status could not be updated.",
            );
        } finally {
            setSavingStatus(false);
        }
    };

    const downloadInvoice = async () => {
        if (!selected) return;
        setDownloading(true);
        setError("");
        try {
            const response = await api.get(`/orders/${selected.id}/invoice`, {
                responseType: "blob",
            });
            const url = URL.createObjectURL(response.data);
            const link = document.createElement("a");
            link.href = url;
            link.download = `Invoice-${selected.order_number}.pdf`;
            document.body.append(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                    "The invoice could not be downloaded.",
            );
        } finally {
            setDownloading(false);
        }
    };

    const applyFilters = (setter) => (event) => {
        setLoading(true);
        setter(event.target.value);
        setPage(1);
    };

    const changePage = (nextPage) => {
        setLoading(true);
        setPage(nextPage);
    };

    return (
        <div className="space-y-6">
            <PageHeading
                title="Orders"
                description="Review order details, payment information, and fulfillment status."
                action={
                    <Button type="button" onClick={startCreate} disabled={optionsLoading}>
                        <Plus /> {optionsLoading ? "Loading..." : "Create order"}
                    </Button>
                }
            />
            <Notice>{error}</Notice>
            <Notice variant="success">{notice}</Notice>
            <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 sm:max-w-2xl">
                <label className="flex flex-col gap-2 text-sm font-medium">
                    Order status
                    <select
                        value={status}
                        onChange={applyFilters(setStatus)}
                        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    >
                        <option value="">All statuses</option>
                        {orderStatuses.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
                    </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                    Payment status
                    <select
                        value={paymentStatus}
                        onChange={applyFilters(setPaymentStatus)}
                        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    >
                        <option value="">All payment statuses</option>
                        {paymentStatuses.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
                    </select>
                </label>
            </div>

            {loading ? (
                <Loading label="Loading orders..." />
            ) : orders.length ? (
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left text-sm">
                            <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Order</th>
                                    <th className="px-4 py-3 font-semibold">Customer</th>
                                    <th className="px-4 py-3 font-semibold">Date</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                    <th className="px-4 py-3 font-semibold">Payment</th>
                                    <th className="px-4 py-3 font-semibold">Total</th>
                                    <th className="px-4 py-3 text-right font-semibold">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {orders.map((order) => (
                                    <tr key={order.id}>
                                        <td className="px-4 py-3 font-medium">{order.order_number}</td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium">{order.user.name}</p>
                                            <p className="text-xs text-muted-foreground">{order.user.email}</p>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">{formatDate(order.created_at)}</td>
                                        <td className="px-4 py-3">{titleCase(order.status)}</td>
                                        <td className="px-4 py-3">{titleCase(order.payment_status)}</td>
                                        <td className="px-4 py-3 font-medium">{formatPrice(order.total_amount)}</td>
                                        <td className="px-4 py-3 text-right">
                                            <Button type="button" variant="outline" size="sm" onClick={() => openOrder(order)}>
                                                <ExternalLink /> View
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <EmptyState>No orders match these filters.</EmptyState>
            )}
            <Pagination meta={meta} page={page} setPage={changePage} />

            {formOpen && (
                <form
                    onSubmit={saveOrder}
                    className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6"
                >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-semibold">
                                {editingOrderId ? "Edit order" : "Create order"}
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Item prices and totals are calculated from the current catalog. Payment status and gateway records are not changed here.
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Close order form"
                            onClick={() => setFormOpen(false)}
                        >
                            <X />
                        </Button>
                    </div>

                    {!orderOptions.customers.length && (
                        <Notice>No customer accounts are available for order assignment.</Notice>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="flex flex-col gap-2 text-sm font-medium">
                            Customer
                            <select
                                required
                                value={draft.user_id}
                                onChange={(event) => setDraft((current) => ({
                                    ...current,
                                    user_id: event.target.value,
                                }))}
                                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                            >
                                <option value="" disabled>Select a customer</option>
                                {orderOptions.customers.map((customer) => (
                                    <option key={customer.id} value={customer.id}>
                                        {customer.name} · {customer.email}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="flex flex-col gap-2 text-sm font-medium">
                            Order status
                            <select
                                required
                                value={draft.status}
                                onChange={(event) => setDraft((current) => ({
                                    ...current,
                                    status: event.target.value,
                                }))}
                                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                            >
                                {orderStatuses.map((value) => (
                                    <option key={value} value={value}>{titleCase(value)}</option>
                                ))}
                            </select>
                        </label>
                    </div>

                    {!editingOrderId && (
                        <label className="flex flex-col gap-2 text-sm font-medium sm:max-w-sm">
                            Payment method
                            <select
                                value={draft.payment_method}
                                onChange={(event) => setDraft((current) => ({
                                    ...current,
                                    payment_method: event.target.value,
                                }))}
                                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                            >
                                <option value="online">Online payment</option>
                                <option value="cod">Cash on delivery</option>
                            </select>
                        </label>
                    )}

                    <fieldset className="space-y-3">
                        <legend className="text-sm font-semibold">Shipping address</legend>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {[
                                ["street", "Street address"],
                                ["city", "City"],
                                ["postal_code", "Postal code"],
                                ["phone", "Phone"],
                            ].map(([field, label]) => (
                                <label key={field} className="flex flex-col gap-2 text-sm font-medium">
                                    {label}
                                    <input
                                        required
                                        value={draft.shipping_address[field]}
                                        onChange={(event) => updateAddress(field, event.target.value)}
                                        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                                    />
                                </label>
                            ))}
                            <label className="flex flex-col gap-2 text-sm font-medium">
                                Country
                                <select
                                    required
                                    value={draft.shipping_address.country}
                                    onChange={(event) => updateAddress("country", event.target.value)}
                                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                                >
                                    <option value="Bangladesh">Bangladesh</option>
                                    <option value="BD">BD</option>
                                </select>
                            </label>
                            <label className="flex flex-col gap-2 text-sm font-medium">
                                Delivery charge
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={draft.delivery_charge}
                                    onChange={(event) => setDraft((current) => ({
                                        ...current,
                                        delivery_charge: event.target.value,
                                    }))}
                                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                                />
                            </label>
                        </div>
                    </fieldset>

                    <fieldset className="space-y-3">
                        <legend className="text-sm font-semibold">Order items</legend>
                        {draft.items.map((item, index) => {
                            const product = orderOptions.products.find(
                                (candidate) => String(candidate.id) === item.product_id,
                            );
                            return (
                                <div key={index} className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
                                    <label className="flex flex-col gap-2 text-sm font-medium">
                                        Product
                                        <select
                                            required
                                            value={item.product_id}
                                            onChange={(event) => updateItem(index, "product_id", event.target.value)}
                                            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                                        >
                                            <option value="" disabled>Select a product</option>
                                            {orderOptions.products.map((option) => (
                                                <option
                                                    key={option.id}
                                                    value={option.id}
                                                    disabled={
                                                        Number(option.stock) <= 0 &&
                                                        item.product_id !== String(option.id)
                                                    }
                                                >
                                                    {option.name} · {formatPrice(option.price)} · {option.stock} in stock
                                                </option>
                                            ))}
                                        </select>
                                        {product && (
                                            <span className="text-xs text-muted-foreground">
                                                Current catalog price: {formatPrice(product.price)}
                                            </span>
                                        )}
                                    </label>
                                    <label className="flex flex-col gap-2 text-sm font-medium">
                                        Quantity
                                        <input
                                            required
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={item.quantity}
                                            onChange={(event) => updateItem(index, "quantity", event.target.value)}
                                            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                                        />
                                    </label>
                                    <div className="flex items-end">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={draft.items.length === 1}
                                            onClick={() => setDraft((current) => ({
                                                ...current,
                                                items: current.items.filter((_, itemIndex) => itemIndex !== index),
                                            }))}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDraft((current) => ({
                                ...current,
                                items: [...current.items, { product_id: "", quantity: "1" }],
                            }))}
                        >
                            <Plus /> Add item
                        </Button>
                    </fieldset>

                    {editingOrderId && (
                        <p className="text-sm text-muted-foreground">
                            Payment method: {titleCase(selected?.payment_method)} · Payment status: {titleCase(selected?.payment_status)} (read-only; payment records remain unchanged)
                        </p>
                    )}

                    <div className="flex flex-wrap justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={savingOrder || !orderOptions.customers.length}>
                            {savingOrder ? "Saving..." : editingOrderId ? "Save changes" : "Create order"}
                        </Button>
                    </div>
                </form>
            )}

            {detailLoading && <Loading label="Loading order details..." />}
            {selected && !formOpen && (
                <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
                    <header className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-medium uppercase text-muted-foreground">Order details</p>
                            <h3 className="mt-1 text-lg font-semibold">{selected.order_number}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {selected.user.name} · {selected.user.email} · {formatDate(selected.created_at)}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={startEdit} disabled={optionsLoading}>
                                <Pencil /> {optionsLoading ? "Loading..." : "Edit order"}
                            </Button>
                            <Button type="button" variant="outline" onClick={downloadInvoice} disabled={downloading}>
                                <Download /> {downloading ? "Preparing..." : "Invoice"}
                            </Button>
                            <Button type="button" variant="ghost" size="icon" aria-label="Close order details" onClick={() => setSelected(null)}>
                                <X />
                            </Button>
                        </div>
                    </header>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="flex flex-col gap-2 text-sm font-medium">
                            Order status
                            <select
                                disabled={savingStatus}
                                value={selected.status}
                                onChange={(event) => updateStatus(event.target.value)}
                                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                            >
                                {orderStatuses.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
                            </select>
                        </label>
                        <div className="space-y-1.5 text-sm">
                            <p className="font-medium">Payment method</p>
                            <p>{titleCase(selected.payment_method)}</p>
                        </div>
                        <div className="space-y-1.5 text-sm">
                            <p className="font-medium">Payment status</p>
                            <p>{titleCase(selected.payment_status)}</p>
                            {selected.latest_payment && (
                                <p className="text-xs text-muted-foreground">
                                    {selected.latest_payment.gateway ?? "Payment"} · {selected.latest_payment.transaction_id ?? "No transaction ID"} · {titleCase(selected.latest_payment.status)}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                        <div className="space-y-3">
                            <h4 className="font-semibold">Items</h4>
                            {selected.items.map((item) => (
                                <div key={item.id} className="flex justify-between gap-4 border-b border-border pb-3 text-sm">
                                    <span>{item.product.name} × {item.quantity}</span>
                                    <span>{formatPrice(item.subtotal)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Delivery</span><span>{formatPrice(selected.delivery_charge)}</span>
                            </div>
                            <div className="flex justify-between font-semibold">
                                <span>Total</span><span>{formatPrice(selected.total_amount)}</span>
                            </div>
                        </div>
                        <div className="space-y-2 text-sm">
                            <h4 className="font-semibold">Shipping address</h4>
                            <p className="text-muted-foreground">
                                {[
                                    selected.shipping_address?.street,
                                    selected.shipping_address?.city,
                                    selected.shipping_address?.postal_code,
                                    selected.shipping_address?.country,
                                    selected.shipping_address?.phone,
                                ].filter(Boolean).join(", ")}
                            </p>
                            <h4 className="pt-3 font-semibold">Payments</h4>
                            {selected.payments?.length ? selected.payments.map((payment) => (
                                <p key={payment.id} className="text-muted-foreground">
                                    {payment.gateway ?? "Gateway"} · {payment.transaction_id ?? "—"} · {titleCase(payment.status)} · {formatPrice(payment.amount)}
                                </p>
                            )) : <p className="text-muted-foreground">No payment attempts.</p>}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
