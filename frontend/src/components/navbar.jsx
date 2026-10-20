import { Box, Flex, Button, Heading, Spacer } from "@chakra-ui/react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

export default function Navbar() {
    const { isAuthenticated, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    return (
        <Box bg="white" px={8} py={4} shadow="sm" mb={8}>
            <Flex alignItems="center">
                {/* Logo */}
                <Heading size="md" as={Link} to="/">
                    PonnoKini
                </Heading>

                <Spacer />

                {/* Conditional Buttons based on Zustand State */}
                {isAuthenticated ? (
                    <>
                        <Button colorScheme="red" onClick={handleLogout}>
                            Logout
                        </Button>
                    </>
                ) : (
                    <>
                        <Button as={Link} to="/products" variant="ghost" mr={4}>
                            Catalog
                        </Button>
                        <Button as={Link} to="/login" variant="ghost" mr={4}>
                            Log in
                        </Button>
                        <Button as={Link} to="/register" colorScheme="blue">
                            Sign Up
                        </Button>
                    </>
                )}
            </Flex>
        </Box>
    );
}
