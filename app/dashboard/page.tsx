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

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-white">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur-xl">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 text-xl font-bold">
                    ✓
                </div>
                <h1 className="text-3xl font-semibold">Welcome</h1>
                <p className="mt-2 text-zinc-400">
                    Signed in as <span className="font-medium text-white">{user.email}</span>
                </p>
                <form action={signOut} className="mt-8">
                    <button
                        type="submit"
                        className="w-full rounded-xl bg-white/10 px-4 py-3 font-medium text-white transition hover:bg-white/20"
                    >
                        Sign Out
                    </button>
                </form>
            </div>
        </main>
    );
}