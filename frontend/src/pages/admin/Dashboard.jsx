import { useEffect, useState } from "react";
import { AlertCircle, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import Chart from "@/components/charts/Chart";
import { dashboardStats } from "@/api/adminStats";

const moneyFormatter = new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-BD");
const ranges = [7, 30, 90];
const statKeys = Object.keys(dashboardStats);

function formatMoney(value) {
    return moneyFormatter.format(Number(value) || 0);
}

function formatDate(date) {
    return new Date(`${date}T00:00:00+06:00`).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
    });
}

function loadingStats() {
    return Object.fromEntries(
        statKeys.map((key) => [key, { status: "loading", data: null }]),
    );
}

function ChartSkeleton() {
    return (
        <div
            className="h-[270px] w-full animate-pulse rounded-lg bg-muted"
            aria-label="Loading chart"
        />
    );
}

function StatError({ onRetry }) {
    return (
        <div className="flex min-h-36 flex-col items-center justify-center gap-3 text-center">
            <AlertCircle className="size-5 text-destructive" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
                This statistic could not be loaded.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw aria-hidden="true" />
                Retry
            </Button>
        </div>
    );
}

function ChangeBadge({ value }) {
    if (value === null || value === undefined) {
        return (
            <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                No previous data
            </span>
        );
    }

    const isPositive = value > 0;
    const isNegative = value < 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const style = isPositive
        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
        : isNegative
          ? "bg-red-500/10 text-red-700 dark:text-red-400"
          : "bg-muted text-muted-foreground";

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${style}`}
        >
            {isPositive || isNegative ? (
                <Icon className="size-3" aria-hidden="true" />
            ) : null}
            {isPositive ? "+" : ""}
            {value.toFixed(1)}%
        </span>
    );
}

function MetricCard({ title, metric, money = false }) {
    return (
        <article className="min-w-0 rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{title}</p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                <p className="text-2xl font-bold tracking-tight">
                    {money
                        ? formatMoney(metric.value)
                        : numberFormatter.format(metric.value)}
                </p>
                <ChangeBadge value={metric.change_pct} />
            </div>
        </article>
    );
}

function CountCard({ title, value, warning = "text-foreground" }) {
    return (
        <article className="min-w-0 rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p
                className={`mt-3 text-2xl font-bold tracking-tight ${
                    value > 0 ? warning : "text-foreground"
                }`}
            >
                {numberFormatter.format(value)}
            </p>
        </article>
    );
}

function StatCardSkeleton() {
    return (
        <div className="h-28 animate-pulse rounded-xl border border-border bg-muted" />
    );
}

function ChartPanel({ title, entry, onRetry, children, className = "" }) {
    return (
        <section
            className={`min-w-0 overflow-hidden rounded-xl border border-border bg-card p-4 sm:p-5 ${className}`}
        >
            <h2 className="mb-4 truncate font-semibold">{title}</h2>
            {entry.status === "loading" ? (
                <ChartSkeleton />
            ) : entry.status === "error" ? (
                <StatError onRetry={onRetry} />
            ) : (
                children(entry.data)
            )}
        </section>
    );
}

function DonutChart({ rows, labelKey, valueKey }) {
    return (
        <Chart
            type="donut"
            height={270}
            series={rows.map((row) => Number(row[valueKey]))}
            options={{
                labels: rows.map((row) => row[labelKey]),
                legend: { position: "bottom" },
                dataLabels: { enabled: false },
                stroke: { width: 2 },
            }}
        />
    );
}

function AdminAccessNotice() {
    return (
        <div
            role="alert"
            className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
            <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
            Admin access required
        </div>
    );
}

export default function Dashboard() {
    const [range, setRange] = useState(30);
    const [refreshKey, setRefreshKey] = useState(0);
    const [response, setResponse] = useState(() => ({
        range: 30,
        refreshKey: 0,
        stats: loadingStats(),
        accessDenied: false,
    }));

    useEffect(() => {
        let isCurrent = true;

        Promise.allSettled(
            Object.entries(dashboardStats).map(([, fetchStat]) =>
                fetchStat(range),
            ),
        ).then((results) => {
            if (!isCurrent) return;

            const nextStats = {};
            let denied = false;

            results.forEach((result, index) => {
                const key = statKeys[index];
                if (result.status === "fulfilled") {
                    nextStats[key] = { status: "success", data: result.value };
                    return;
                }

                const status = result.reason?.response?.status;
                denied ||= status === 401 || status === 403;
                nextStats[key] = { status: "error", error: result.reason };
            });

            setResponse({
                range,
                refreshKey,
                stats: nextStats,
                accessDenied: denied,
            });
        });

        return () => {
            isCurrent = false;
        };
    }, [range, refreshKey]);

    const retry = () => setRefreshKey((current) => current + 1);
    const isCurrentResponse =
        response.range === range && response.refreshKey === refreshKey;
    const stats = isCurrentResponse ? response.stats : loadingStats();
    const accessDenied = isCurrentResponse && response.accessDenied;
    const summary = stats.summary;

    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm font-medium text-primary">
                        Store analytics
                    </p>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                        Dashboard
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Business performance for the last {range} days.
                    </p>
                </div>
                <div
                    className="flex flex-wrap gap-2"
                    aria-label="Dashboard date range"
                >
                    {ranges.map((days) => (
                        <Button
                            key={days}
                            type="button"
                            size="sm"
                            variant={range === days ? "default" : "outline"}
                            aria-pressed={range === days}
                            onClick={() => setRange(days)}
                        >
                            {days} days
                        </Button>
                    ))}
                </div>
            </header>

            {accessDenied && <AdminAccessNotice />}

            <section
                className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
                aria-label="Key performance indicators"
            >
                {summary.status === "loading" ? (
                    Array.from({ length: 7 }, (_, index) => (
                        <StatCardSkeleton key={index} />
                    ))
                ) : summary.status === "error" ? (
                    <div className="rounded-xl border border-border bg-card p-4 md:col-span-2 xl:col-span-3">
                        <StatError onRetry={retry} />
                    </div>
                ) : (
                    <>
                        <MetricCard
                            title="Revenue"
                            metric={summary.data.revenue}
                            money
                        />
                        <MetricCard title="Orders" metric={summary.data.orders} />
                        <MetricCard
                            title="Average order value"
                            metric={summary.data.average_order_value}
                            money
                        />
                        <MetricCard
                            title="New customers"
                            metric={summary.data.new_customers}
                        />
                        <CountCard
                            title="Orders to process"
                            value={summary.data.orders_to_process}
                            warning="text-amber-700 dark:text-amber-400"
                        />
                        <CountCard
                            title="Low-stock products"
                            value={summary.data.low_stock_products}
                            warning="text-amber-700 dark:text-amber-400"
                        />
                        <CountCard
                            title="Out-of-stock products"
                            value={summary.data.out_of_stock_products}
                            warning="text-red-700 dark:text-red-400"
                        />
                    </>
                )}
            </section>

            <section className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <ChartPanel
                    title="Sales over time"
                    entry={stats.sales}
                    onRetry={retry}
                    className="md:col-span-2"
                >
                    {(data) => (
                        <Chart
                            type="area"
                            height={300}
                            series={[
                                {
                                    name: "Revenue",
                                    data: data.series.map((point) => point.revenue),
                                },
                                {
                                    name: "Orders",
                                    data: data.series.map((point) => point.orders),
                                },
                            ]}
                            options={{
                                chart: { zoom: { enabled: false } },
                                xaxis: {
                                    categories: data.series.map((point) =>
                                        formatDate(point.date),
                                    ),
                                    tickAmount: 7,
                                },
                                yaxis: [
                                    {
                                        title: { text: "Revenue (৳)" },
                                        labels: {
                                            formatter: (value) =>
                                                numberFormatter.format(value),
                                        },
                                    },
                                    {
                                        opposite: true,
                                        title: { text: "Orders" },
                                        labels: {
                                            formatter: (value) =>
                                                numberFormatter.format(value),
                                        },
                                    },
                                ],
                                stroke: { curve: "smooth", width: [3, 2] },
                                fill: { type: "gradient", opacity: 0.2 },
                                dataLabels: { enabled: false },
                                tooltip: {
                                    y: [
                                        { formatter: formatMoney },
                                        {
                                            formatter: (value) =>
                                                `${numberFormatter.format(value)} orders`,
                                        },
                                    ],
                                },
                            }}
                        />
                    )}
                </ChartPanel>

                <ChartPanel
                    title="Orders by status"
                    entry={stats.ordersByStatus}
                    onRetry={retry}
                >
                    {(rows) => (
                        <DonutChart
                            rows={rows}
                            labelKey="status"
                            valueKey="count"
                        />
                    )}
                </ChartPanel>

                <ChartPanel
                    title="Payment methods"
                    entry={stats.paymentMethods}
                    onRetry={retry}
                >
                    {(rows) => (
                        <DonutChart
                            rows={rows}
                            labelKey="method"
                            valueKey="orders"
                        />
                    )}
                </ChartPanel>

                <ChartPanel
                    title="Payment status"
                    entry={stats.paymentStatus}
                    onRetry={retry}
                >
                    {(rows) => (
                        <DonutChart
                            rows={rows}
                            labelKey="status"
                            valueKey="count"
                        />
                    )}
                </ChartPanel>

                <ChartPanel
                    title="Top products"
                    entry={stats.topProducts}
                    onRetry={retry}
                >
                    {(rows) => (
                        <Chart
                            type="bar"
                            height={300}
                            series={[
                                {
                                    name: "Units sold",
                                    data: rows.map((row) => row.units),
                                },
                            ]}
                            options={{
                                plotOptions: {
                                    bar: {
                                        horizontal: true,
                                        borderRadius: 4,
                                        barHeight: "65%",
                                    },
                                },
                                xaxis: {
                                    categories: rows.map((row) => row.name),
                                    labels: {
                                        formatter: (value) =>
                                            numberFormatter.format(value),
                                    },
                                },
                                dataLabels: { enabled: false },
                            }}
                        />
                    )}
                </ChartPanel>

                <ChartPanel
                    title="Sales by category"
                    entry={stats.salesByCategory}
                    onRetry={retry}
                >
                    {(rows) => (
                        <Chart
                            type="bar"
                            height={300}
                            series={[
                                {
                                    name: "Revenue",
                                    data: rows.map((row) => row.revenue),
                                },
                            ]}
                            options={{
                                plotOptions: {
                                    bar: { borderRadius: 4, columnWidth: "55%" },
                                },
                                xaxis: {
                                    categories: rows.map((row) => row.category),
                                    labels: {
                                        rotate: -35,
                                        trim: true,
                                        hideOverlappingLabels: true,
                                    },
                                },
                                yaxis: {
                                    labels: {
                                        formatter: (value) =>
                                            numberFormatter.format(value),
                                    },
                                },
                                dataLabels: { enabled: false },
                                tooltip: {
                                    y: { formatter: formatMoney },
                                },
                            }}
                        />
                    )}
                </ChartPanel>

                <ChartPanel
                    title="Sales by city"
                    entry={stats.salesByCity}
                    onRetry={retry}
                >
                    {(rows) => (
                        <Chart
                            type="bar"
                            height={300}
                            series={[
                                {
                                    name: "Revenue",
                                    data: rows.map((row) => row.revenue),
                                },
                            ]}
                            options={{
                                plotOptions: {
                                    bar: {
                                        horizontal: true,
                                        borderRadius: 4,
                                        barHeight: "65%",
                                    },
                                },
                                xaxis: {
                                    categories: rows.map((row) => row.city),
                                    labels: {
                                        formatter: (value) =>
                                            numberFormatter.format(value),
                                    },
                                },
                                dataLabels: { enabled: false },
                                tooltip: {
                                    y: { formatter: formatMoney },
                                },
                            }}
                        />
                    )}
                </ChartPanel>

                <ChartPanel
                    title="New customers over time"
                    entry={stats.newCustomers}
                    onRetry={retry}
                    className="md:col-span-2"
                >
                    {(data) => (
                        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(180px,1fr)]">
                            <Chart
                                type="area"
                                height={270}
                                series={[
                                    {
                                        name: "Customers",
                                        data: data.series.map(
                                            (point) => point.count,
                                        ),
                                    },
                                ]}
                                options={{
                                    xaxis: {
                                        categories: data.series.map((point) =>
                                            formatDate(point.date),
                                        ),
                                        tickAmount: 7,
                                    },
                                    yaxis: {
                                        min: 0,
                                        labels: {
                                            formatter: (value) =>
                                                numberFormatter.format(value),
                                        },
                                    },
                                    stroke: { curve: "smooth", width: 3 },
                                    fill: {
                                        type: "gradient",
                                        opacity: 0.2,
                                    },
                                    dataLabels: { enabled: false },
                                }}
                            />
                            <div className="min-w-0">
                                <h3 className="mb-2 text-center text-sm font-medium text-muted-foreground">
                                    Signup method
                                </h3>
                                <DonutChart
                                    rows={data.by_signup_method}
                                    labelKey="method"
                                    valueKey="count"
                                />
                            </div>
                        </div>
                    )}
                </ChartPanel>

                <ChartPanel
                    title="Ratings distribution"
                    entry={stats.ratings}
                    onRetry={retry}
                >
                    {(rows) => (
                        <Chart
                            type="bar"
                            height={300}
                            series={[
                                {
                                    name: "Reviews",
                                    data: rows.map((row) => row.count),
                                },
                            ]}
                            options={{
                                plotOptions: {
                                    bar: {
                                        borderRadius: 4,
                                        columnWidth: "45%",
                                    },
                                },
                                xaxis: {
                                    categories: rows.map(
                                        (row) => `${row.rating} star`,
                                    ),
                                },
                                yaxis: {
                                    min: 0,
                                    labels: {
                                        formatter: (value) =>
                                            numberFormatter.format(value),
                                    },
                                },
                                dataLabels: { enabled: false },
                            }}
                        />
                    )}
                </ChartPanel>

                <ChartPanel
                    title="Orders by weekday and hour"
                    entry={stats.ordersHeatmap}
                    onRetry={retry}
                    className="md:col-span-2 xl:col-span-3"
                >
                    {(rows) => {
                        const weekdays = [
                            "Sunday",
                            "Monday",
                            "Tuesday",
                            "Wednesday",
                            "Thursday",
                            "Friday",
                            "Saturday",
                        ];
                        const series = weekdays.map((name, weekday) => ({
                            name,
                            data: rows
                                .filter((point) => point.weekday === weekday)
                                .map((point) => ({
                                    x: `${String(point.hour).padStart(2, "0")}:00`,
                                    y: point.orders,
                                })),
                        }));

                        return (
                            <Chart
                                type="heatmap"
                                height={320}
                                series={series}
                                options={{
                                    dataLabels: { enabled: false },
                                    plotOptions: {
                                        heatmap: {
                                            radius: 3,
                                            enableShades: true,
                                            shadeIntensity: 0.55,
                                        },
                                    },
                                    xaxis: {
                                        type: "category",
                                        labels: { rotate: -45 },
                                    },
                                    yaxis: { reversed: true },
                                }}
                            />
                        );
                    }}
                </ChartPanel>
            </section>
        </div>
    );
}
