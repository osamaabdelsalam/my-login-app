"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { createClient } from "@/lib/supabase/client";
import { UserProfile } from "@/types/orders";
import { logAudit } from "@/utils/auditLogger";
import { Shield, Users, ShoppingBag, Layers, CheckCircle } from "lucide-react";

export default function AdminDashboardPage() {
    return (
        <ProtectedRoute requireSuperAdmin>
            <div className="flex min-h-screen bg-zinc-950 text-white">
                <Sidebar />
                <div className="flex-1 md:ml-64 p-6 sm:p-10">
                    <AdminDashboardContent />
                </div>
            </div>
        </ProtectedRoute>
    );
}

function AdminDashboardContent() {
    const [usersList, setUsersList] = useState<UserProfile[]>([]);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalInHouse: 0,
        totalFartaya: 0,
    });
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const supabase = createClient();

    async function loadAdminData() {
        setLoading(true);
        try {
            const [usersRes, inHouseCount, fartayaCount] = await Promise.all([
                supabase.from("users").select("*").order("created_at", { ascending: false }),
                supabase.from("in_house_orders").select("*", { count: "exact", head: true }).eq("is_deleted", false),
                supabase.from("fartaya_drs").select("*", { count: "exact", head: true }).eq("is_deleted", false),
            ]);

            const users = (usersRes.data || []) as UserProfile[];
            setUsersList(users);
            setStats({
                totalUsers: users.length,
                totalInHouse: inHouseCount.count || 0,
                totalFartaya: fartayaCount.count || 0,
            });
        } catch (err) {
            console.error("Failed to load admin dashboard data:", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadAdminData();
    }, []);

    async function toggleRole(userItem: UserProfile) {
        setUpdatingId(userItem.id);
        const newRole = userItem.role === "super_admin" ? "user" : "super_admin";

        try {
            await supabase
                .from("users")
                .update({ role: newRole, updated_at: new Date().toISOString() })
                .eq("id", userItem.id);

            await logAudit("UPDATE_USER_ROLE", "users", userItem.id, { role: userItem.role }, { role: newRole });

            loadAdminData();
        } catch (err) {
            console.error("Failed to update user role:", err);
        } finally {
            setUpdatingId(null);
        }
    }

    return (
        <div>
            <div className="mb-8">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold mb-2">
                    <Shield size={14} /> Super Admin Portal
                </span>
                <h1 className="text-3xl font-bold tracking-tight text-white">Super Admin Dashboard</h1>
                <p className="text-zinc-400 text-sm mt-1">Manage system user roles, access rights, and global metrics</p>
            </div>

            {/* System Overview Stats */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-8">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                    <div className="flex items-center justify-between text-zinc-400 mb-2">
                        <span className="text-xs font-medium uppercase tracking-wider">Total Users</span>
                        <Users size={20} className="text-indigo-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{stats.totalUsers}</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                    <div className="flex items-center justify-between text-zinc-400 mb-2">
                        <span className="text-xs font-medium uppercase tracking-wider">Active In-House Orders</span>
                        <ShoppingBag size={20} className="text-purple-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{stats.totalInHouse}</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                    <div className="flex items-center justify-between text-zinc-400 mb-2">
                        <span className="text-xs font-medium uppercase tracking-wider">Active Fartaya Allocations</span>
                        <Layers size={20} className="text-emerald-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{stats.totalFartaya}</div>
                </div>
            </div>

            {/* User Management Section */}
            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-4">User Management & Permissions</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-zinc-300">
                        <thead className="border-b border-white/10 bg-black/40 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                            <tr>
                                <th className="px-4 py-3">Email</th>
                                <th className="px-4 py-3">Full Name</th>
                                <th className="px-4 py-3">Role</th>
                                <th className="px-4 py-3 text-right">Role Management</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-400">
                                        Loading users list...
                                    </td>
                                </tr>
                            ) : (
                                usersList.map((u) => (
                                    <tr key={u.id} className="hover:bg-white/5 transition">
                                        <td className="px-4 py-3 font-medium text-white">{u.email}</td>
                                        <td className="px-4 py-3">{u.full_name || "N/A"}</td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                                                    u.role === "super_admin"
                                                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                                        : "bg-white/10 text-zinc-300 border border-white/10"
                                                }`}
                                            >
                                                {u.role === "super_admin" && <Shield size={12} />}
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => toggleRole(u)}
                                                disabled={updatingId === u.id}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
                                            >
                                                <CheckCircle size={14} />
                                                Switch to {u.role === "super_admin" ? "User" : "Super Admin"}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
