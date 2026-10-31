import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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

export default function Register() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirmation, setPasswordConfirmation] = useState("");
    const [localError, setLocalError] = useState(null);

    const { register, loading, error } = useAuthStore();
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setLocalError(null);

        // Quick client-side check before hitting the server
        if (password !== passwordConfirmation) {
            setLocalError("Passwords do not match!");
            return;
        }

        // Match Laravel's validation rules
        const registered = await register({
            name,
            email,
            password,
            password_confirmation: passwordConfirmation,
        });

        if (registered) {
            navigate("/verify-email");
        }
    };

    return (
        <Card className="mx-auto mt-5 w-full max-w-md border-border sm:mt-10">
            <CardHeader>
                <CardTitle className="text-2xl">{t("Create an Account")}</CardTitle>
                <CardDescription>
                    {t("Join PonnoKini and start shopping.")}
                </CardDescription>
            </CardHeader>

            <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                    {(localError || error) && (
                        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {t(localError || error)}
                        </p>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="name">{t("Full Name")}</Label>
                        <Input
                            id="name"
                            placeholder={t("Your full name")}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

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
                        <Label htmlFor="password">{t("Password")}</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password_confirmation">
                            {t("Confirm Password")}
                        </Label>
                        <Input
                            id="password_confirmation"
                            type="password"
                            value={passwordConfirmation}
                            onChange={(e) =>
                                setPasswordConfirmation(e.target.value)
                            }
                            required
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <LoaderCircle className="animate-spin" />}
                        {t("Sign Up")}
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
                    {t("Already have an account?")}{" "}
                    <Link
                        to="/login"
                        className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                        {t("Log in here")}
                    </Link>
                </p>
            </CardContent>
        </Card>
    );
}
