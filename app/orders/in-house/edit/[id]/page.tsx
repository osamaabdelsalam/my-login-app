"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { InHouseOrder } from "@/types/orders";
import { logAudit } from "@/utils/auditLogger";
import { formatCurrency } from "@/utils/helpers";
import { Save, ArrowLeft } from "lucide-react";

export default function EditInHouseOrderPage() {
    return (
        <ProtectedRoute>
            <div className="flex min-h-screen bg-zinc-950 text-white">
                <Sidebar />
                <div className="flex-1 md:ml-64 p-6 sm:p-10">
                    <EditInHouseOrderForm />
                </div>
            </div>
        </ProtectedRoute>
    );
}

function EditInHouseOrderForm() {
    const router = useRouter();
    const params = useParams();
    const orderId = params?.id as string;
    const { user, isSuperAdmin } = useAuth();

    const [originalOrder, setOriginalOrder] = useState<InHouseOrder | null>(null);
    const [drName, setDrName] = useState("");
    const [productName, setProductName] = useState("Hyalone");
    const [quantity, setQuantity] = useState<number | "">(1);
    const [price, setPrice] = useState<number | "">(100);
    const [bounceUnits, setBounceUnits] = useState<number | "">(0);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const supabase = createClient();

    useEffect(() => {
        async function fetchOrder() {
            if (!orderId) return;
            try {
                const { data, error } = await supabase
                    .from("in_house_orders")
                    .select("*")
                    .eq("id", orderId)
                    .single();

                if (error) throw error;
                const order = data as InHouseOrder;

                // Check authorization: must be owner or super admin
                if (order.user_id !== user?.id && !isSuperAdmin()) {
                    router.push("/unauthorized");
                    return;
                }

                setOriginalOrder(order);
                setDrName(order.dr_name);
                setProductName(order.product_name);
                setQuantity(order.order_quantity);
                setPrice(order.price);
                setBounceUnits(order.bounce_units || 0);
            } catch (err) {
                console.error("Failed to load order:", err);
                setError("Order not found or permission denied.");
            } finally {
                setLoading(false);
            }
        }
        fetchOrder();
    }, [orderId, user, isSuperAdmin, router]);

    const qtyNum = Number(quantity) || 0;
    const priceNum = Number(price) || 0;
    const bounceUnitsNum = Number(bounceUnits) || 0;

    const orderAmount = qtyNum * priceNum;
    const netAmount = Math.max(0, (qtyNum - bounceUnitsNum) * priceNum);
    const remainingAmount = netAmount;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!originalOrder) return;

        setSaving(true);
        setError("");

        try {
            const updatedFields = {
                dr_name: drName.trim(),
                product_name: productName,
                order_quantity: qtyNum,
                price: priceNum,
                bounce_units: bounceUnitsNum,
                bounce_amount: 0,
                remaining_amount: remainingAmount,
                updated_at: new Date().toISOString(),
            };

            const { data, error: updateError } = await supabase
                .from("in_house_orders")
                .update(updatedFields)
                .eq("id", originalOrder.id)
                .select()
                .single();

            if (updateError) throw updateError;

            await logAudit("EDIT_IN_HOUSE_ORDER", "in_house_orders", originalOrder.id, originalOrder, data);

            router.push("/orders/in-house");
        } catch (err: unknown) {
            console.error("Failed to edit order:", err);
            setError(err instanceof Error ? err.message : "Failed to update order.");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <div className="text-zinc-400">Loading order data...</div>;
    }

    return (
        <div className="max-w-3xl">
            <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6 transition"
            >
                <ArrowLeft size={16} /> Back to In-House Orders
            </button>

            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
                Edit Order #{originalOrder?.order_number}
            </h1>
            <p className="text-zinc-400 text-sm mb-8">Update order details and recalculate balances</p>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="drName" className="block text-sm font-medium text-zinc-300 mb-2">
                            Doctor Name
                        </label>
                        <input
                            id="drName"
                            type="text"
                            required
                            value={drName}
                            onChange={(e) => setDrName(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-white/30"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="productName" className="block text-sm font-medium text-zinc-300 mb-2">
                                Product
                            </label>
                            <select
                                id="productName"
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-white/30"
                            >
                                <option value="Hyalone">Hyalone</option>
                                <option value="Hyalubrix">Hyalubrix</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="quantity" className="block text-sm font-medium text-zinc-300 mb-2">
                                Order Quantity
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
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="price" className="block text-sm font-medium text-zinc-300 mb-2">
                                Unit Price ($)
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

                        <div>
                            <label htmlFor="bounceUnits" className="block text-sm font-medium text-zinc-300 mb-2">
                                Bounce (Bonus Units)
                            </label>
                            <input
                                id="bounceUnits"
                                type="number"
                                min="0"
                                value={bounceUnits}
                                onChange={(e) => setBounceUnits(e.target.value === "" ? "" : Number(e.target.value))}
                                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-white/30"
                            />
                        </div>
                    </div>

                    {/* Calculated Summary Box */}
                    <div className="rounded-2xl border border-white/10 bg-black/40 p-5 space-y-2 text-sm">
                        <div className="flex justify-between text-zinc-400">
                            <span>Order Amount:</span>
                            <span className="font-semibold text-white">{formatCurrency(orderAmount)}</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                            <span>Net Amount:</span>
                            <span className="font-semibold text-emerald-400">{formatCurrency(netAmount)}</span>
                        </div>
                        <div className="border-t border-white/10 pt-2 flex justify-between text-base font-bold text-indigo-300">
                            <span>Recalculated Remaining Balance:</span>
                            <span>{formatCurrency(remainingAmount)}</span>
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                            ⚠️ {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-2 w-full justify-center rounded-xl bg-white px-6 py-3.5 font-medium text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-50"
                    >
                        <Save size={18} />
                        {saving ? "Saving Changes..." : "Save Order Changes"}
                    </button>
                </form>
            </div>
        </div>
    );
}
