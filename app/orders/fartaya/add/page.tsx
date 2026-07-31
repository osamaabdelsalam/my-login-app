"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { InHouseOrder } from "@/types/orders";
import { logAudit } from "@/utils/auditLogger";
import { formatCurrency } from "@/utils/helpers";
import { PlusCircle, ArrowLeft } from "lucide-react";

export default function AddFartayaOrderPage() {
    return (
        <ProtectedRoute>
            <div className="flex min-h-screen bg-zinc-950 text-white">
                <Sidebar />
                <div className="flex-1 md:ml-64 p-6 sm:p-10">
                    <AddFartayaOrderForm />
                </div>
            </div>
        </ProtectedRoute>
    );
}

function AddFartayaOrderForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preselectedOrderId = searchParams?.get("orderId") || "";

    const { user } = useAuth();
    const [inHouseOrders, setInHouseOrders] = useState<InHouseOrder[]>([]);
    const [selectedOrderId, setSelectedOrderId] = useState(preselectedOrderId);

    const [fartayaDrName, setFartayaDrName] = useState("");
    const [quantity, setQuantity] = useState<number | "">(1);
    const [price, setPrice] = useState<number | "">(100);

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState("");

    const supabase = createClient();

    useEffect(() => {
        async function fetchInHouse() {
            try {
                const { data, error } = await supabase
                    .from("in_house_orders")
                    .select("*")
                    .eq("is_deleted", false)
                    .order("order_number", { ascending: false });

                if (error) throw error;
                const list = (data || []) as InHouseOrder[];
                setInHouseOrders(list);

                if (!selectedOrderId && list.length > 0) {
                    setSelectedOrderId(list[0].id);
                }
            } catch (err) {
                console.error("Failed to load in-house orders:", err);
            } finally {
                setFetching(false);
            }
        }
        fetchInHouse();
    }, [selectedOrderId]);

    const selectedOrder = inHouseOrders.find((o) => o.id === selectedOrderId);
    const remainingBalance = Number(selectedOrder?.remaining_amount || 0);

    const qtyNum = Number(quantity) || 0;
    const priceNum = Number(price) || 0;
    const fartayaAmount = qtyNum * priceNum;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!user || !selectedOrder) return;

        if (!fartayaDrName.trim()) {
            setError("Fartaya Doctor Name is required.");
            return;
        }

        if (qtyNum <= 0 || priceNum <= 0) {
            setError("Quantity and Price must be greater than zero.");
            return;
        }

        if (fartayaAmount > remainingBalance) {
            setError(`Fartaya order amount (${formatCurrency(fartayaAmount)}) exceeds remaining balance (${formatCurrency(remainingBalance)}).`);
            return;
        }

        setLoading(true);
        setError("");

        try {
            const newFartaya = {
                original_order_id: selectedOrder.id,
                original_order_number: selectedOrder.order_number,
                original_dr_name: selectedOrder.dr_name,
                fartaya_dr_name: fartayaDrName.trim(),
                order_quantity: qtyNum,
                price: priceNum,
                payment_status: "unpaid",
                deletion_status: "none",
                user_id: user.id,
            };

            const { data, error: insertErr } = await supabase
                .from("fartaya_drs")
                .insert([newFartaya])
                .select()
                .single();

            if (insertErr) throw insertErr;

            // Deduct allocated amount from in-house order remaining_amount
            const newRemaining = Math.max(0, remainingBalance - fartayaAmount);
            await supabase
                .from("in_house_orders")
                .update({ remaining_amount: newRemaining })
                .eq("id", selectedOrder.id);

            await logAudit("CREATE_FARTAYA_ORDER", "fartaya_drs", data.id, null, data);

            router.push("/orders/fartaya");
        } catch (err: unknown) {
            console.error("Failed to create Fartaya order:", err);
            setError(err instanceof Error ? err.message : "Failed to create Fartaya order.");
        } finally {
            setLoading(false);
        }
    }

    if (fetching) {
        return <div className="text-zinc-400">Loading in-house orders...</div>;
    }

    return (
        <div className="max-w-3xl">
            <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6 transition"
            >
                <ArrowLeft size={16} /> Back to Fartaya Orders
            </button>

            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Create Fartaya Order</h1>
            <p className="text-zinc-400 text-sm mb-8">Allocate an in-house order to a sub-doctor</p>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="selectOrder" className="block text-sm font-medium text-zinc-300 mb-2">
                            Select Parent In-House Order *
                        </label>
                        <select
                            id="selectOrder"
                            value={selectedOrderId}
                            onChange={(e) => setSelectedOrderId(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-white/30"
                        >
                            {inHouseOrders.length === 0 ? (
                                <option value="">No in-house orders available</option>
                            ) : (
                                inHouseOrders.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        Order #{o.order_number} — Dr. {o.dr_name} ({o.product_name}) — Rem: {formatCurrency(o.remaining_amount)}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    {/* Balance Info Banner */}
                    {selectedOrder && (
                        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 flex items-center justify-between text-sm">
                            <span className="text-indigo-300">Available Balance to Allocate:</span>
                            <span className="font-bold text-indigo-200 text-base">{formatCurrency(remainingBalance)}</span>
                        </div>
                    )}

                    <div>
                        <label htmlFor="fartayaDr" className="block text-sm font-medium text-zinc-300 mb-2">
                            Fartaya Doctor Name *
                        </label>
                        <input
                            id="fartayaDr"
                            type="text"
                            required
                            value={fartayaDrName}
                            onChange={(e) => setFartayaDrName(e.target.value)}
                            placeholder="e.g. Dr. Alex Vance"
                            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-white/30"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="quantity" className="block text-sm font-medium text-zinc-300 mb-2">
                                Allocated Quantity *
                            </label>
                            <input
                                id="quantity"
                                type="number"
                                min="1"
                                required
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-white/30"
                            />
                        </div>

                        <div>
                            <label htmlFor="price" className="block text-sm font-medium text-zinc-300 mb-2">
                                Unit Price ($) *
                            </label>
                            <input
                                id="price"
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                value={price}
                                onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-white/30"
                            />
                        </div>
                    </div>

                    {/* Total Amount Check */}
                    <div className="rounded-2xl border border-white/10 bg-black/40 p-4 flex justify-between items-center text-sm">
                        <span className="text-zinc-400">Total Fartaya Amount:</span>
                        <span className={`font-bold text-base ${fartayaAmount > remainingBalance ? "text-red-400" : "text-emerald-400"}`}>
                            {formatCurrency(fartayaAmount)}
                        </span>
                    </div>

                    {error && (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                            ⚠️ {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || fartayaAmount > remainingBalance}
                        className="inline-flex items-center gap-2 w-full justify-center rounded-xl bg-white px-6 py-3.5 font-medium text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-50"
                    >
                        <PlusCircle size={18} />
                        {loading ? "Allocating Order..." : "Create Fartaya Order"}
                    </button>
                </form>
            </div>
        </div>
    );
}
