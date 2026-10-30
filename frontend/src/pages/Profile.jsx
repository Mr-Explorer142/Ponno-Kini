import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
    CalendarDays,
    KeyRound,
    LoaderCircle,
    LogOut,
    Mail,
    ShieldCheck,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import api from "@/api/axios";
import { useAuthStore } from "@/store/useAuthStore";

const PROVIDER_LABELS = {
    google: "Google",
    github: "GitHub",
};

const getInitials = (name = "") =>
    name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("") || "U";

const formatDate = (value) =>
    value
        ? new Date(value).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
          })
        : "—";

function InfoRow({ icon: Icon, label, children }) {
    return (
        <div className="flex items-start gap-3 py-3">
            <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {label}
                </p>
                <div className="wrap-break-word text-sm font-medium">
                    {children}
                </div>
            </div>
        </div>
    );
}

function ProfileSkeleton() {
    return (
        <div className="mx-auto mt-5 max-w-2xl animate-pulse space-y-4 rounded-xl border border-border bg-card p-4 sm:mt-10 sm:p-6">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <div className="size-16 shrink-0 rounded-full bg-secondary sm:size-20" />
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-5 w-40 max-w-full rounded bg-secondary" />
                    <div className="h-4 w-56 max-w-full rounded bg-secondary" />
                </div>
            </div>
            <div className="h-4 w-full rounded bg-secondary" />
            <div className="h-4 w-3/4 rounded bg-secondary" />
            <div className="h-4 w-1/2 rounded bg-secondary" />
        </div>
    );
}

export default function Profile() {
    const { user, fetchUser, logout } = useAuthStore();
    const navigate = useNavigate();

    const [searchParams] = useSearchParams();
    const verifiedParam = searchParams.get("verified");

    const [sending, setSending] = useState(false);
    const [notice, setNotice] = useState(null);

    // Refresh from /me so the profile is never stale
    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    const handleResendVerification = async () => {
        setSending(true);
        setNotice(null);

        try {
            await api.post("/email/verification-notification");
            setNotice({
                type: "success",
                text: "Verification email sent. Please check your inbox.",
            });
        } catch (err) {
            setNotice({
                type: "error",
                text:
                    err.response?.data?.message ||
                    "Could not send the email. Please try again later.",
            });
        } finally {
            setSending(false);
        }
    };

    if (!user) return <ProfileSkeleton />;

    const isVerified = !!user.email_verified_at;

    // Works whether /me returns roles as objects, strings, or a single `role`
    const roles = Array.isArray(user.roles)
        ? user.roles.map((r) => (typeof r === "string" ? r : r.name))
        : user.role
          ? [user.role]
          : [];

    const signInMethod = user.provider
        ? `${PROVIDER_LABELS[user.provider] ?? user.provider} account`
        : "Email & password";

    return (
        <Card className="mx-auto mt-5 w-full max-w-2xl border-border sm:mt-10">
            <CardHeader>
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <Avatar className="size-16 border-2 border-border sm:size-20">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="bg-secondary text-xl font-semibold text-secondary-foreground">
                            {getInitials(user.name)}
                        </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 space-y-1">
                        <CardTitle className="wrap-break-word text-xl sm:text-2xl">
                            {user.name}
                        </CardTitle>
                        <CardDescription className="break-all">
                            {user.email}
                        </CardDescription>
                        <div className="flex flex-wrap gap-2 pt-1">
                            {roles.map((role) => (
                                <Badge key={role} className="capitalize">
                                    {role}
                                </Badge>
                            ))}
                            <Badge
                                variant="outline"
                                className={
                                    isVerified
                                        ? "border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
                                        : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                }
                            >
                                {isVerified ? "Verified" : "Not verified"}
                            </Badge>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="divide-y divide-border">
                {verifiedParam === "1" && (
                    <p className="mb-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                        Your email has been verified.
                    </p>
                )}
                {verifiedParam === "invalid" && (
                    <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                        That verification link is invalid or has expired.
                    </p>
                )}

                <InfoRow icon={Mail} label="Email address">
                    {user.email}
                </InfoRow>

                <InfoRow icon={KeyRound} label="Sign-in method">
                    {signInMethod}
                </InfoRow>

                <InfoRow icon={ShieldCheck} label="Email status">
                    {isVerified
                        ? `Verified on ${formatDate(user.email_verified_at)}`
                        : "Your email is not verified yet. Verify it to place orders."}
                </InfoRow>

                <InfoRow icon={CalendarDays} label="Member since">
                    {formatDate(user.created_at)}
                </InfoRow>

                {!isVerified && (
                    <div className="space-y-3 py-4">
                        {notice && (
                            <p
                                className={
                                    notice.type === "success"
                                        ? "rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-300"
                                        : "rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                                }
                            >
                                {notice.text}
                            </p>
                        )}
                        <Button
                            className="w-full whitespace-normal text-center sm:w-auto"
                            onClick={handleResendVerification}
                            disabled={sending}
                        >
                            {sending && (
                                <LoaderCircle className="animate-spin" />
                            )}
                            Resend verification email
                        </Button>
                    </div>
                )}
            </CardContent>

            <CardFooter className="flex flex-col items-stretch gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
                <Button
                    asChild
                    variant="outline"
                    className="w-full gap-2 px-4 sm:w-auto"
                >
                    <Link to="/products">Continue shopping</Link>
                </Button>
                <Button
                    className="w-full cursor-pointer sm:w-auto"
                    variant="outline"
                    onClick={handleLogout}
                >
                    <LogOut />
                    Logout
                </Button>
            </CardFooter>
        </Card>
    );
}
