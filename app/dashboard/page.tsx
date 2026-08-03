"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/utils/helpers";
import {
    ShoppingBag,
    Layers,
    DollarSign,
    Clock,
    PlusCircle,
    ArrowRight,
    Activity,
} from "lucide-react";

export default function DashboardPage() {
    return (
        <ProtectedRoute>
            <div className="flex min-h-screen bg-zinc-950 text-white">
                <Sidebar />
                <div className="flex-1 md:ml-64 p-6 sm:p-10">
                    <DashboardContent />
                </div>
            </div>
        </ProtectedRoute>
    );
}

function DashboardContent() {
    const { user, profile } = useAuth();
    const [stats, setStats] = useState({
        totalInHouse: 0,
        totalFartaya: 0,
        totalRevenue: 0,
        pendingUnpaid: 0,
    });
    const [recentActivity, setRecentActivity] = useState<Array<{ id: string; action_type: string; table_name: string; created_at: string }>>([]);
    const [loading, setLoading] = useState(true);

    const supabase = createClient();

    useEffect(() => {
        async function fetchDashboardStats() {
            try {
                const [inHouseRes, fartayaRes, auditRes] = await Promise.all([
                    supabase.from("in_house_orders").select("order_quantity, price, bounce_units").eq("is_deleted", false),
                    supabase.from("fartaya_drs").select("order_amount, payment_status").eq("is_deleted", false),
                    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(5),
                ]);

                const inHouseData = inHouseRes.data || [];
                const fartayaData = fartayaRes.data || [];

                let revenue = 0;
                inHouseData.forEach((item) => {
                    const qty = Number(item.order_quantity || 0);
                    const price = Number(item.price || 0);
                    const bounce = Number(item.bounce_units || 0);
                    const net = Math.max(0, (qty - bounce) * price);
                    revenue += net;
                });

                let unpaidSum = 0;
                fartayaData.forEach((item) => {
                    if (item.payment_status === "unpaid") {
                        unpaidSum += Number(item.order_amount || 0);
                    }
                });

                setStats({
                    totalInHouse: inHouseData.length,
                    totalFartaya: fartayaData.length,
                    totalRevenue: Math.max(0, revenue),
                    pendingUnpaid: unpaidSum,
                });

                setRecentActivity((auditRes.data || []) as Array<{ id: string; action_type: string; table_name: string; created_at: string }>);
            } catch (err) {
                console.error("Failed to load dashboard stats:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchDashboardStats();
    }, []);

    return (
        <div className="space-y-8 max-w-7xl">
            {/* Header & Welcome */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-purple-900/30 via-zinc-900 to-indigo-900/30 p-8 shadow-2xl backdrop-blur-xl">
                <div className="relative z-10">
                    <span className="mb-3 inline-block rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                        ✓ Medical Order Management System
                    </span>
                    <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                        Welcome back, {profile?.full_name || user?.email?.split("@")[0]}!
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                        Here is the live summary of your medical orders, allocations, payments, and system activity.
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                    <div className="flex items-center justify-between text-zinc-400 mb-2">
                        <span className="text-xs font-medium uppercase tracking-wider">In-House Orders</span>
                        <ShoppingBag size={20} className="text-purple-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">
                        {loading ? "..." : stats.totalInHouse}
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">Main Doctor Orders</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                    <div className="flex items-center justify-between text-zinc-400 mb-2">
                        <span className="text-xs font-medium uppercase tracking-wider">Fartaya Allocations</span>
                        <Layers size={20} className="text-indigo-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">
                        {loading ? "..." : stats.totalFartaya}
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">Sub-Doctor Allocations</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                    <div className="flex items-center justify-between text-zinc-400 mb-2">
                        <span className="text-xs font-medium uppercase tracking-wider">Total Net Revenue</span>
                        <DollarSign size={20} className="text-emerald-400" />
                    </div>
                    <div className="text-3xl font-bold text-emerald-400">
                        {loading ? "..." : formatCurrency(stats.totalRevenue)}
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">Calculated after bounce</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                    <div className="flex items-center justify-between text-zinc-400 mb-2">
                        <span className="text-xs font-medium uppercase tracking-wider">Pending Payments</span>
                        <Clock size={20} className="text-amber-400" />
                    </div>
                    <div className="text-3xl font-bold text-amber-400">
                        {loading ? "..." : formatCurrency(stats.pendingUnpaid)}
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">Unpaid Fartaya Orders</p>
                </div>
            </div>

            {/* Quick Actions Grid */}
            <div>
                <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Link
                        href="/orders/in-house/add"
                        className="group flex items-center justify-between p-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition backdrop-blur-xl"
                    >
                        <div className="flex items-center gap-3">
                            <PlusCircle className="text-purple-400" size={22} />
                            <span className="font-semibold text-white text-sm">Add Order</span>
                        </div>
                        <ArrowRight size={18} className="text-zinc-500 group-hover:text-white transition" />
                    </Link>

                    <Link
                        href="/orders/fartaya/add"
                        className="group flex items-center justify-between p-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition backdrop-blur-xl"
                    >
                        <div className="flex items-center gap-3">
                            <PlusCircle className="text-indigo-400" size={22} />
                            <span className="font-semibold text-white text-sm">Add Fartaya</span>
                        </div>
                        <ArrowRight size={18} className="text-zinc-500 group-hover:text-white transition" />
                    </Link>

                    <Link
                        href="/orders/in-house"
                        className="group flex items-center justify-between p-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition backdrop-blur-xl"
                    >
                        <div className="flex items-center gap-3">
                            <ShoppingBag className="text-emerald-400" size={22} />
                            <span className="font-semibold text-white text-sm">View In-House</span>
                        </div>
                        <ArrowRight size={18} className="text-zinc-500 group-hover:text-white transition" />
                    </Link>

                    <Link
                        href="/orders/fartaya"
                        className="group flex items-center justify-between p-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition backdrop-blur-xl"
                    >
                        <div className="flex items-center gap-3">
                            <Layers className="text-amber-400" size={22} />
                            <span className="font-semibold text-white text-sm">View Fartaya</span>
                        </div>
                        <ArrowRight size={18} className="text-zinc-500 group-hover:text-white transition" />
                    </Link>
                </div>
            </div>

            {/* Recent Audit Activity */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Activity size={20} className="text-indigo-400" /> Recent System Activity
                    </h2>
                </div>

                <div className="divide-y divide-white/5">
                    {recentActivity.length === 0 ? (
                        <div className="py-6 text-center text-sm text-zinc-500">
                            No recent system actions logged yet.
                        </div>
                    ) : (
                        recentActivity.map((act) => (
                            <div key={act.id} className="py-3.5 flex items-center justify-between text-sm">
                                <div>
                                    <span className="font-semibold text-white">{act.action_type}</span>
                                    <span className="text-xs text-zinc-400 ml-2">on table <code className="text-zinc-300 font-mono">{act.table_name}</code></span>
                                </div>
                                <span className="text-xs text-zinc-500 font-mono">
                                    {formatDate(act.created_at)}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

