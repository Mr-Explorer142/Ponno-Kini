import { create } from "zustand";
import api from "../api/axios";

export const useAuthStore = create((set) => ({
    user: null,
    token: localStorage.getItem("auth_token") || null,
    isAuthenticated: !!localStorage.getItem("auth_token"),
    loading: false,
    error: null,

    register: async (userData) => {
        set({ loading: true, error: null });

        try {
            const response = await api.post("/register", userData);
            const { user, access_token: token } = response.data;

            localStorage.setItem("auth_token", token);
            set({ user, token, isAuthenticated: true, loading: false });
        } catch (err) {
            set({
                error: err.response?.data?.message || "Registration Failed!",
                loading: false,
            });
        }
    },

    login: async (credentials) => {
        set({ loading: true, error: null });
        try {
            const response = await api.post("/login", credentials);
            const { user, access_token: token } = response.data;

            localStorage.setItem("auth_token", token);
            set({ user, token, isAuthenticated: true, loading: false });
        } catch (err) {
            set({
                error: err.response?.data?.message || "Login failed",
                loading: false,
            });
        }
    },

    // NEW: used by the social login callback page.
    // Saves the token, loads the user from /me, returns true/false.
    loginWithToken: async (token) => {
        set({ loading: true, error: null });

        // Must be saved BEFORE the /me call, because the axios
        // interceptor reads the token from localStorage.
        localStorage.setItem("auth_token", token);

        try {
            const response = await api.get("/me");
            // Adjust if your /me response has a different shape
            const user = response.data.user ?? response.data;

            set({ user, token, isAuthenticated: true, loading: false });
            return true;
        } catch (err) {
            localStorage.removeItem("auth_token");
            set({
                user: null,
                token: null,
                isAuthenticated: false,
                loading: false,
                error: "Social login failed. Please try again.",
            });
            return false;
        }
    },

    // NEW: restores the user after a page refresh.
    // Without this, `user` is null on reload even though a token exists.
    fetchUser: async () => {
        const token = localStorage.getItem("auth_token");

        if (!token) {
            set({ user: null, token: null, isAuthenticated: false });
            return false;
        }

        try {
            const response = await api.get("/me");
            const user = response.data.user ?? response.data;

            set({ user, token, isAuthenticated: true });
            return true;
        } catch (err) {
            // Only log out if the token is actually invalid.
            // A network error shouldn't sign the user out.
            if (err.response?.status === 401) {
                localStorage.removeItem("auth_token");
                set({ user: null, token: null, isAuthenticated: false });
            }
            return false;
        }
    },

    logout: async () => {
        try {
            await api.post("/logout");
        } catch (err) {
            console.error("Logout error", err);
        } finally {
            localStorage.removeItem("auth_token");
            set({ user: null, token: null, isAuthenticated: false });
        }
    },
}));
