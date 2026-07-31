"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
    const [mode, setMode] = useState<"signin" | "signup">("signin");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setError("");
        setSuccessMessage("");
        setLoading(true);

        const supabase = createClient();

        if (mode === "signin") {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                const msg = error.message.toLowerCase();
                if (
                    msg.includes("user not found") ||
                    msg.includes("not found")
                ) {
                    setError("User not found. Please check your email or sign up below.");
                } else if (
                    msg.includes("invalid login credentials") ||
                    msg.includes("invalid_credentials")
                ) {
                    setError("User not found or incorrect password.");
                } else {
                    setError(error.message);
                }
                setLoading(false);
                return;
            }

            window.location.href = "/dashboard";
        } else {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
            });

            if (error) {
                setError(error.message);
                setLoading(false);
                return;
            }

            if (data?.user && !data?.session) {
                setSuccessMessage(
                    "Account created! Please check your email for confirmation, or try signing in."
                );
                setLoading(false);
            } else {
                window.location.href = "/dashboard";
            }
        }
    }

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
            <div className="mb-8 text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-xl font-bold text-zinc-950 shadow-md">
                    L
                </div>

                <h1 className="text-2xl font-semibold tracking-tight text-white">
                    {mode === "signin" ? "Welcome back" : "Create an account"}
                </h1>

                <p className="mt-2 text-sm text-zinc-400">
                    {mode === "signin"
                        ? "Sign in to access your dashboard"
                        : "Enter your details to register"}
                </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="mb-6 flex rounded-xl bg-black/40 p-1 border border-white/5">
                <button
                    type="button"
                    onClick={() => {
                        setMode("signin");
                        setError("");
                        setSuccessMessage("");
                    }}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                        mode === "signin"
                            ? "bg-white/15 text-white shadow-sm"
                            : "text-zinc-400 hover:text-white"
                    }`}
                >
                    Sign In
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setMode("signup");
                        setError("");
                        setSuccessMessage("");
                    }}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                        mode === "signup"
                            ? "bg-white/15 text-white shadow-sm"
                            : "text-zinc-400 hover:text-white"
                    }`}
                >
                    Sign Up
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label
                        htmlFor="email"
                        className="mb-2 block text-sm font-medium text-zinc-300"
                    >
                        Email
                    </label>

                    <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-white/30 focus:ring-2 focus:ring-white/10"
                    />
                </div>

                <div>
                    <label
                        htmlFor="password"
                        className="mb-2 block text-sm font-medium text-zinc-300"
                    >
                        Password
                    </label>

                    <input
                        id="password"
                        type="password"
                        autoComplete={
                            mode === "signin" ? "current-password" : "new-password"
                        }
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-white/30 focus:ring-2 focus:ring-white/10"
                    />
                </div>

                {error && (
                    <div
                        role="alert"
                        className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex flex-col gap-1"
                    >
                        <div className="font-medium flex items-center gap-2">
                            <span>⚠️</span> {error}
                        </div>
                        {mode === "signin" && (
                            <button
                                type="button"
                                onClick={() => {
                                    setMode("signup");
                                    setError("");
                                }}
                                className="mt-1 text-xs text-red-300 underline text-left hover:text-white"
                            >
                                Don't have an account? Click here to Sign Up
                            </button>
                        )}
                    </div>
                )}

                {successMessage && (
                    <div
                        role="status"
                        className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400"
                    >
                        ✓ {successMessage}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-white px-4 py-3 font-medium text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {loading
                        ? mode === "signin"
                            ? "Signing in..."
                            : "Creating account..."
                        : mode === "signin"
                        ? "Sign in"
                        : "Create Account"}
                </button>
            </form>
        </div>
    );
}