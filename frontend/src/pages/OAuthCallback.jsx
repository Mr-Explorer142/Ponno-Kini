import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { Box, Spinner, Text, VStack } from "@chakra-ui/react";

const OAuthCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // const setAuth = useAuthStore((state) => state.setAuth);

    useEffect(() => {
        const token = searchParams.get();

        if (token) {
            localStorage.setItem("auth_token", token);
            useAuthStore.setState({ token: token, isAuthenticated: true });
            navigate("/products");
        } else {
            navigate("/login");
        }
    }, [searchParams, navigate]);

    return (
        <Box display="flex" h="vh" alignItems="center" justifyContent="center">
            <VStack>
                <Spinner size="xl" color="blue.500" />
                <Text>Completing login...</Text>
            </VStack>
        </Box>
    );
};

export default OAuthCallback;
