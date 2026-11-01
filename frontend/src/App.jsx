import { useEffect, useLayoutEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { useLocation } from "react-router-dom";
import OAuthCallback from "./pages/OAuthCallback";
import ProtectedRoute from "./routes/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Orders from "./pages/Orders";
import VerifyEmail from "./pages/VerifyEmail";
import Home from "./pages/Home";
import ProductCatalog from "./pages/ProductCatalog";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import OrderResult from "./pages/OrderResult";
import AdminRoute from "./routes/AdminRoute";
import AdminLayout from "./admin/AdminLayout";
import AdminDashboard from "./admin/AdminDashboard";
import AdminProducts from "./admin/AdminProducts";
import AdminCategories from "./admin/AdminCategories";
import AdminOrders from "./admin/AdminOrders";
import AdminQuestions from "./admin/AdminQuestions";
import AdminUsers from "./admin/AdminUsers";
import AdminSettings from "./admin/AdminSettings";
import Navbar from "./components/navbar";
import Footer from "./components/Footer";
import { useAuthStore } from "./store/useAuthStore";
import { useLocale } from "./locale-context";
import { t } from "./i18n";

const Page = ({ title }) => <h1 className="text-3xl font-bold">{t(title)}</h1>;

function App() {
    const fetchUser = useAuthStore((state) => state.fetchUser);
    const { language, setLanguage } = useLocale();
    const location = useLocation();
    const isAdminPage = location.pathname.startsWith("/admin");
    const [theme, setTheme] = useState(() =>
        localStorage.getItem("ponno-kini-theme") === "dark" ? "dark" : "light",
    );

    useLayoutEffect(() => {
        document.documentElement.classList.toggle("dark", theme === "dark");
        document.documentElement.style.colorScheme = theme;
    }, [theme]);

    // Restore the user from /me on page load
    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    const toggleTheme = () => {
        const nextTheme = theme === "dark" ? "light" : "dark";
        localStorage.setItem("ponno-kini-theme", nextTheme);
        setTheme(nextTheme);
    };

    return (
        <div
            data-language={language}
            className="flex min-h-screen flex-col bg-background text-foreground"
        >
            {!isAdminPage && <Navbar theme={theme} onToggleTheme={toggleTheme} />}
            <main
                className={
                    isAdminPage
                        ? "w-full flex-1"
                        : "mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-8 lg:px-8"
                }
            >
                <Routes>
                    <Route path="/admin" element={<AdminRoute />}>
                        <Route element={<AdminLayout />}>
                            <Route index element={<AdminDashboard />} />
                            <Route path="products" element={<AdminProducts />} />
                            <Route path="categories" element={<AdminCategories />} />
                            <Route path="orders" element={<AdminOrders />} />
                            <Route path="questions" element={<AdminQuestions />} />
                            <Route path="users" element={<AdminUsers />} />
                            <Route
                                path="settings"
                                element={
                                    <AdminSettings
                                        language={language}
                                        setLanguage={setLanguage}
                                        theme={theme}
                                        onToggleTheme={toggleTheme}
                                    />
                                }
                            />
                        </Route>
                    </Route>
                    {/* Public auth routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route
                        path="/forgot-password"
                        element={<ForgotPassword />}
                    />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    {/* Must match FRONTEND_URL . '/social-login' in Laravel */}
                    <Route path="/social-login" element={<OAuthCallback />} />

                    {/* Public catalog routes */}
                    <Route path="/" element={<Home />} />
                    <Route path="/products" element={<ProductCatalog />} />
                    <Route path="/products/:id" element={<ProductDetail />} />
                    <Route path="/cart" element={<Cart />} />

                    {/* Protected routes */}
                    <Route element={<ProtectedRoute />}>
                        <Route path="/verify-email" element={<VerifyEmail />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/orders" element={<Orders />} />
                        <Route path="/order-result" element={<OrderResult />} />
                    </Route>

                    {/* 404 */}
                    <Route
                        path="*"
                        element={<Page title="404 - Page Not Found!" />}
                    />
                </Routes>
            </main>
            {!isAdminPage && <Footer />}
        </div>
    );
}

export default App;
