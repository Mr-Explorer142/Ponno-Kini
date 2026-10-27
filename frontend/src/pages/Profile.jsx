import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
                <div className="break-words text-sm font-medium">
                    {children}
                </div>
            </div>
        </div>
    );
}

function ProfileSkeleton() {
    return (
        <div className="mx-auto mt-10 max-w-2xl animate-pulse space-y-4 rounded-xl border border-orange-200 bg-white p-6">
            <div className="flex items-center gap-4">
                <div className="size-20 rounded-full bg-orange-100" />
                <div className="space-y-2">
                    <div className="h-5 w-40 rounded bg-orange-100" />
                    <div className="h-4 w-56 rounded bg-orange-100" />
                </div>
            </div>
            <div className="h-4 w-full rounded bg-orange-100" />
            <div className="h-4 w-3/4 rounded bg-orange-100" />
            <div className="h-4 w-1/2 rounded bg-orange-100" />
        </div>
    );
}

export default function Profile() {
    const { user, fetchUser, logout } = useAuthStore();
    const navigate = useNavigate();

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
        <Card className="mx-auto mt-10 w-full max-w-2xl border-orange-200">
            <CardHeader>
                <div className="flex items-center gap-4">
                    <Avatar className="size-20 border-2 border-orange-200">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="bg-secondary text-xl font-semibold text-secondary-foreground">
                            {getInitials(user.name)}
                        </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 space-y-1">
                        <CardTitle className="text-2xl">{user.name}</CardTitle>
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
                                        ? "border-green-300 bg-green-50 text-green-700"
                                        : "border-amber-300 bg-amber-50 text-amber-700"
                                }
                            >
                                {isVerified ? "Verified" : "Not verified"}
                            </Badge>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="divide-y divide-orange-100">
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
                                        ? "rounded-md bg-green-50 px-3 py-2 text-sm text-green-700"
                                        : "rounded-md bg-red-50 px-3 py-2 text-sm text-red-600"
                                }
                            >
                                {notice.text}
                            </p>
                        )}
                        <Button
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

            <CardFooter className="flex flex-wrap justify-between gap-3 border-t border-orange-100 pt-6">
                <Button asChild variant="outline">
                    <Link to="/products">Continue shopping</Link>
                </Button>
                <Button variant="outline" onClick={handleLogout}>
                    <LogOut />
                    Logout
                </Button>
            </CardFooter>
        </Card>
    );
}
