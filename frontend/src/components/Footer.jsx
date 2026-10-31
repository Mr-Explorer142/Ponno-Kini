import { Link } from "react-router-dom";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { t } from "@/i18n";

const shopLinks = [
    { to: "/products", label: "Browse catalog" },
    { to: "/#categories-heading", label: "Explore categories" },
];

const accountLinks = [
    { to: "/login", label: "Sign in" },
    { to: "/register", label: "Create an account" },
];

function FooterLinks({ title, links }) {
    return (
        <div>
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            <ul className="mt-4 space-y-3">
                {links.map(({ to, label }) => (
                    <li key={to}>
                        <Link
                            to={to}
                            className="text-sm text-muted-foreground transition-colors hover:text-primary"
                        >
                            {t(label)}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function Footer() {
    return (
        <footer className="mt-auto border-t border-border bg-background">
            <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr] lg:py-12">
                <div className="max-w-sm">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-xl font-bold text-primary"
                    >
                        <ShoppingBag className="size-5" aria-hidden="true" />
                        PonnoKini
                    </Link>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                        {t("Thoughtful finds for your home, your everyday, and everything in between.")}
                    </p>
                    <Link
                        to="/products"
                        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                    >
                        {t("Start exploring")}
                        <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                </div>

                <FooterLinks title={t("Shop")} links={shopLinks} />
                <FooterLinks title={t("Your account")} links={accountLinks} />
            </div>

            <div className="border-t border-border bg-muted/50">
                <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <p>
                        &copy; {new Date().getFullYear()} PonnoKini.{" "}
                        {t("All rights reserved.")}
                    </p>
                    <p>{t("Made for easier everyday shopping.")}</p>
                </div>
            </div>
        </footer>
    );
}
