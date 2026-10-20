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
            const { user, token } = response.data;

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
            const { user, token } = response.data;

            localStorage.setItem("auth_token", token);
            set({ user, token, isAuthenticated: true, loading: false });
        } catch (err) {
            set({
                error: err.response?.data?.message || "Login failed",
                loading: false,
            });
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
