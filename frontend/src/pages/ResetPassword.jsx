import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import api from "@/api/axios";
import { t } from "@/i18n";

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Both come from the link in the reset email
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    const [password, setPassword] = useState("");
    const [passwordConfirmation, setPasswordConfirmation] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (password !== passwordConfirmation) {
            setError("Passwords do not match!");
            return;
        }

        setLoading(true);

        try {
            await api.post("/reset-password", {
                token,
                email,
                password,
                password_confirmation: passwordConfirmation,
            });

            // The backend revokes all tokens on reset, so sign in again
            navigate("/login?reset=1", { replace: true });
        } catch (err) {
            const errors = err.response?.data?.errors;
            setError(
                errors?.password?.[0] ||
                    errors?.email?.[0] ||
                    err.response?.data?.message ||
                    "Could not reset your password. Please try again.",
            );
        } finally {
            setLoading(false);
        }
    };

    // Opened without a valid link
    if (!token || !email) {
        return (
            <Card className="mx-auto mt-10 w-full max-w-md border-orange-200">
                <CardHeader>
                    <CardTitle className="text-2xl">
                        {t("Invalid reset link")}
                    </CardTitle>
                    <CardDescription>
                        {t("This link is missing information or has expired. Request a new one to continue.")}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild className="w-full">
                        <Link to="/forgot-password">{t("Request a new link")}</Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="mx-auto mt-10 w-full max-w-md border-orange-200">
            <CardHeader>
                <CardTitle className="text-2xl">{t("Reset password")}</CardTitle>
                <CardDescription>
                    {t("Choose a new password for :email.", { email })}
                </CardDescription>
            </CardHeader>

            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                            {t(error)}{" "}
                            {error.toLowerCase().includes("token") && (
                                <Link
                                    to="/forgot-password"
                                    className="font-medium underline"
                                >
                                    {t("Request a new link")}
                                </Link>
                            )}
                        </p>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="password">{t("New password")}</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder={t("At least 8 characters")}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            minLength={8}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password_confirmation">
                            {t("Confirm new password")}
                        </Label>
                        <Input
                            id="password_confirmation"
                            type="password"
                            value={passwordConfirmation}
                            onChange={(e) =>
                                setPasswordConfirmation(e.target.value)
                            }
                            minLength={8}
                            required
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <LoaderCircle className="animate-spin" />}
                        {t("Reset password")}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
