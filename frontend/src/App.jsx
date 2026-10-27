import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import OAuthCallback from "./pages/OAuthCallback";
import ProtectedRoute from "./routes/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Navbar from "./components/Navbar";
import { useAuthStore } from "./store/useAuthStore";

// Initial dummy pages
const Page = ({ title }) => <h1 className="text-3xl font-bold">{title}</h1>;

function App() {
    const fetchUser = useAuthStore((state) => state.fetchUser);

    // Restore the user from /me on page load
    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <main className="mx-auto max-w-7xl px-4 py-8">
                <Routes>
                    {/* Public auth routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route
                        path="/forgot-password"
                        element={<Page title="Forgot Password" />}
                    />
                    <Route
                        path="/reset-password"
                        element={<Page title="Reset Password" />}
                    />
                    {/* Must match FRONTEND_URL . '/social-login' in Laravel */}
                    <Route path="/social-login" element={<OAuthCallback />} />

                    {/* Public catalog routes */}
                    <Route path="/" element={<Page title="Home Page" />} />
                    <Route
                        path="/products"
                        element={<Page title="Product Catalog" />}
                    />
                    <Route
                        path="/products/:id"
                        element={<Page title="Single Product View" />}
                    />

                    {/* Protected routes */}
                    <Route element={<ProtectedRoute />}>
                        <Route path="/profile" element={<Profile />} />
                    </Route>

                    {/* 404 */}
                    <Route
                        path="*"
                        element={<Page title="404 - Page Not Found!" />}
                    />
                </Routes>
            </main>
        </div>
    );
}

export default App;
