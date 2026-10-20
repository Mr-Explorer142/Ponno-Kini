import { useState } from "react";
import { Box, Button, Input, VStack, Heading, Text } from "@chakra-ui/react";
import { useAuthStore } from "../store/useAuthStore";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirmation, setPasswordConfirmation] = useState("");

    const { register, loading, error } = useAuthStore();
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();

        // Quick client-side check before hitting the server
        if (password !== passwordConfirmation) {
            alert("Passwords do not match!");
            return;
        }

        // Pass data matching Laravel's expected validation rules
        await register({
            name,
            email,
            password,
            password_confirmation: passwordConfirmation,
        });

        if (useAuthStore.getState().isAuthenticated) {
            navigate("/products");
        }
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
            <VStack spacing={4} as="form" onSubmit={handleRegister}>
                <Heading size="lg">Create an Account</Heading>

                {error && <Text color="red.500">{error}</Text>}

                <Input
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
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
                <Input
                    placeholder="Confirm Password"
                    type="password"
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    required
                />

                <Button
                    colorScheme="green"
                    width="full"
                    type="submit"
                    isLoading={loading}
                >
                    Sign Up
                </Button>

                <Text mt={4}>
                    Already have an account?{" "}
                    <Link
                        to="/login"
                        style={{ color: "blue", textDecoration: "underline" }}
                    >
                        Log in here
                    </Link>
                </Text>
            </VStack>
        </Box>
    );
}
