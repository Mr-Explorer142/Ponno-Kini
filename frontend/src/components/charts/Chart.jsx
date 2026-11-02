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
        violet: "#7c3aed",
        pending: "#2563eb",
        foreground: "#352a20",
        muted: "#806a5f",
        border: "#ead9c4",
        grid: "#ead9c4",
        heatmapEmpty: "#f1e4d4",
        palette: ["#ea580c", "#dc2626", "#2563eb", "#16a34a", "#7c3aed"],
    },
    dark: {
        primary: "#f5a623",
        accent: "#fb923c",
        amber: "#fbbf24",
        green: "#4ade80",
        red: "#f87171",
        blue: "#94a3b8",
        violet: "#a78bfa",
        pending: "#60a5fa",
        foreground: "#f7f3e8",
        muted: "#bbb19e",
        border: "#5e4d3e",
        grid: "#5e4d3e",
        heatmapEmpty: "#3d342d",
        palette: ["#fb923c", "#f87171", "#60a5fa", "#4ade80", "#a78bfa"],
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
    statusColors = false,
    categoryColors = {},
}) {
    const isDark = useIsDark();
    const palette = isDark ? COLORS.dark : COLORS.light;

    if (type !== "heatmap" && hasNoData(series)) {
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

    const colors =
        statusColors || Object.keys(categoryColors).length > 0
            ? (options.labels ?? []).map((label, index) => {
                  const category = label.toLowerCase().trim();
                  const categoryColor = categoryColors[category];
                  if (categoryColor && palette[categoryColor]) {
                      return palette[categoryColor];
                  }
                  if (statusColors) {
                      if (category === "processing") return palette.accent;
                      if (category === "pending") return palette.pending;
                      if (["failed", "failure"].includes(category)) return palette.red;
                      if (["cancel", "cancelled", "canceled"].includes(category)) {
                          return palette.blue;
                      }
                      if (["success", "succeeded", "completed", "paid"].includes(category)) {
                          return palette.green;
                      }
                  }
                  return palette.palette[index % palette.palette.length];
              })
            : palette.palette;

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
        colors: options.colors ?? colors,
        plotOptions:
            type === "heatmap"
                ? {
                      ...options.plotOptions,
                      heatmap: {
                          ...options.plotOptions?.heatmap,
                          colorScale: {
                              ...options.plotOptions?.heatmap?.colorScale,
                              ranges: [
                                  {
                                      from: 0,
                                      to: 0,
                                      color: palette.heatmapEmpty,
                                      name: "No orders",
                                  },
                                  {
                                      from: 1,
                                      to: Number.MAX_SAFE_INTEGER,
                                      color: palette.primary,
                                      name: "Orders",
                                  },
                              ],
                          },
                      },
                  }
                : options.plotOptions,
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
