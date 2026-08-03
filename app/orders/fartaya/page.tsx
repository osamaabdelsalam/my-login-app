"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import EnhancedFartayaTable from "@/components/EnhancedFartayaTable";
import OrderTimeline from "@/components/OrderTimeline";
import { createClient } from "@/lib/supabase/client";
import { InHouseOrder, FartayaOrder } from "@/types/orders";
import { formatCurrency, formatDate } from "@/utils/helpers";
import { PlusCircle, Layers, CreditCard, ChevronDown, ChevronUp, Activity } from "lucide-react";

export default function FartayaCombinedPage() {
    return (
        <ProtectedRoute>
            <div className="flex min-h-screen bg-zinc-950 text-white">
                <Sidebar />
                <div className="flex-1 md:ml-64 p-6 sm:p-10">
                    <FartayaCombinedContent />
                </div>
            </div>
        </ProtectedRoute>
    );
}

function FartayaCombinedContent() {
    const [activeTab, setActiveTab] = useState<"overview" | "collection">("overview");
    const [inHouseOrders, setInHouseOrders] = useState<InHouseOrder[]>([]);
    const [fartayaOrders, setFartayaOrders] = useState<FartayaOrder[]>([]);
    const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);

    // Timeline state
    const [timelineOrderId, setTimelineOrderId] = useState<string>("");
    const [timelineTitle, setTimelineTitle] = useState<string>("");
    const [isTimelineOpen, setIsTimelineOpen] = useState(false);

    const supabase = createClient();

    async function loadData() {
        setLoading(true);
        try {
            const [inHouseRes, fartayaRes] = await Promise.all([
                supabase.from("in_house_orders").select("*").eq("is_deleted", false).order("created_at", { ascending: false }),
                supabase.from("fartaya_drs").select("*").eq("is_deleted", false).order("created_at", { ascending: false }),
            ]);

            setInHouseOrders((inHouseRes.data || []) as InHouseOrder[]);
            setFartayaOrders((fartayaRes.data || []) as FartayaOrder[]);
        } catch (err) {
            console.error("Failed to load Fartaya combined data:", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    function toggleExpand(orderId: string) {
        setExpandedOrderIds((prev) => ({
            ...prev,
            [orderId]: !prev[orderId],
        }));
    }

    function openTimeline(order: InHouseOrder) {
        setTimelineOrderId(order.id);
        setTimelineTitle(`Main Order #${order.order_number} (Dr. ${order.dr_name})`);
        setIsTimelineOpen(true);
    }

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Fartaya Order Management</h1>
                    <p className="text-zinc-400 text-sm mt-1">Overview of allocations and payment collections</p>
                </div>
                <Link
                    href="/orders/fartaya/add"
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
                >
                    <PlusCircle size={18} /> New Fartaya Order
                </Link>
            </div>

            {/* Tabs Header */}
            <div className="flex rounded-2xl bg-black/40 p-1.5 border border-white/10 max-w-md mb-8">
                <button
                    onClick={() => setActiveTab("overview")}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition ${
                        activeTab === "overview"
                            ? "bg-white text-zinc-950 shadow-lg font-semibold"
                            : "text-zinc-400 hover:text-white"
                    }`}
                >
                    <Layers size={16} /> Overview (Allocations)
                </button>
                <button
                    onClick={() => setActiveTab("collection")}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition ${
                        activeTab === "collection"
                            ? "bg-white text-zinc-950 shadow-lg font-semibold"
                            : "text-zinc-400 hover:text-white"
                    }`}
                >
                    <CreditCard size={16} /> Collection (Payments)
                </button>
            </div>

            {/* Tab Contents */}
            {loading ? (
                <div className="text-zinc-400">Loading order records...</div>
            ) : activeTab === "overview" ? (
                /* Overview Tab: Parent In-House orders with nested Fartaya allocations */
                <div className="space-y-4">
                    {inHouseOrders.length === 0 ? (
                        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-zinc-500">
                            No in-house orders available.
                        </div>
                    ) : (
                        inHouseOrders.map((parent) => {
                            const allocations = fartayaOrders.filter((f) => f.original_order_id === parent.id);
                            const isExpanded = expandedOrderIds[parent.id] ?? true;

                            return (
                                <div
                                    key={parent.id}
                                    className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden"
                                >
                                    {/* Parent Header */}
                                    <div
                                        className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/5 transition"
                                    >
                                        <div className="flex items-center gap-4 cursor-pointer" onClick={() => toggleExpand(parent.id)}>
                                            <button className="text-zinc-400">
                                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </button>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-sm font-bold text-white">
                                                        Order #{parent.order_number}
                                                    </span>
                                                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-zinc-300">
                                                        {parent.product_name}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-zinc-400 mt-0.5">
                                                    Main Doctor: <span className="text-white font-medium">Dr. {parent.dr_name}</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6 text-sm">
                                            <div>
                                                <div className="text-xs text-zinc-400">Total Order Amount</div>
                                                <div className="font-semibold text-white">{formatCurrency(parent.order_amount)}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-zinc-400">Remaining Balance</div>
                                                <div className="font-bold text-emerald-400">{formatCurrency(parent.remaining_amount)}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-zinc-400">Fartaya Allocations</div>
                                                <div className="font-semibold text-indigo-400 text-center">{allocations.length}</div>
                                            </div>
                                            <button
                                                onClick={() => openTimeline(parent)}
                                                className="p-2 rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition"
                                                title="View Activity Timeline"
                                            >
                                                <Activity size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expandable Fartaya Sub-Table */}
                                    {isExpanded && (
                                        <div className="border-t border-white/10 bg-black/30 p-4 sm:p-6">
                                            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                                                Sub-Doctor Allocations ({allocations.length})
                                            </h4>
                                            {allocations.length === 0 ? (
                                                <div className="text-xs text-zinc-500 italic py-2">
                                                    No Fartaya sub-orders allocated yet.
                                                </div>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left text-xs text-zinc-300">
                                                        <thead className="border-b border-white/10 text-zinc-400 font-semibold">
                                                            <tr>
                                                                <th className="py-2">Fartaya Doctor</th>
                                                                <th className="py-2">Quantity</th>
                                                                <th className="py-2">Unit Price</th>
                                                                <th className="py-2">Allocated Amount</th>
                                                                <th className="py-2">Payment Status</th>
                                                                <th className="py-2">Date</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-white/5">
                                                            {allocations.map((alloc) => (
                                                                <tr key={alloc.id}>
                                                                    <td className="py-2.5 font-medium text-white">
                                                                        Dr. {alloc.fartaya_dr_name}
                                                                    </td>
                                                                    <td className="py-2.5">{alloc.order_quantity}</td>
                                                                    <td className="py-2.5">{formatCurrency(alloc.price)}</td>
                                                                    <td className="py-2.5 font-semibold text-emerald-400">
                                                                        {formatCurrency(alloc.order_amount)}
                                                                    </td>
                                                                    <td className="py-2.5">
                                                                        <span
                                                                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                                                                                alloc.payment_status === "paid"
                                                                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                                                                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                                                            }`}
                                                                        >
                                                                            {alloc.payment_status}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-2.5 text-zinc-500">
                                                                        {formatDate(alloc.created_at)}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            ) : (
                /* Collection Tab: EnhancedFartayaTable */
                <EnhancedFartayaTable orders={fartayaOrders} onRefresh={loadData} />
            )}

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
