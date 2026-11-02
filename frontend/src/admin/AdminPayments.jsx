import { useCallback, useEffect, useState } from "react";
import api from "@/api/axios";
import {
    EmptyState,
    Loading,
    Notice,
    PageHeading,
    Pagination,
} from "./AdminShared";
import { formatDate, formatPrice } from "./AdminFormat";
import StatusBadge from "./StatusBadge";

const paymentStatuses = ["pending", "paid", "failed", "cancelled", "refunded"];

export default function AdminPayments() {
    const [orders, setOrders] = useState([]);
    const [meta, setMeta] = useState(null);
    const [page, setPage] = useState(1);
    const [paymentStatus, setPaymentStatus] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadPayments = useCallback(async (signal) => {
        try {
            const response = await api.get("/admin/orders", {
                params: {
                    page,
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
                        "Payment details could not be loaded.",
                );
            }
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, [page, paymentStatus]);

    useEffect(() => {
        const controller = new AbortController();
        void Promise.resolve().then(() => {
            if (!controller.signal.aborted) {
                loadPayments(controller.signal);
            }
        });
        return () => controller.abort();
    }, [loadPayments]);

    const changeFilter = (event) => {
        setLoading(true);
        setPaymentStatus(event.target.value);
        setPage(1);
    };

    const changePage = (nextPage) => {
        setLoading(true);
        setPage(nextPage);
    };

    return (
        <div className="space-y-6">
            <PageHeading
                title="Payments"
                description="Review payment status, transaction records, customers, and purchased products."
            />
            <Notice>{error}</Notice>
            <label className="flex max-w-sm flex-col gap-2 text-sm font-medium">
                Payment status
                <select
                    value={paymentStatus}
                    onChange={changeFilter}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                >
                    <option value="">All payment statuses</option>
                    {paymentStatuses.map((status) => (
                        <option key={status} value={status}>
                            {status.replace(/\b\w/g, (letter) => letter.toUpperCase())}
                        </option>
                    ))}
                </select>
            </label>

            {loading ? (
                <Loading label="Loading payment details..." />
            ) : orders.length ? (
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1050px] text-left text-sm">
                            <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Order / date</th>
                                    <th className="px-4 py-3 font-semibold">Customer</th>
                                    <th className="px-4 py-3 font-semibold">Products</th>
                                    <th className="px-4 py-3 font-semibold">Payment</th>
                                    <th className="px-4 py-3 font-semibold">Order status</th>
                                    <th className="px-4 py-3 text-right font-semibold">Order total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {orders.map((order) => (
                                    <tr key={order.id} className="align-top">
                                        <td className="px-4 py-4">
                                            <p className="font-semibold">{order.order_number}</p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {formatDate(order.created_at)}
                                            </p>
                                        </td>
                                        <td className="px-4 py-4">
                                            <p className="font-medium">{order.user?.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {order.user?.email}
                                            </p>
                                        </td>
                                        <td className="max-w-72 px-4 py-4">
                                            <ul className="space-y-1">
                                                {order.items?.map((item) => (
                                                    <li key={item.id} className="flex justify-between gap-3">
                                                        <span className="truncate">
                                                            {item.product?.name} × {item.quantity}
                                                        </span>
                                                        <span className="shrink-0 text-muted-foreground">
                                                            {formatPrice(item.subtotal)}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </td>
                                        <td className="min-w-72 px-4 py-4">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <StatusBadge status={order.payment_status} type="payment" />
                                                <span className="text-xs text-muted-foreground">
                                                    {order.payment_method?.toUpperCase()}
                                                </span>
                                            </div>
                                            {order.payments?.length ? (
                                                <ul className="mt-2 space-y-2">
                                                    {order.payments.map((payment) => (
                                                        <li
                                                            key={payment.id}
                                                            className="rounded-lg border border-border bg-muted/30 p-2 text-xs"
                                                        >
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <StatusBadge
                                                                    status={payment.status}
                                                                    type="payment"
                                                                />
                                                                <span>{payment.gateway ?? "Gateway"}</span>
                                                                <span className="font-medium">
                                                                    {formatPrice(payment.amount)} {payment.currency}
                                                                </span>
                                                            </div>
                                                            <p className="mt-1 break-all text-muted-foreground">
                                                                Transaction: {payment.transaction_id ?? "—"}
                                                            </p>
                                                            <p className="mt-1 text-muted-foreground">
                                                                {formatDate(payment.created_at)}
                                                            </p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="mt-2 text-xs text-muted-foreground">
                                                    No gateway transaction recorded.
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            <StatusBadge status={order.status} />
                                        </td>
                                        <td className="px-4 py-4 text-right font-semibold">
                                            {formatPrice(order.total_amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <EmptyState>No payments match this status.</EmptyState>
            )}
            <Pagination meta={meta} page={page} setPage={changePage} />
        </div>
    );
}