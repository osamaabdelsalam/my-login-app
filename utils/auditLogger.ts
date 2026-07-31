import { createClient } from "@/lib/supabase/client";

export async function logAudit(
    actionType: string,
    tableName: string,
    recordId?: string | null,
    oldValues?: unknown,
    newValues?: unknown
) {
    try {
        const supabase = createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        const userAgent = typeof window !== "undefined" ? window.navigator.userAgent : "Server";
        const browserInfo = typeof window !== "undefined" ? window.navigator.appName : "Unknown";

        await supabase.from("audit_logs").insert([
            {
                user_id: user?.id || null,
                action_type: actionType,
                table_name: tableName,
                record_id: recordId || null,
                old_values: oldValues || null,
                new_values: newValues || null,
                user_agent: userAgent,
                browser_info: browserInfo,
            },
        ]);
    } catch (err) {
        console.error("Failed to insert audit log:", err);
    }
}
