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

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const { login, loading, error } = useAuthStore();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Laravel sends users to /login?error=social_auth_failed when OAuth fails
    const socialError =
        searchParams.get("error") === "social_auth_failed"
            ? "Social login failed. Please try again."
            : null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        await login({ email, password });

        if (useAuthStore.getState().isAuthenticated) {
            navigate("/products");
        }
    };

    return (
        <Card className="mx-auto mt-10 w-full max-w-md border-orange-200">
            <CardHeader>
                <CardTitle className="text-2xl">Login</CardTitle>
                <CardDescription>
                    Welcome back! Sign in to your account.
                </CardDescription>
            </CardHeader>

            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {(error || socialError) && (
                        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                            {error || socialError}
                        </p>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
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
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="Your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <LoaderCircle className="animate-spin" />}
                        Sign In
                    </Button>
                </form>

                <div className="my-5 flex items-center">
                    <div className="flex-1 border-t border-orange-200" />
                    <span className="px-3 text-xs uppercase text-muted-foreground">
                        Or
                    </span>
                    <div className="flex-1 border-t border-orange-200" />
                </div>

                <SocialLoginButtons />

                <p className="mt-5 text-center text-sm text-muted-foreground">
                    Don&apos;t have an account?{" "}
                    <Link
                        to="/register"
                        className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                        Sign up
                    </Link>
                </p>
            </CardContent>
        </Card>
    );
}
