import { useCallback, useEffect, useState } from "react";
import { Plus, Search, ShieldCheck, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/api/axios";
import {
    EmptyState,
    Loading,
    Notice,
    PageHeading,
    Pagination,
} from "./AdminShared";
import { formatDate } from "./AdminFormat";

export default function AdminUsers() {
    const emptyForm = {
        name: "",
        email: "",
        role: "customer",
        password: "",
        password_confirmation: "",
    };
    const [users, setUsers] = useState([]);
    const [meta, setMeta] = useState(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [createFormOpen, setCreateFormOpen] = useState(false);
    const [newUser, setNewUser] = useState(emptyForm);
    const [createdUser, setCreatedUser] = useState(null);
    const [verificationCode, setVerificationCode] = useState("");
    const [creating, setCreating] = useState(false);
    const [verifying, setVerifying] = useState(false);

    const loadUsers = useCallback(async (signal) => {
        try {
            const response = await api.get("/admin/users", {
                params: { page, ...(appliedSearch ? { search: appliedSearch } : {}) },
                signal,
            });
            setUsers(response.data.data ?? []);
            setMeta(response.data.meta ?? null);
            setError("");
        } catch (requestError) {
            if (!signal?.aborted) {
                setError(
                    requestError.response?.data?.message ||
                        "Users could not be loaded.",
                );
            }
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, [page, appliedSearch]);

    useEffect(() => {
        const controller = new AbortController();
        void Promise.resolve().then(() => {
            if (!controller.signal.aborted) loadUsers(controller.signal);
        });
        return () => controller.abort();
    }, [loadUsers]);

    const applySearch = (event) => {
        event.preventDefault();
        setLoading(true);
        setPage(1);
        setAppliedSearch(search.trim());
    };

    const createUser = async (event) => {
        event.preventDefault();
        setCreating(true);
        setError("");
        setNotice("");

        try {
            const response = await api.post("/admin/users", newUser);
            setCreatedUser(response.data.user);
            setVerificationCode("");
            setNotice(`A verification code was sent to ${response.data.user.email}. Ask them for the code to verify this email.`);
            setNewUser(emptyForm);
            setPage(1);
            setSearch("");
            setAppliedSearch("");
            setLoading(true);
        } catch (requestError) {
            const validationError = Object.values(
                requestError.response?.data?.errors ?? {},
            )
                .flat()
                .at(0);
            setError(
                validationError ||
                    requestError.response?.data?.message ||
                    "The user account could not be created.",
            );
        } finally {
            setCreating(false);
        }
    };

    const verifyUserEmail = async (event) => {
        event.preventDefault();
        if (!createdUser) return;

        setVerifying(true);
        setError("");
        setNotice("");
        try {
            const response = await api.post(
                `/admin/users/${createdUser.id}/verify-email`,
                { code: verificationCode.trim().toUpperCase() },
            );
            const verifiedUser = response.data.user;
            setUsers((current) =>
                current.map((user) =>
                    user.id === verifiedUser.id ? verifiedUser : user,
                ),
            );
            setCreatedUser(null);
            setVerificationCode("");
            setCreateFormOpen(false);
            setNotice(`${verifiedUser.email} has been verified. They can now change their password using Forgot password.`);
        } catch (requestError) {
            const validationError = Object.values(
                requestError.response?.data?.errors ?? {},
            )
                .flat()
                .at(0);
            setError(
                validationError ||
                    requestError.response?.data?.message ||
                    "The email verification code could not be accepted.",
            );
        } finally {
            setVerifying(false);
        }
    };

    const openCreateForm = () => {
        setError("");
        setNotice("");
        setCreatedUser(null);
        setVerificationCode("");
        setNewUser(emptyForm);
        setCreateFormOpen(true);
    };

    return (
        <div className="space-y-6">
            <PageHeading
                title="Customers and users"
                description="View registered accounts and their access roles."
                action={
                    <Button
                        type="button"
                        onClick={() => {
                            setError("");
                            setNotice("");
                            if (createFormOpen) {
                                setCreateFormOpen(false);
                            } else {
                                openCreateForm();
                            }
                        }}
                    >
                        {createFormOpen ? <X /> : <Plus />}
                        {createFormOpen ? "Close form" : "Add user"}
                    </Button>
                }
            />
            <Notice>{error}</Notice>
            <Notice variant="success">{notice}</Notice>
            {createFormOpen && (
                createdUser ? (
                    <form
                        onSubmit={verifyUserEmail}
                        className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6"
                    >
                        <div>
                            <h3 className="font-semibold">Verify the new user’s email</h3>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                A six-character code was sent to <strong className="font-medium text-foreground">{createdUser.email}</strong>. Ask the account owner for their code and enter it here. The code expires in 10 minutes.
                            </p>
                        </div>
                        <label className="flex max-w-sm flex-col gap-2 text-sm font-medium">
                            Email verification code
                            <Input
                                required
                                autoComplete="one-time-code"
                                inputMode="text"
                                maxLength={6}
                                minLength={6}
                                pattern="(?=.*[A-Z])(?=.*[0-9])[A-Z0-9]{6}"
                                value={verificationCode}
                                onChange={(event) =>
                                    setVerificationCode(event.target.value.toUpperCase())
                                }
                                placeholder="A1B2C3"
                                className="h-11 px-3 text-center font-mono text-lg tracking-[0.3em]"
                            />
                        </label>
                        <div className="flex flex-wrap gap-2 pt-1">
                            <Button type="submit" disabled={verifying}>
                                {verifying ? "Verifying..." : "Verify email"}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setCreatedUser(null);
                                    setVerificationCode("");
                                    setNotice("");
                                }}
                            >
                                Add another user
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setCreateFormOpen(false)}
                            >
                                Verify later
                            </Button>
                        </div>
                    </form>
                ) : (
                    <form
                        onSubmit={createUser}
                        className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6"
                    >
                        <div>
                            <h3 className="font-semibold">Create a user account</h3>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                The user will receive an email verification code. After verifying it, they can use Forgot password to set their own password.
                            </p>
                        </div>
                        <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
                            <label className="flex flex-col gap-2 text-sm font-medium">
                                Full name
                                <Input
                                    required
                                    maxLength={255}
                                    autoComplete="name"
                                    value={newUser.name}
                                    onChange={(event) =>
                                        setNewUser({ ...newUser, name: event.target.value })
                                    }
                                    className="h-10 px-3"
                                />
                            </label>
                            <label className="flex flex-col gap-2 text-sm font-medium">
                                Email address
                                <Input
                                    required
                                    type="email"
                                    maxLength={255}
                                    autoComplete="email"
                                    value={newUser.email}
                                    onChange={(event) =>
                                        setNewUser({ ...newUser, email: event.target.value })
                                    }
                                    className="h-10 px-3"
                                />
                            </label>
                            <label className="flex flex-col gap-2 text-sm font-medium">
                                Role
                                <select
                                    required
                                    value={newUser.role}
                                    onChange={(event) =>
                                        setNewUser({ ...newUser, role: event.target.value })
                                    }
                                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                                >
                                    <option value="customer">Customer</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </label>
                            <div className="hidden sm:block" />
                            <label className="flex flex-col gap-2 text-sm font-medium">
                                Initial password
                                <Input
                                    required
                                    type="password"
                                    minLength={8}
                                    autoComplete="new-password"
                                    value={newUser.password}
                                    onChange={(event) =>
                                        setNewUser({ ...newUser, password: event.target.value })
                                    }
                                    className="h-10 px-3"
                                />
                            </label>
                            <label className="flex flex-col gap-2 text-sm font-medium">
                                Confirm initial password
                                <Input
                                    required
                                    type="password"
                                    minLength={8}
                                    autoComplete="new-password"
                                    value={newUser.password_confirmation}
                                    onChange={(event) =>
                                        setNewUser({
                                            ...newUser,
                                            password_confirmation: event.target.value,
                                        })
                                    }
                                    className="h-10 px-3"
                                />
                            </label>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                            <Button type="submit" disabled={creating}>
                                {creating ? "Creating account..." : "Create account"}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setCreateFormOpen(false);
                                    setNewUser(emptyForm);
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                )
            )}
            <form onSubmit={applySearch} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:max-w-xl sm:flex-row sm:items-center">
                <label className="relative block flex-1">
                    <span className="sr-only">Search users</span>
                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search name or email"
                        className="h-10 pl-9"
                    />
                </label>
                <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80">
                    Search
                </button>
            </form>

            {loading ? (
                <Loading label="Loading users..." />
            ) : users.length ? (
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[680px] text-left text-sm">
                            <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">User</th>
                                    <th className="px-4 py-3 font-semibold">Role</th>
                                    <th className="px-4 py-3 font-semibold">Email status</th>
                                    <th className="px-4 py-3 font-semibold">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {users.map((user) => {
                                    const isAdmin = user.roles?.includes("admin");
                                    return (
                                        <tr key={user.id}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="grid size-9 place-items-center rounded-full bg-muted">
                                                        <UserRound className="size-4 text-muted-foreground" />
                                                    </span>
                                                    <span>
                                                        <span className="block font-medium">{user.name}</span>
                                                        <span className="block text-xs text-muted-foreground">{user.email}</span>
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
                                                    {isAdmin && <ShieldCheck className="size-3.5" />}
                                                    {user.roles?.length ? user.roles.join(", ") : "No role"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {user.email_verified_at ? (
                                                    <span className="text-green-700 dark:text-green-400">Verified</span>
                                                ) : (
                                                    <span className="text-amber-700 dark:text-amber-400">Unverified</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">{formatDate(user.created_at)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <EmptyState>No users match that search.</EmptyState>
            )}
            <Pagination
                meta={meta}
                page={page}
                setPage={(nextPage) => {
                    setLoading(true);
                    setPage(nextPage);
                }}
            />
        </div>
    );
}
