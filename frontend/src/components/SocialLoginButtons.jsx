import { FaGoogle, FaGithub } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import api from "@/api/axios.js";

export default function SocialLoginButtons() {
    const handleSocialLogin = async (provider) => {
        try {
            // Ask Laravel for the provider's redirect URL (returned as JSON)
            const response = await api.get(`/auth/${provider}/redirect`);

            if (response.data.url) {
                window.location.href = response.data.url;
            }
        } catch (error) {
            console.error(`Failed to initialize ${provider} login:`, error);
        }
    };

    return (
        <div className="flex w-full flex-col gap-3">
            <Button
                type="button"
                variant="outline"
                className="cursor-pointer w-full border-orange-200 hover:bg-orange-50"
                onClick={() => handleSocialLogin("google")}
            >
                <FaGoogle />
                Continue with Google
            </Button>

            <Button
                type="button"
                className="cursor-pointer w-full bg-zinc-900 text-white hover:bg-zinc-800"
                onClick={() => handleSocialLogin("github")}
            >
                <FaGithub />
                Continue with GitHub
            </Button>
        </div>
    );
}
