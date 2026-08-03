"use client";

import React, { useState } from "react";
import { FartayaOrder } from "@/types/orders";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { logAudit } from "@/utils/auditLogger";
import { formatCurrency, formatDate, exportToCSV } from "@/utils/helpers";
import InvoiceGenerator from "./InvoiceGenerator";
import OrderTimeline from "./OrderTimeline";
import { Search, CheckCircle, Clock, Trash2, ShieldCheck, ShieldAlert, Download, Layers, Activity } from "lucide-react";

interface EnhancedFartayaTableProps {
    orders: FartayaOrder[];
    onRefresh: () => void;
}

export default function EnhancedFartayaTable({ orders, onRefresh }: EnhancedFartayaTableProps) {
    const { user, isSuperAdmin } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    // Timeline modal state
    const [timelineOrderId, setTimelineOrderId] = useState<string>("");
    const [timelineTitle, setTimelineTitle] = useState<string>("");
    const [isTimelineOpen, setIsTimelineOpen] = useState(false);

    const supabase = createClient();

    const filteredOrders = orders.filter((order) => {
        const term = searchTerm.toLowerCase();
        return (
            order.fartaya_dr_name.toLowerCase().includes(term) ||
            (order.original_dr_name && order.original_dr_name.toLowerCase().includes(term)) ||
            (order.invoice_number && order.invoice_number.toLowerCase().includes(term))
        );
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

    async function togglePaymentStatus(order: FartayaOrder) {
        setUpdatingId(order.id);
        const newStatus = order.payment_status === "paid" ? "unpaid" : "paid";

        try {
            await supabase
                .from("fartaya_drs")
                .update({ payment_status: newStatus })
                .eq("id", order.id);

            await logAudit(
                "UPDATE_PAYMENT_STATUS",
                "fartaya_drs",
                order.id,
                { payment_status: order.payment_status },
                { payment_status: newStatus }
            );

            onRefresh();
        } catch (err) {
            console.error("Failed to update payment status:", err);
        } finally {
            setUpdatingId(null);
        }
    }

    async function handleBulkPay() {
        if (!selectedIds.length) return;
        try {
            await supabase
                .from("fartaya_drs")
                .update({ payment_status: "paid" })
                .in("id", selectedIds);

            for (const id of selectedIds) {
                await logAudit("UPDATE_PAYMENT_STATUS", "fartaya_drs", id, null, { payment_status: "paid", bulk: true });
            }

            setSelectedIds([]);
            onRefresh();
        } catch (err) {
            console.error("Bulk pay failed:", err);
        }
    }

    async function handleBulkDelete() {
        if (!selectedIds.length || !isSuperAdmin()) return;
        if (!confirm(`Are you sure you want to soft delete ${selectedIds.length} selected orders?`)) return;

        try {
            await supabase
                .from("fartaya_drs")
                .update({ is_deleted: true, updated_at: new Date().toISOString() })
                .in("id", selectedIds);

            for (const id of selectedIds) {
                await logAudit("DELETE_FARTAYA_ORDER", "fartaya_drs", id, null, { is_deleted: true, bulk: true });
            }

            setSelectedIds([]);
            onRefresh();
        } catch (err) {
            console.error("Bulk delete failed:", err);
        }
    }

    function handleBulkExport() {
        const selectedOrders = filteredOrders.filter((o) => selectedIds.includes(o.id));
        const exportData = (selectedOrders.length > 0 ? selectedOrders : filteredOrders).map((o) => ({
            "Original Order #": o.original_order_number || "N/A",
            "Original Doctor": o.original_dr_name || "N/A",
            "Fartaya Doctor": o.fartaya_dr_name,
            Quantity: o.order_quantity,
            Price: o.price,
            "Total Amount": o.order_amount,
            "Payment Status": o.payment_status,
            "Invoice #": o.invoice_number || "N/A",
            Date: formatDate(o.created_at),
        }));
        exportToCSV("fartaya_orders_export", exportData);
    }

    async function handleRequestDeletion(order: FartayaOrder) {
        if (!confirm("Are you sure you want to request deletion for this Fartaya order?")) return;

        setUpdatingId(order.id);
        const now = new Date().toISOString();

        try {
            await supabase
                .from("fartaya_drs")
                .update({
                    deletion_status: "requested",
                    deletion_requested_by: user?.id,
                    deletion_requested_at: now,
                })
                .eq("id", order.id);

            await logAudit(
                "REQUEST_DELETION",
                "fartaya_drs",
                order.id,
                { deletion_status: order.deletion_status },
                { deletion_status: "requested", deletion_requested_by: user?.id }
            );

            onRefresh();
        } catch (err) {
            console.error("Failed to request deletion:", err);
        } finally {
            setUpdatingId(null);
        }
    }

    async function handleApproveDeletion(order: FartayaOrder, approve: boolean) {
        setUpdatingId(order.id);
        const now = new Date().toISOString();
        const newStatus = approve ? "approved" : "rejected";

        try {
            await supabase
                .from("fartaya_drs")
                .update({
                    deletion_status: newStatus,
                    deletion_approved_by: user?.id,
                    deletion_approved_at: now,
                    is_deleted: approve,
                })
                .eq("id", order.id);

            await logAudit(
                approve ? "APPROVE_DELETION" : "REJECT_DELETION",
                "fartaya_drs",
                order.id,
                { deletion_status: order.deletion_status },
                { deletion_status: newStatus, is_deleted: approve }
            );

            onRefresh();
        } catch (err) {
            console.error("Failed to process deletion approval:", err);
        } finally {
            setUpdatingId(null);
        }
    }

    function openTimeline(order: FartayaOrder) {
        setTimelineOrderId(order.id);
        setTimelineTitle(`Fartaya Allocation for Dr. ${order.fartaya_dr_name}`);
        setIsTimelineOpen(true);
    }

    return (
        <div className="space-y-4">
            {/* Search & Action Header */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-2.5 text-zinc-400" size={18} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search doctor, original doctor, invoice..."
                        className="w-full rounded-xl border border-white/10 bg-black/20 pl-10 pr-4 py-2 text-sm text-white outline-none focus:border-white/30"
                    />
                </div>
                <div className="text-xs text-zinc-400">
                    Showing {filteredOrders.length} of {orders.length} Fartaya Orders
                </div>
            </div>

            {/* Bulk Actions Toolbar */}
            {selectedIds.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-5 py-3 text-sm text-indigo-200">
                    <div className="font-semibold">
                        {selectedIds.length} item(s) selected
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleBulkPay}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition"
                        >
                            <CheckCircle size={14} /> Bulk Mark as Paid
                        </button>
                        <button
                            onClick={handleBulkExport}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition"
                        >
                            <Download size={14} /> Export Selected CSV
                        </button>
                        {isSuperAdmin() && (
                            <button
                                onClick={handleBulkDelete}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-300 border border-red-500/30 hover:bg-red-500/30 transition"
                            >
                                <Trash2 size={14} /> Bulk Delete
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Table Container */}
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
                <table className="w-full text-left text-sm text-zinc-300">
                    <thead className="border-b border-white/10 bg-black/40 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        <tr>
                            <th className="px-4 py-3 w-10">
                                <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    onChange={toggleSelectAll}
                                    className="rounded border-white/20 bg-black/40 text-indigo-500 focus:ring-0"
                                />
                            </th>
                            <th className="px-4 py-3">Original Order</th>
                            <th className="px-4 py-3">Fartaya Doctor</th>
                            <th className="px-4 py-3">Qty x Price</th>
                            <th className="px-4 py-3">Total Amount</th>
                            <th className="px-4 py-3">Payment</th>
                            <th className="px-4 py-3">Invoice</th>
                            <th className="px-4 py-3">Deletion Status</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-4 py-8 text-center text-zinc-500">
                                    No Fartaya orders found.
                                </td>
                            </tr>
                        ) : (
                            filteredOrders.map((order) => {
                                const isSelected = selectedIds.includes(order.id);
                                return (
                                    <tr key={order.id} className={`hover:bg-white/5 transition ${isSelected ? "bg-indigo-500/10" : ""}`}>
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelectOne(order.id)}
                                                className="rounded border-white/20 bg-black/40 text-indigo-500 focus:ring-0"
                                            />
                                        </td>
                                        <td className="px-4 py-3 font-medium text-white">
                                            #{order.original_order_number || "N/A"}
                                            <div className="text-xs text-zinc-400">
                                                Dr. {order.original_dr_name || "N/A"}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-white">
                                            Dr. {order.fartaya_dr_name}
                                        </td>
                                        <td className="px-4 py-3">
                                            {order.order_quantity} x {formatCurrency(order.price)}
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-emerald-400">
                                            {formatCurrency(order.order_amount)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => togglePaymentStatus(order)}
                                                disabled={updatingId === order.id}
                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                                                    order.payment_status === "paid"
                                                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                                }`}
                                            >
                                                {order.payment_status === "paid" ? (
                                                    <>
                                                        <CheckCircle size={12} /> Paid
                                                    </>
                                                ) : (
                                                    <>
                                                        <Clock size={12} /> Unpaid
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <InvoiceGenerator fartayaOrder={order} onGenerated={onRefresh} />
                                        </td>
                                        <td className="px-4 py-3">
                                            {order.deletion_status === "requested" ? (
                                                <span className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                                    Deletion Requested
                                                </span>
                                            ) : order.deletion_status === "approved" ? (
                                                <span className="inline-flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md">
                                                    Approved (Deleted)
                                                </span>
                                            ) : (
                                                <span className="text-xs text-zinc-500">None</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openTimeline(order)}
                                                    title="View Activity Timeline"
                                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
                                                >
                                                    <Activity size={16} />
                                                </button>
                                                {isSuperAdmin() && order.deletion_status === "requested" && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApproveDeletion(order, true)}
                                                            title="Approve Deletion"
                                                            className="p-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/40 transition"
                                                        >
                                                            <ShieldCheck size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleApproveDeletion(order, false)}
                                                            title="Reject Deletion"
                                                            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition"
                                                        >
                                                            <ShieldAlert size={16} />
                                                        </button>
                                                    </>
                                                )}
                                                {order.deletion_status === "none" && (
                                                    <button
                                                        onClick={() => handleRequestDeletion(order)}
                                                        title="Request Deletion"
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
