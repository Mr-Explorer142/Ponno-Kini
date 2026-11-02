import ChartPrimitive from "react-apexcharts";
import useIsDark from "@/hooks/useIsDark";

const COLORS = {
    light: {
        primary: "#ea580c",
        accent: "#f97316",
        amber: "#d97706",
        green: "#16a34a",
        red: "#dc2626",
        blue: "#64748b",
        foreground: "#352a20",
        muted: "#806a5f",
        border: "#ead9c4",
        grid: "#ead9c4",
        palette: ["#ea580c", "#d97706", "#16a34a", "#64748b", "#dc2626"],
    },
    dark: {
        primary: "#f5a623",
        accent: "#fb923c",
        amber: "#fbbf24",
        green: "#4ade80",
        red: "#f87171",
        blue: "#94a3b8",
        foreground: "#f7f3e8",
        muted: "#bbb19e",
        border: "#5e4d3e",
        grid: "#5e4d3e",
        palette: ["#f5a623", "#fb923c", "#fbbf24", "#94a3b8", "#f87171"],
    },
};

function hasNoData(series) {
    if (!Array.isArray(series) || series.length === 0) return true;

    const values = series.flatMap((entry) =>
        Array.isArray(entry.data)
            ? entry.data.map((point) =>
                  typeof point === "number"
                      ? point
                      : Number(point?.y ?? point?.value ?? 0),
              )
            : [Number(entry)],
    );

    return values.length === 0 || values.every((value) => !value);
}

export default function Chart({
    type,
    series,
    options = {},
    height,
    emptyMessage = "No data for this period",
}) {
    const isDark = useIsDark();
    const palette = isDark ? COLORS.dark : COLORS.light;

    if (hasNoData(series)) {
        return (
            <div
                className="grid w-full place-items-center text-sm text-muted-foreground"
                style={{ height }}
                role="status"
            >
                {emptyMessage}
            </div>
        );
    }

    const chartOptions = {
        ...options,
        chart: {
            ...options.chart,
            background: "transparent",
            fontFamily: "inherit",
            foreColor: palette.muted,
            height,
            toolbar: { ...options.chart?.toolbar, show: false },
        },
        colors: options.colors ?? palette.palette,
        grid: {
            ...options.grid,
            borderColor: palette.grid,
        },
        theme: {
            ...options.theme,
            mode: isDark ? "dark" : "light",
        },
    };

    return (
        <div className="min-w-0 w-full overflow-hidden">
            <ChartPrimitive
                type={type}
                height={height}
                series={series}
                options={chartOptions}
            />
        </div>
    );
}
