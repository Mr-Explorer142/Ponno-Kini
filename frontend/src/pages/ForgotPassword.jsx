import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, LoaderCircle, MailCheck } from "lucide-react";
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
import api from "@/api/axios";
import { t } from "@/i18n";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await api.post("/forgot-password", { email });
            setSent(true);
        } catch (err) {
            setError(
                err.response?.data?.errors?.email?.[0] ||
                    err.response?.data?.message ||
                    "Something went wrong. Please try again.",
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="mx-auto mt-10 w-full max-w-md border-orange-200">
            <CardHeader>
                <CardTitle className="text-2xl">{t("Forgot password?")}</CardTitle>
                <CardDescription>
                    {t("Enter your email and we'll send you a link to reset your password.")}
                </CardDescription>
            </CardHeader>

            <CardContent>
                {sent ? (
                    <div className="space-y-4 text-center">
                        <MailCheck className="mx-auto size-12 text-primary" />
                        <p className="text-sm text-muted-foreground">
                            {t("If an account exists for :email, a reset link is on its way. Check your inbox and spam folder.", {
                                email,
                            })}
                        </p>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setSent(false)}
                        >
                            {t("Use a different email")}
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                                {t(error)}
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

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading}
                        >
                            {loading && (
                                <LoaderCircle className="animate-spin" />
                            )}
                            {t("Send reset link")}
                        </Button>
                    </form>
                )}

                <Button asChild variant="ghost" className="mt-4 w-full">
                    <Link to="/login">
                        <ArrowLeft />
                        {t("Back to login")}
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}
