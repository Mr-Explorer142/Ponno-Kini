import { Languages, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/admin/AdminShared";
import { t } from "@/i18n";

export default function AdminSettings({
    language,
    setLanguage,
    theme,
    onToggleTheme,
}) {
    const isDark = theme === "dark";
    const ThemeIcon = isDark ? Sun : Moon;

    return (
        <div className="space-y-6">
            <PageHeading
                title={t("Settings")}
                description={t(
                    "Manage how the admin workspace looks and how labels are displayed.",
                )}
            />

            <section
                aria-labelledby="appearance-heading"
                className="rounded-xl border border-border bg-card p-5 sm:p-6"
            >
                <div className="flex items-start gap-3">
                    <span className="rounded-lg bg-secondary p-2 text-secondary-foreground">
                        <ThemeIcon aria-hidden="true" className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h3 id="appearance-heading" className="font-semibold">
                            {t("Appearance")}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t("Choose a theme for the storefront and admin workspace.")}
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            className="mt-4"
                            aria-pressed={isDark}
                            onClick={onToggleTheme}
                        >
                            <ThemeIcon aria-hidden="true" />
                            {t(isDark ? "Switch to light mode" : "Switch to dark mode")}
                        </Button>
                    </div>
                </div>
            </section>

            <section
                aria-labelledby="language-heading"
                className="rounded-xl border border-border bg-card p-5 sm:p-6"
            >
                <div className="flex items-start gap-3">
                    <span className="rounded-lg bg-secondary p-2 text-secondary-foreground">
                        <Languages aria-hidden="true" className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h3 id="language-heading" className="font-semibold">
                            {t("Language")}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t("Choose the language used across the app.")}
                        </p>
                        <div
                            className="mt-4 flex flex-wrap gap-2"
                            role="group"
                            aria-label={t("Language")}
                        >
                            {[
                                { code: "en", label: t("English") },
                                { code: "bn", label: t("Bengali") },
                            ].map(({ code, label }) => (
                                <Button
                                    key={code}
                                    type="button"
                                    variant={language === code ? "secondary" : "outline"}
                                    aria-pressed={language === code}
                                    onClick={() => setLanguage(code)}
                                >
                                    {label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
