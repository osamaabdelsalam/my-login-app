import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    console.log("SUPABASE URL:", supabaseUrl);
    console.log("SUPABASE KEY EXISTS:", Boolean(supabaseKey));

    if (!supabaseUrl || !supabaseKey) {
        throw new Error(
            "Supabase environment variables are missing. Check .env.local"
        );
    }

    return createBrowserClient(supabaseUrl, supabaseKey);
}