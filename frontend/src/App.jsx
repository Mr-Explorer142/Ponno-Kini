import { Route, Routes } from "react-router-dom";
import { Box, Container, Heading } from "@chakra-ui/react";
import OAuthCallback from "./pages/OAuthCallback";
import ProtectedRoute from "./routes/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Navbar from "./components/navbar";

// Initial Dummy Components
const Home = () => <Heading size="xl">Home Page</Heading>;
const ProductList = () => <Heading size="xl">Product Catalog</Heading>;
const ForgotPassword = () => <Heading>Forgot Password</Heading>;
const ResetPassword = () => <Heading>Reset Password</Heading>;
const ProductDetail = () => <Heading>Single Product View</Heading>;

function App() {
    return (
        <Box minH="100vh" bg="gray.50" color="gray.900">
            <Navbar />
            <Container maxW="container.xl" p={8}>
                <Routes>
                    {/* Public Auth Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route
                        path="/forgot-password"
                        element={<ForgotPassword />}
                    />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/auth/callback" element={<OAuthCallback />} />

                    {/* Public Catalog Routes (Matches your api-general middleware) */}
                    <Route path="/" element={<Home />} />
                    <Route path="/products" element={<ProductList />} />
                    <Route path="/products/:id" element={<ProductDetail />} />

                    {/* Protected Routes */}
                    <Route element={<ProtectedRoute />}></Route>

                    {/* 404 - Rotue Not Found or Matched */}
                    <Route
                        path="*"
                        element={
                            <Heading size="md">404 - Page Not Found!</Heading>
                        }
                    />
                </Routes>
            </Container>
        </Box>
    );
}

export default App;
