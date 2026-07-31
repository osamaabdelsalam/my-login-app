"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { InHouseOrder } from "@/types/orders";
import { formatCurrency, formatDate, exportToCSV } from "@/utils/helpers";
import { logAudit } from "@/utils/auditLogger";
import {
    PlusCircle,
    Search,
    Download,
    Edit3,
    Trash2,
    Layers,
} from "lucide-react";

export default function InHouseOrdersPage() {
    return (
        <ProtectedRoute>
            <div className="flex min-h-screen bg-zinc-950 text-white">
                <Sidebar />
                <div className="flex-1 md:ml-64 p-6 sm:p-10">
                    <InHouseOrdersContent />
                </div>
            </div>
        </ProtectedRoute>
    );
}

function InHouseOrdersContent() {
    const { isSuperAdmin } = useAuth();
    const [orders, setOrders] = useState<InHouseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const supabase = createClient();

    async function fetchOrders() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("in_house_orders")
                .select("*")
                .eq("is_deleted", false)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setOrders((data || []) as InHouseOrder[]);
        } catch (err) {
            console.error("Failed to fetch in-house orders:", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchOrders();
    }, []);

    const filteredOrders = orders.filter((order) => {
        const term = searchTerm.toLowerCase();
        return (
            order.dr_name.toLowerCase().includes(term) ||
            order.order_number.toString().includes(term) ||
            order.product_name.toLowerCase().includes(term)
        );
    });

    async function handleDelete(order: InHouseOrder) {
        if (!confirm(`Are you sure you want to delete order #${order.order_number}?`)) return;

        try {
            await supabase
                .from("in_house_orders")
                .update({ is_deleted: true, updated_at: new Date().toISOString() })
                .eq("id", order.id);

            await logAudit("DELETE_IN_HOUSE_ORDER", "in_house_orders", order.id, order, { is_deleted: true });

            fetchOrders();
        } catch (err) {
            console.error("Failed to delete order:", err);
        }
    }

    function handleExportCSV() {
        const exportData = filteredOrders.map((o) => ({
            "Order Number": o.order_number,
            Doctor: o.dr_name,
            Product: o.product_name,
            Quantity: o.order_quantity,
            Price: o.price,
            "Order Amount": o.order_amount,
            Bounce: o.bounce_amount,
            "Remaining Amount": o.remaining_amount,
            Date: formatDate(o.created_at),
        }));
        exportToCSV("in_house_orders", exportData);
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">In-House Orders</h1>
                    <p className="text-zinc-400 text-sm mt-1">Manage and track all main doctor orders</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExportCSV}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
                    >
                        <Download size={16} /> Export CSV
                    </button>
                    <Link
                        href="/orders/in-house/add"
                        className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
                    >
                        <PlusCircle size={18} /> New Order
                    </Link>
                </div>
            </div>

            {/* Search Filter */}
            <div className="relative mb-6 max-w-md">
                <Search className="absolute left-3.5 top-3 text-zinc-400" size={18} />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by doctor, order #, product..."
                    className="w-full rounded-xl border border-white/10 bg-black/20 pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-white/30"
                />
            </div>

            {/* Orders Table */}
            <div className="overflow-x-auto rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
                <table className="w-full text-left text-sm text-zinc-300">
                    <thead className="border-b border-white/10 bg-black/40 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        <tr>
                            <th className="px-6 py-4">Order #</th>
                            <th className="px-6 py-4">Doctor Name</th>
                            <th className="px-6 py-4">Product</th>
                            <th className="px-6 py-4">Qty x Price</th>
                            <th className="px-6 py-4">Total Amount</th>
                            <th className="px-6 py-4">Bounce</th>
                            <th className="px-6 py-4">Remaining Balance</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr>
                                <td colSpan={9} className="px-6 py-12 text-center text-zinc-400">
                                    Loading in-house orders...
                                </td>
                            </tr>
                        ) : filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-6 py-12 text-center text-zinc-500">
                                    No in-house orders found.
                                </td>
                            </tr>
                        ) : (
                            filteredOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-white/5 transition">
                                    <td className="px-6 py-4 font-mono font-semibold text-white">
                                        #{order.order_number}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-white">
                                        Dr. {order.dr_name}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-block rounded-md bg-white/10 px-2.5 py-1 text-xs font-medium text-white">
                                            {order.product_name}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {order.order_quantity} x {formatCurrency(order.price)}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-white">
                                        {formatCurrency(order.order_amount)}
                                    </td>
                                    <td className="px-6 py-4 text-amber-400">
                                        {formatCurrency(order.bounce_amount)}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-emerald-400">
                                        {formatCurrency(order.remaining_amount)}
                                    </td>
                                    <td className="px-6 py-4 text-zinc-400 text-xs">
                                        {formatDate(order.created_at)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link
                                                href={`/orders/fartaya/add?orderId=${order.id}`}
                                                title="Allocate to Fartaya"
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-medium border border-indigo-500/30 hover:bg-indigo-500/30 transition"
                                            >
                                                <Layers size={14} /> Allocate
                                            </Link>
                                            <Link
                                                href={`/orders/in-house/edit/${order.id}`}
                                                title="Edit Order"
                                                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
                                            >
                                                <Edit3 size={16} />
                                            </Link>
                                            {isSuperAdmin() && (
                                                <button
                                                    onClick={() => handleDelete(order)}
                                                    title="Delete Order (Super Admin)"
                                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
