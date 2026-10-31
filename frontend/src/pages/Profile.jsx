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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const getErrorMessage = (error, fallback) =>
    error.response?.data?.message ||
    Object.values(error.response?.data?.errors ?? {}).flat()[0] ||
    fallback;

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
    const [name, setName] = useState(null);
    const [email, setEmail] = useState(null);
    const [emailCurrentPassword, setEmailCurrentPassword] = useState("");
    const [emailCode, setEmailCode] = useState("");
    const [passwordCurrentPassword, setPasswordCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [passwordConfirmation, setPasswordConfirmation] = useState("");
    const [passwordCode, setPasswordCode] = useState("");
    const [emailCodePending, setEmailCodePending] = useState(false);
    const [passwordCodePending, setPasswordCodePending] = useState(false);
    const [saving, setSaving] = useState(false);
    const [accountNotice, setAccountNotice] = useState(null);

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

    const handleSaveName = async (event) => {
        event.preventDefault();
        setSaving(true);
        setAccountNotice(null);

        try {
            await api.patch("/profile", { name: name ?? user.name });
            await fetchUser();
            setAccountNotice({ type: "success", text: "Your name has been updated." });
        } catch (error) {
            setAccountNotice({
                type: "error",
                text: getErrorMessage(error, "Your name could not be updated."),
            });
        } finally {
            setSaving(false);
        }
    };

    const handleRequestEmailChange = async (event) => {
        event.preventDefault();
        setSaving(true);
        setAccountNotice(null);

        try {
            const nextEmail = email ?? user.email;
            await api.post("/profile/email/request", {
                email: nextEmail,
                ...(!user.provider && {
                    current_password: emailCurrentPassword,
                }),
            });
            setEmailCodePending(true);
            setEmailCurrentPassword("");
            setAccountNotice({
                type: "success",
                text: `A verification code has been sent to ${nextEmail}.`,
            });
        } catch (error) {
            setAccountNotice({
                type: "error",
                text: getErrorMessage(
                    error,
                    "A verification code could not be sent.",
                ),
            });
        } finally {
            setSaving(false);
        }
    };

    const handleVerifyEmailChange = async (event) => {
        event.preventDefault();
        setSaving(true);
        setAccountNotice(null);

        try {
            await api.post("/profile/email/verify", { code: emailCode });
            setEmailCodePending(false);
            setEmailCode("");
            await fetchUser();
            setAccountNotice({
                type: "success",
                text: "Your email address has been updated and verified.",
            });
        } catch (error) {
            setAccountNotice({
                type: "error",
                text: getErrorMessage(
                    error,
                    "The email verification code could not be confirmed.",
                ),
            });
        } finally {
            setSaving(false);
        }
    };

    const handleResendChangeCode = async (changeType) => {
        setSaving(true);
        setAccountNotice(null);

        try {
            const response = await api.post(
                `/profile/${changeType}/resend`,
            );
            setAccountNotice({
                type: "success",
                text: response.data.message,
            });
        } catch (error) {
            setAccountNotice({
                type: "error",
                text: getErrorMessage(
                    error,
                    "A new verification code could not be sent.",
                ),
            });
        } finally {
            setSaving(false);
        }
    };

    const handleRequestPasswordChange = async (event) => {
        event.preventDefault();
        setSaving(true);
        setAccountNotice(null);

        try {
            await api.post("/profile/password/request", {
                ...(!user.provider && {
                    current_password: passwordCurrentPassword,
                }),
                new_password: newPassword,
                new_password_confirmation: passwordConfirmation,
            });
            setPasswordCodePending(true);
            setPasswordCurrentPassword("");
            setNewPassword("");
            setPasswordConfirmation("");
            setAccountNotice({
                type: "success",
                text: `A verification code has been sent to ${user.email}.`,
            });
        } catch (error) {
            setAccountNotice({
                type: "error",
                text: getErrorMessage(
                    error,
                    "A verification code could not be sent.",
                ),
            });
        } finally {
            setSaving(false);
        }
    };

    const handleVerifyPasswordChange = async (event) => {
        event.preventDefault();
        setSaving(true);
        setAccountNotice(null);

        try {
            await api.post("/profile/password/verify", { code: passwordCode });
            setPasswordCodePending(false);
            setPasswordCode("");
            setAccountNotice({
                type: "success",
                text: "Your password has been updated.",
            });
        } catch (error) {
            setAccountNotice({
                type: "error",
                text: getErrorMessage(
                    error,
                    "The password verification code could not be confirmed.",
                ),
            });
        } finally {
            setSaving(false);
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

                <section className="space-y-6 border-t border-border pt-6">
                    <div>
                        <h2 className="text-lg font-semibold">
                            Account settings
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Email and password changes require a verification code.
                        </p>
                    </div>

                    {accountNotice && (
                        <p
                            role={accountNotice.type === "error" ? "alert" : "status"}
                            className={
                                accountNotice.type === "success"
                                    ? "rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-300"
                                    : "rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                            }
                        >
                            {accountNotice.text}
                        </p>
                    )}

                    <form className="space-y-3" onSubmit={handleSaveName}>
                        <h3 className="font-medium">Name</h3>
                        <Label htmlFor="profile-name">Your name</Label>
                        <Input
                            id="profile-name"
                            autoComplete="name"
                            value={name ?? user.name}
                            onChange={(event) => setName(event.target.value)}
                            required
                            maxLength={255}
                        />
                        <Button
                            type="submit"
                            disabled={saving || (name ?? user.name) === user.name}
                        >
                            Save name
                        </Button>
                    </form>

                    <form
                        className="space-y-3 border-t border-border pt-5"
                        onSubmit={
                            emailCodePending
                                ? handleVerifyEmailChange
                                : handleRequestEmailChange
                        }
                    >
                        <h3 className="font-medium">Email address</h3>
                        {!emailCodePending ? (
                            <>
                                <Label htmlFor="profile-email">New email</Label>
                                <Input
                                    id="profile-email"
                                    type="email"
                                    autoComplete="email"
                                    value={email ?? user.email}
                                    onChange={(event) =>
                                        setEmail(event.target.value)
                                    }
                                    required
                                />
                                {!user.provider && (
                                    <>
                                        <Label htmlFor="email-current-password">
                                            Current password
                                        </Label>
                                        <Input
                                            id="email-current-password"
                                            type="password"
                                            autoComplete="current-password"
                                            value={emailCurrentPassword}
                                            onChange={(event) =>
                                                setEmailCurrentPassword(
                                                    event.target.value,
                                                )
                                            }
                                            required
                                        />
                                    </>
                                )}
                                <Button
                                    type="submit"
                                    disabled={
                                        saving ||
                                        (email ?? user.email) === user.email
                                    }
                                >
                                    Send verification code
                                </Button>
                            </>
                        ) : (
                            <>
                                <p className="text-sm text-muted-foreground">
                                    Enter the code sent to {email ?? user.email}.
                                </p>
                                <Label htmlFor="email-verification-code">
                                    Verification code
                                </Label>
                                <Input
                                    id="email-verification-code"
                                    autoComplete="one-time-code"
                                    value={emailCode}
                                    onChange={(event) =>
                                        setEmailCode(
                                            event.target.value
                                                .toUpperCase()
                                                .slice(0, 6),
                                        )
                                    }
                                    required
                                    minLength={6}
                                    maxLength={6}
                                />
                                <Button type="submit" disabled={saving}>
                                    Verify new email
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={saving}
                                    onClick={() =>
                                        handleResendChangeCode("email")
                                    }
                                >
                                    Resend code
                                </Button>
                            </>
                        )}
                    </form>

                    <form
                        className="space-y-3 border-t border-border pt-5"
                        onSubmit={
                            passwordCodePending
                                ? handleVerifyPasswordChange
                                : handleRequestPasswordChange
                        }
                    >
                        <h3 className="font-medium">Password</h3>
                        {!passwordCodePending ? (
                            <>
                                {!user.provider && (
                                    <>
                                        <Label htmlFor="password-current">
                                            Current password
                                        </Label>
                                        <Input
                                            id="password-current"
                                            type="password"
                                            autoComplete="current-password"
                                            value={passwordCurrentPassword}
                                            onChange={(event) =>
                                                setPasswordCurrentPassword(
                                                    event.target.value,
                                                )
                                            }
                                            required
                                        />
                                    </>
                                )}
                                <Label htmlFor="new-password">
                                    New password
                                </Label>
                                <Input
                                    id="new-password"
                                    type="password"
                                    autoComplete="new-password"
                                    value={newPassword}
                                    onChange={(event) =>
                                        setNewPassword(event.target.value)
                                    }
                                    required
                                    minLength={8}
                                />
                                <Label htmlFor="confirm-new-password">
                                    Confirm new password
                                </Label>
                                <Input
                                    id="confirm-new-password"
                                    type="password"
                                    autoComplete="new-password"
                                    value={passwordConfirmation}
                                    onChange={(event) =>
                                        setPasswordConfirmation(
                                            event.target.value,
                                        )
                                    }
                                    required
                                    minLength={8}
                                />
                                <Button type="submit" disabled={saving}>
                                    Send verification code
                                </Button>
                            </>
                        ) : (
                            <>
                                <p className="text-sm text-muted-foreground">
                                    Enter the code sent to {user.email}.
                                </p>
                                <Label htmlFor="password-verification-code">
                                    Verification code
                                </Label>
                                <Input
                                    id="password-verification-code"
                                    autoComplete="one-time-code"
                                    value={passwordCode}
                                    onChange={(event) =>
                                        setPasswordCode(
                                            event.target.value
                                                .toUpperCase()
                                                .slice(0, 6),
                                        )
                                    }
                                    required
                                    minLength={6}
                                    maxLength={6}
                                />
                                <Button type="submit" disabled={saving}>
                                    Verify and change password
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={saving}
                                    onClick={() =>
                                        handleResendChangeCode("password")
                                    }
                                >
                                    Resend code
                                </Button>
                            </>
                        )}
                    </form>
                </section>

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
