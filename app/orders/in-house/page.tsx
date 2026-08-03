"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { InHouseOrder, OrderStatus } from "@/types/orders";
import { formatCurrency, formatDate, exportToCSV } from "@/utils/helpers";
import { logAudit } from "@/utils/auditLogger";
import FilterPanel, { FilterState } from "@/components/FilterPanel";
import OrderTimeline from "@/components/OrderTimeline";
import {
    PlusCircle,
    Download,
    Edit3,
    Trash2,
    Layers,
    Activity,
    CheckCircle,
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

const initialFilters: FilterState = {
    drName: "",
    orderNumber: "",
    productName: "",
    status: "",
    startDate: "",
    endDate: "",
    minAmount: "",
    maxAmount: "",
};

function InHouseOrdersContent() {
    const { isSuperAdmin } = useAuth();
    const [orders, setOrders] = useState<InHouseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [filters, setFilters] = useState<FilterState>(initialFilters);

    // Timeline modal state
    const [timelineOrderId, setTimelineOrderId] = useState<string>("");
    const [timelineTitle, setTimelineTitle] = useState<string>("");
    const [isTimelineOpen, setIsTimelineOpen] = useState(false);

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
        const net = Math.max(0, (order.order_quantity - (order.bounce_units || 0)) * order.price);

        if (filters.drName && !order.dr_name.toLowerCase().includes(filters.drName.toLowerCase())) return false;
        if (filters.orderNumber && !order.order_number.toString().includes(filters.orderNumber)) return false;
        if (filters.productName && order.product_name !== filters.productName) return false;
        if (filters.status && (order.status || "draft") !== filters.status) return false;

        if (filters.startDate && new Date(order.created_at) < new Date(filters.startDate)) return false;
        if (filters.endDate && new Date(order.created_at) > new Date(`${filters.endDate}T23:59:59`)) return false;

        if (filters.minAmount && net < Number(filters.minAmount)) return false;
        if (filters.maxAmount && net > Number(filters.maxAmount)) return false;

        return true;
    });

    const isAllSelected = filteredOrders.length > 0 && selectedIds.length === filteredOrders.length;

    function toggleSelectAll() {
        if (isAllSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredOrders.map((o) => o.id));
        }
    }

    function toggleSelectOne(id: string) {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    }

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

    async function handleBulkDelete() {
        if (!selectedIds.length || !isSuperAdmin()) return;
        if (!confirm(`Are you sure you want to soft delete ${selectedIds.length} selected in-house orders?`)) return;

        try {
            await supabase
                .from("in_house_orders")
                .update({ is_deleted: true, updated_at: new Date().toISOString() })
                .in("id", selectedIds);

            for (const id of selectedIds) {
                await logAudit("DELETE_IN_HOUSE_ORDER", "in_house_orders", id, null, { is_deleted: true, bulk: true });
            }

            setSelectedIds([]);
            fetchOrders();
        } catch (err) {
            console.error("Bulk delete failed:", err);
        }
    }

    async function handleBulkStatusChange(targetStatus: OrderStatus) {
        if (!selectedIds.length) return;
        try {
            await supabase
                .from("in_house_orders")
                .update({ status: targetStatus, updated_at: new Date().toISOString() })
                .in("id", selectedIds);

            for (const id of selectedIds) {
                await logAudit("UPDATE_ORDER_STATUS", "in_house_orders", id, null, { status: targetStatus, bulk: true });
            }

            setSelectedIds([]);
            fetchOrders();
        } catch (err) {
            console.error("Bulk status update failed:", err);
        }
    }

    function handleExportCSV() {
        const targetList = selectedIds.length > 0
            ? filteredOrders.filter((o) => selectedIds.includes(o.id))
            : filteredOrders;

        const exportData = targetList.map((o) => {
            const net = Math.max(0, (o.order_quantity - (o.bounce_units || 0)) * o.price);
            return {
                "Order Number": o.order_number,
                Doctor: o.dr_name,
                Product: o.product_name,
                Quantity: o.order_quantity,
                Price: o.price,
                "Order Amount": o.order_amount,
                "Bounce Units": o.bounce_units || 0,
                "Net Amount": net,
                "Remaining Balance": o.remaining_amount,
                Status: o.status || "draft",
                Date: formatDate(o.created_at),
            };
        });
        exportToCSV("in_house_orders", exportData);
    }

    function openTimeline(order: InHouseOrder) {
        setTimelineOrderId(order.id);
        setTimelineTitle(`Main Doctor Order #${order.order_number} (Dr. ${order.dr_name})`);
        setIsTimelineOpen(true);
    }

    function getStatusBadge(status?: OrderStatus) {
        switch (status) {
            case "approved":
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Approved</span>;
            case "completed":
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Completed</span>;
            case "pending":
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">Pending</span>;
            case "cancelled":
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30">Cancelled</span>;
            default:
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-500/20 text-zinc-300 border border-zinc-500/30">Draft</span>;
        }
    }

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">In-House Orders</h1>
                    <p className="text-zinc-400 text-sm mt-1">Manage, filter, and track main doctor orders and workflow statuses</p>
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

            {/* Advanced Search & Filter Panel */}
            <FilterPanel
                filters={filters}
                onChange={setFilters}
                onReset={() => setFilters(initialFilters)}
                showStatusFilter={true}
            />

            {/* Bulk Operations Toolbar */}
            {selectedIds.length > 0 && (
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-5 py-3 text-sm text-indigo-200">
                    <div className="font-semibold">
                        {selectedIds.length} in-house order(s) selected
                    </div>
                    <div className="flex items-center gap-2">
                        {isSuperAdmin() ? (
                            <>
                                <button
                                    onClick={() => handleBulkStatusChange("approved")}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 hover:bg-emerald-500/30 transition"
                                >
                                    <CheckCircle size={14} /> Bulk Approve
                                </button>
                                <button
                                    onClick={handleBulkDelete}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500/20 text-red-300 text-xs font-semibold border border-red-500/30 hover:bg-red-500/30 transition"
                                >
                                    <Trash2 size={14} /> Bulk Delete
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => handleBulkStatusChange("pending")}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30 hover:bg-amber-500/30 transition"
                            >
                                Submit Selected to Pending
                            </button>
                        )}
                        <button
                            onClick={handleExportCSV}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/10 bg-white/10 text-xs font-semibold text-white hover:bg-white/20 transition"
                        >
                            <Download size={14} /> Export Selected
                        </button>
                    </div>
                </div>
            )}

            {/* Orders Table */}
            <div className="overflow-x-auto rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
                <table className="w-full text-left text-sm text-zinc-300">
                    <thead className="border-b border-white/10 bg-black/40 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        <tr>
                            <th className="px-4 py-4 w-10">
                                <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    onChange={toggleSelectAll}
                                    className="rounded border-white/20 bg-black/40 text-indigo-500 focus:ring-0"
                                />
                            </th>
                            <th className="px-6 py-4">Order #</th>
                            <th className="px-6 py-4">Doctor Name</th>
                            <th className="px-6 py-4">Product</th>
                            <th className="px-6 py-4">Qty x Price</th>
                            <th className="px-6 py-4">Bounce Units</th>
                            <th className="px-6 py-4">Net Amount</th>
                            <th className="px-6 py-4">Remaining Balance</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr>
                                <td colSpan={11} className="px-6 py-12 text-center text-zinc-400">
                                    Loading in-house orders...
                                </td>
                            </tr>
                        ) : filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan={11} className="px-6 py-12 text-center text-zinc-500">
                                    No in-house orders matching filters found.
                                </td>
                            </tr>
                        ) : (
                            filteredOrders.map((order) => {
                                const net = Math.max(0, (order.order_quantity - (order.bounce_units || 0)) * order.price);
                                const isSelected = selectedIds.includes(order.id);
                                return (
                                    <tr key={order.id} className={`hover:bg-white/5 transition ${isSelected ? "bg-indigo-500/10" : ""}`}>
                                        <td className="px-4 py-4">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelectOne(order.id)}
                                                className="rounded border-white/20 bg-black/40 text-indigo-500 focus:ring-0"
                                            />
                                        </td>
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
                                        <td className="px-6 py-4 text-amber-400 font-medium">
                                            {order.bounce_units || 0} units
                                        </td>
                                        <td className="px-6 py-4 font-medium text-white">
                                            {formatCurrency(net)}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-emerald-400">
                                            {formatCurrency(order.remaining_amount)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(order.status)}
                                        </td>
                                        <td className="px-6 py-4 text-zinc-400 text-xs">
                                            {formatDate(order.created_at)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openTimeline(order)}
                                                    title="View Activity Timeline"
                                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
                                                >
                                                    <Activity size={16} />
                                                </button>
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
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Timeline Modal */}
            <OrderTimeline
                orderId={timelineOrderId}
                title={timelineTitle}
                isOpen={isTimelineOpen}
                onClose={() => setIsTimelineOpen(false)}
            />
        </div>
    );
}
