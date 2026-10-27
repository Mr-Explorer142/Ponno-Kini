import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

const OAuthCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const loginWithToken = useAuthStore((state) => state.loginWithToken);
    const handled = useRef(false);

    useEffect(() => {
        // Stops React StrictMode from running this twice in development
        if (handled.current) return;
        handled.current = true;

        const token = searchParams.get("token");

        if (!token) {
            navigate("/login", { replace: true });
            return;
        }

        loginWithToken(token).then((success) => {
            navigate(success ? "/products" : "/login", { replace: true });
        });
    }, []);

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
            <LoaderCircle className="size-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Completing login...</p>
        </div>
    );
};

export default OAuthCallback;
