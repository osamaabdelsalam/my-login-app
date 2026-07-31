import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/");
    }

    async function signOut() {
        "use server";
        const supabase = await createClient();
        await supabase.auth.signOut();
        redirect("/");
    }

    const createdDate = user.created_at
        ? new Date(user.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
          })
        : "N/A";

    const lastSignIn = user.last_sign_in_at
        ? new Date(user.last_sign_in_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
          })
        : "Just now";

    return (
        <div className="min-h-screen bg-zinc-950 text-white selection:bg-white selection:text-zinc-900">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-md">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg font-bold text-zinc-950 shadow-lg">
                            D
                        </div>
                        <span className="text-lg font-semibold tracking-tight">App Dashboard</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>Connected to Supabase</span>
                        </div>
                        <form action={signOut}>
                            <button
                                type="submit"
                                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10 hover:text-white"
                            >
                                Sign Out
                            </button>
                        </form>
                    </div>
                </div>
            </header>

            {/* Dashboard Body */}
            <main className="mx-auto max-w-7xl px-6 py-10">
                {/* Hero / Welcome Banner */}
                <div className="relative mb-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-purple-900/30 via-zinc-900 to-indigo-900/30 p-8 shadow-2xl backdrop-blur-xl">
                    <div className="relative z-10">
                        <span className="mb-3 inline-block rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                            ✓ Authenticated Session
                        </span>
                        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                            Welcome back, {user.email?.split("@")[0]}!
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                            You are signed in to your secure account. Your session is synchronized live with your Supabase database.
                        </p>
                    </div>
                </div>

                {/* Stats Cards Grid */}
                <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                        <div className="text-xs font-medium uppercase tracking-wider text-zinc-400">Account Status</div>
                        <div className="mt-2 flex items-center gap-2 text-2xl font-semibold text-emerald-400">
                            <span>Active</span>
                            <span className="text-sm font-normal text-zinc-400">(Verified)</span>
                        </div>
                        <p className="mt-2 text-xs text-zinc-500">Supabase Auth Enabled</p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                        <div className="text-xs font-medium uppercase tracking-wider text-zinc-400">Email Address</div>
                        <div className="mt-2 truncate text-lg font-semibold text-white" title={user.email}>
                            {user.email}
                        </div>
                        <p className="mt-2 text-xs text-zinc-500">Primary Contact</p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                        <div className="text-xs font-medium uppercase tracking-wider text-zinc-400">Member Since</div>
                        <div className="mt-2 text-xl font-semibold text-white">
                            {createdDate}
                        </div>
                        <p className="mt-2 text-xs text-zinc-500">Account Created</p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                        <div className="text-xs font-medium uppercase tracking-wider text-zinc-400">Last Login</div>
                        <div className="mt-2 text-lg font-semibold text-white">
                            {lastSignIn}
                        </div>
                        <p className="mt-2 text-xs text-zinc-500">Current Session</p>
                    </div>
                </div>

                {/* User Details & Technical Details Card */}
                <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
                    <h2 className="mb-4 text-xl font-semibold text-white">User Account Information</h2>
                    <div className="space-y-4 text-sm">
                        <div className="flex flex-col justify-between border-b border-white/5 py-3 sm:flex-row sm:items-center">
                            <span className="text-zinc-400">User ID:</span>
                            <code className="mt-1 font-mono text-xs text-zinc-200 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 sm:mt-0">
                                {user.id}
                            </code>
                        </div>
                        <div className="flex flex-col justify-between border-b border-white/5 py-3 sm:flex-row sm:items-center">
                            <span className="text-zinc-400">Auth Provider:</span>
                            <span className="font-medium text-white">Email & Password</span>
                        </div>
                        <div className="flex flex-col justify-between py-3 sm:flex-row sm:items-center">
                            <span className="text-zinc-400">Database Connection:</span>
                            <span className="font-medium text-emerald-400">Live via @supabase/ssr</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
