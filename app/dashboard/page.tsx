import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-white">
            <div className="text-center">
                <h1 className="text-3xl font-semibold">
                    Welcome
                </h1>

                <p className="mt-2 text-zinc-400">
                    You are signed in as {user.email}
                </p>
            </div>
        </main>
    );
}