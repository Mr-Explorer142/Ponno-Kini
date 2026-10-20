import { useState } from "react";
import { Box, Button, Heading, Input, Text, VStack } from "@chakra-ui/react";
import { useAuthStore } from "../store/useAuthStore.js";
import api from "../api/axios.js";

export default function Login() {
    // 1. Local State from the form inputs
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // 2. Global State from Zustand
    const { loading, error } = useAuthStore();

    const handleLogin = async (provider) => {
        try {
            const response = await api.get(`/auth/${provider}/redirect`);
            const oauthurl = response.data.url;
            window.location.href = oauthurl;
        } catch (error) {
            console.error("Failed to log Social Login URL", error);
        }
    };

    const handleSocialLogin = (provider) => {
        window.location.href = `http://localhost:8000/api/auth/${provider}/redirect`;
    };

    return (
        <Box
            maxW="md"
            mx="auto"
            mt={10}
            p={6}
            borderWidth={1}
            borderRadius="lg"
            bg="white"
        >
            <VStack spacing={4} as="form" onSubmit={handleLogin}>
                <Heading size="lg">Login</Heading>
                {error & <Text color="red.500">{error}</Text>}
                <Input
                    placeholder="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <Input
                    placeholder="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <Button
                    type="submit"
                    isLoading={loading}
                    colorScheme="blue"
                    width="full"
                >
                    Sign In
                </Button>
                <Text>Or</Text>

                {/* Social Auth buttons */}

                <Button
                    width="full"
                    onClick={() => handleSocialLogin("google")}
                >
                    Continue with Google
                </Button>
                <Button
                    width="full"
                    onClick={() => handleSocialLogin("github")}
                >
                    Continue with GitHub
                </Button>
            </VStack>
        </Box>
    );
}
