import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/store/useAuthStore";
import SocialLoginButtons from "@/components/SocialLoginButtons";
import { t } from "@/i18n";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const { login, loading, error } = useAuthStore();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Laravel sends users to /login?error=social_auth_failed when OAuth fails
    const socialError =
        searchParams.get("error") === "social_auth_failed"
            ? t("Social login failed. Please try again.")
            : null;

    // ResetPassword sends users here with ?reset=1 after success
    const resetSuccess = searchParams.get("reset") === "1";

    const handleSubmit = async (e) => {
        e.preventDefault();
        const loggedIn = await login({ email, password });

        if (loggedIn) {
            const user = useAuthStore.getState().user;
            const isAdmin = user?.roles?.some((role) => role.name === "admin");
            navigate(
                !user?.email_verified_at
                    ? "/verify-email"
                    : isAdmin
                      ? "/admin"
                      : "/products",
            );
        }
    };

    return (
        <Card className="mx-auto mt-5 w-full max-w-md border-border sm:mt-10">
            <CardHeader>
                <CardTitle className="text-2xl">{t("Login")}</CardTitle>
                <CardDescription>
                    {t("Welcome back! Sign in to your account.")}
                </CardDescription>
            </CardHeader>

            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {resetSuccess && (
                        <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                            {t("Password reset successfully. Please sign in with your new password.")}
                        </p>
                    )}

                    {(error || socialError) && (
                        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {t(error || socialError)}
                        </p>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="email">{t("Email")}</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password">{t("Password")}</Label>
                            <Link
                                to="/forgot-password"
                                className="text-sm text-primary underline-offset-4 hover:underline"
                            >
                                {t("Forgot password?")}
                            </Link>
                        </div>
                        <Input
                            id="password"
                            type="password"
                            placeholder={t("Your password")}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <LoaderCircle className="animate-spin" />}
                        {t("Sign In")}
                    </Button>
                </form>

                <div className="my-5 flex items-center">
                    <div className="flex-1 border-t border-border" />
                    <span className="px-3 text-xs uppercase text-muted-foreground">
                        {t("Or")}
                    </span>
                    <div className="flex-1 border-t border-border" />
                </div>

                <SocialLoginButtons />

                <p className="mt-5 text-center text-sm text-muted-foreground">
                    {t("Don't have an account?")}{" "}
                    <Link
                        to="/register"
                        className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                        {t("Sign up")}
                    </Link>
                </p>
            </CardContent>
        </Card>
    );
}
