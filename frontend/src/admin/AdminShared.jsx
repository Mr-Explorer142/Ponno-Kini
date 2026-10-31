import { Button } from "@/components/ui/button";

export function PageHeading({ title, description, action }) {
    return (
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
                {description && (
                    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                )}
            </div>
            {action}
        </header>
    );
}

export function Notice({ children, variant = "error" }) {
    if (!children) return null;
    return (
        <p
            role={variant === "error" ? "alert" : "status"}
            className={`rounded-lg border px-4 py-3 text-sm ${
                variant === "error"
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : "border-green-600/20 bg-green-600/10 text-green-700 dark:text-green-400"
            }`}
        >
            {children}
        </p>
    );
}

export function Loading({ label = "Loading..." }) {
    return (
        <div role="status" className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            {label}
        </div>
    );
}

export function EmptyState({ children }) {
    return (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            {children}
        </div>
    );
}

export function Pagination({ meta, page, setPage }) {
    if (!meta || meta.last_page <= 1) return null;
    return (
        <div className="flex items-center justify-between gap-3">
            <Button
                type="button"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
            >
                Previous
            </Button>
            <span className="text-sm text-muted-foreground">
                Page {page} of {meta.last_page}
            </span>
            <Button
                type="button"
                variant="outline"
                disabled={page >= meta.last_page}
                onClick={() => setPage(page + 1)}
            >
                Next
            </Button>
        </div>
    );
}
