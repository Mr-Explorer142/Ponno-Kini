import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { useAuthStore } from "@/store/useAuthStore";

export default function VerifyEmail() {
    const [code, setCode] = useState("");
    const [resendAfter, setResendAfter] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [resending, setResending] = useState(false);
    const [verified, setVerified] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [email, setEmail] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        let mounted = true;

        api.get("/email/verification-status")
            .then(({ data }) => {
                if (!mounted) return;
                setEmail(data.email);
                setResendAfter(data.resend_after_seconds);
                if (data.verified) {
                    setVerified(true);
                    setMessage("Your email address is already verified.");
                }
            })
            .catch((requestError) => {
                if (mounted) {
                    setError(
                        requestError.response?.data?.message ||
                            "Could not load your verification status.",
                    );
                }
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (resendAfter <= 0) return undefined;
        const timer = window.setTimeout(
            () => setResendAfter((seconds) => Math.max(0, seconds - 1)),
            1000,
        );
        return () => window.clearTimeout(timer);
    }, [resendAfter]);

    const handleVerify = async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setError("");
        setMessage("");

        try {
            const { data } = await api.post("/email/verify-code", { code });
            setVerified(true);
            setMessage(data.message);
            useAuthStore.setState({ user: data.user });
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                    "Verification failed. Please try again.",
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleResend = async () => {
        setResending(true);
        setError("");
        setMessage("");

        try {
            const { data } = await api.post(
                "/email/verification-notification",
            );
            setResendAfter(data.resend_after_seconds);
            setMessage(data.message);
        } catch (requestError) {
            const retryAfter = requestError.response?.data?.retry_after;
            if (retryAfter) setResendAfter(retryAfter);
            setError(
                requestError.response?.data?.message ||
                    "Could not resend the verification code.",
            );
        } finally {
            setResending(false);
        }
    };

    if (verified) {
        return (
            <Card className="mx-auto mt-5 w-full max-w-md border-border sm:mt-10">
                <CardHeader>
                    <CardTitle className="text-2xl">Email verified</CardTitle>
                    <CardDescription>{message}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        className="w-full"
                        onClick={() => navigate("/products")}
                    >
                        Continue shopping
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="mx-auto mt-5 w-full max-w-md border-border sm:mt-10">
            <CardHeader>
                <CardTitle className="text-2xl">Verify your email</CardTitle>
                <CardDescription>
                    Enter the 6-character code sent to {email || "your email"}.
                    It expires after 10 minutes.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center py-4">
                        <LoaderCircle className="animate-spin" />
                    </div>
                ) : (
                    <>
                        <form onSubmit={handleVerify} className="space-y-4">
                            {error && (
                                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                    {error}
                                </p>
                            )}
                            {message && (
                                <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                                    {message}
                                </p>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="verification-code">
                                    Verification code
                                </Label>
                                <Input
                                    id="verification-code"
                                    value={code}
                                    onChange={(event) =>
                                        setCode(
                                            event.target.value
                                                .toUpperCase()
                                                .replace(/[^A-Z0-9]/g, "")
                                                .slice(0, 6),
                                        )
                                    }
                                    placeholder="K7M2QX"
                                    autoComplete="one-time-code"
                                    maxLength={6}
                                    required
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={submitting || code.length !== 6}
                            >
                                {submitting && (
                                    <LoaderCircle className="animate-spin" />
                                )}
                                Verify email
                            </Button>
                        </form>

                        <div className="mt-5 text-center">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleResend}
                                disabled={resending || resendAfter > 0}
                            >
                                {resending && (
                                    <LoaderCircle className="animate-spin" />
                                )}
                                {resendAfter > 0
                                    ? `Resend code in ${resendAfter}s`
                                    : "Resend code"}
                            </Button>
                        </div>
                    </>
                )}
                <p className="mt-5 text-center text-sm text-muted-foreground">
                    Wrong account?{" "}
                    <Link
                        to="/login"
                        className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                        Sign in with another account
                    </Link>
                </p>
            </CardContent>
        </Card>
    );
}
