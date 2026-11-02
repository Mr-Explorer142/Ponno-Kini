import { Badge } from "@/components/ui/badge";

const statusStyles = {
    order: {
        pending: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        processing: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
        completed: "border-green-600/30 bg-green-600/10 text-green-700 dark:text-green-300",
        cancelled: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
        failed: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
    },
    payment: {
        pending: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        paid: "border-green-600/30 bg-green-600/10 text-green-700 dark:text-green-300",
        failed: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
        cancelled: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
        refunded: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    },
};

export default function StatusBadge({ status, type = "order" }) {
    const normalizedStatus = String(status ?? "unknown").toLowerCase();

    return (
        <Badge
            variant="outline"
            className={`capitalize ${
                statusStyles[type]?.[normalizedStatus] ??
                "border-border bg-muted text-muted-foreground"
            }`}
        >
            {normalizedStatus.replaceAll("_", " ")}
        </Badge>
    );
}