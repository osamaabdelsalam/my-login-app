"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/utils/auditLogger";
import { User, Shield, Check, Save } from "lucide-react";

export default function ProfilePage() {
    return (
        <ProtectedRoute>
            <div className="flex min-h-screen bg-zinc-950 text-white">
                <Sidebar />
                <div className="flex-1 md:ml-64 p-6 sm:p-10">
                    <ProfileContent />
                </div>
            </div>
        </ProtectedRoute>
    );
}

function ProfileContent() {
    const { user, profile, refreshProfile } = useAuth();
    const [fullName, setFullName] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (profile?.full_name) {
            setFullName(profile.full_name);
        }
    }, [profile]);

    async function handleUpdateProfile(e: React.FormEvent) {
        e.preventDefault();
        if (!user) return;

        setSaving(true);
        setMessage("");

        const supabase = createClient();

        try {
            const oldName = profile?.full_name || "";
            const { error } = await supabase
                .from("users")
                .update({ full_name: fullName, updated_at: new Date().toISOString() })
                .eq("id", user.id);

            if (error) throw error;

            await logAudit(
                "UPDATE_PROFILE",
                "users",
                user.id,
                { full_name: oldName },
                { full_name: fullName }
            );

            await refreshProfile();
            setMessage("Profile updated successfully!");
        } catch (err) {
            console.error("Profile update failed:", err);
            setMessage("Failed to update profile.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">User Profile</h1>
            <p className="text-zinc-400 text-sm mb-8">Manage your personal details and account role</p>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl space-y-6">
                <div className="flex items-center gap-4 border-b border-white/10 pb-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white text-2xl font-bold">
                        <User size={32} />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-white">
                            {profile?.full_name || user?.email?.split("@")[0]}
                        </h2>
                        <span className="inline-flex items-center gap-1 mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 capitalize">
                            <Shield size={12} /> {profile?.role || "user"}
                        </span>
                    </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                            Email Address (Read-only)
                        </label>
                        <input
                            type="email"
                            disabled
                            value={user?.email || ""}
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-zinc-400 cursor-not-allowed"
                        />
                    </div>

                    <div>
                        <label htmlFor="fullName" className="block text-sm font-medium text-zinc-300 mb-2">
                            Full Name
                        </label>
                        <input
                            id="fullName"
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Enter your full name"
                            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-white/30"
                        />
                    </div>

                    {message && (
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400 flex items-center gap-2">
                            <Check size={16} /> {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-medium text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-50"
                    >
                        <Save size={18} />
                        {saving ? "Saving Changes..." : "Save Profile"}
                    </button>
                </form>
            </div>
        </div>
    );
}
