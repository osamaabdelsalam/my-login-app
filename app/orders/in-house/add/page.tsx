"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/utils/auditLogger";
import { formatCurrency } from "@/utils/helpers";
import { PlusCircle, ArrowLeft } from "lucide-react";

export default function AddInHouseOrderPage() {
    return (
        <ProtectedRoute>
            <div className="flex min-h-screen bg-zinc-950 text-white">
                <Sidebar />
                <div className="flex-1 md:ml-64 p-6 sm:p-10">
                    <AddInHouseOrderForm />
                </div>
            </div>
        </ProtectedRoute>
    );
}

function AddInHouseOrderForm() {
    const router = useRouter();
    const { user } = useAuth();

    const [drName, setDrName] = useState("");
    const [productName, setProductName] = useState("Hyalone");
    const [productsList, setProductsList] = useState<string[]>(["Hyalone", "Hyalubrix"]);
    const [quantity, setQuantity] = useState<number | "">(1);
    const [price, setPrice] = useState<number | "">(100);
    const [bounceAmount, setBounceAmount] = useState<number | "">(0);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const supabase = createClient();

    useEffect(() => {
        async function loadProducts() {
            try {
                const { data } = await supabase.from("settings").select("*").eq("setting_key", "products").maybeSingle();
                if (data?.setting_value) {
                    const list = (data.setting_value as Array<{ name: string; is_active: boolean }>)
                        .filter((p) => p.is_active)
                        .map((p) => p.name);
                    if (list.length > 0) {
                        setProductsList(list);
                        setProductName(list[0]);
                    }
                }
            } catch (e) {
                console.warn("Using default products list", e);
            }
        }
        loadProducts();
    }, []);

    const qtyNum = Number(quantity) || 0;
    const priceNum = Number(price) || 0;
    const bounceNum = Number(bounceAmount) || 0;

    const orderAmount = qtyNum * priceNum;
    const remainingAmount = Math.max(0, orderAmount - bounceNum);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!user) return;

        if (!drName.trim()) {
            setError("Doctor name is required.");
            return;
        }

        if (qtyNum <= 0 || priceNum <= 0) {
            setError("Quantity and Price must be greater than zero.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const newRecord = {
                dr_name: drName.trim(),
                product_name: productName,
                order_quantity: qtyNum,
                price: priceNum,
                bounce_amount: bounceNum,
                remaining_amount: remainingAmount,
                user_id: user.id,
            };

            const { data, error: insertError } = await supabase
                .from("in_house_orders")
                .insert([newRecord])
                .select()
                .single();

            if (insertError) throw insertError;

            await logAudit("CREATE_IN_HOUSE_ORDER", "in_house_orders", data.id, null, data);

            router.push("/orders/in-house");
        } catch (err: unknown) {
            console.error("Failed to create in-house order:", err);
            setError(err instanceof Error ? err.message : "Failed to create order.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-3xl">
            <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6 transition"
            >
                <ArrowLeft size={16} /> Back to In-House Orders
            </button>

            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Create In-House Order</h1>
            <p className="text-zinc-400 text-sm mb-8">Record a new medical order into the system</p>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="drName" className="block text-sm font-medium text-zinc-300 mb-2">
                            Doctor Name *
                        </label>
                        <input
                            id="drName"
                            type="text"
                            required
                            value={drName}
                            onChange={(e) => setDrName(e.target.value)}
                            placeholder="e.g. Dr. John Smith"
                            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-white/30"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="productName" className="block text-sm font-medium text-zinc-300 mb-2">
                                Product *
                            </label>
                            <select
                                id="productName"
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-white/30"
                            >
                                {productsList.map((prod) => (
                                    <option key={prod} value={prod}>
                                        {prod}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="quantity" className="block text-sm font-medium text-zinc-300 mb-2">
                                Order Quantity *
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

                        <div>
                            <label htmlFor="bounceAmount" className="block text-sm font-medium text-zinc-300 mb-2">
                                Bounce / Discount Amount ($)
                            </label>
                            <input
                                id="bounceAmount"
                                type="number"
                                step="0.01"
                                min="0"
                                value={bounceAmount}
                                onChange={(e) => setBounceAmount(e.target.value === "" ? "" : Number(e.target.value))}
                                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-white/30"
                            />
                        </div>
                    </div>

                    {/* Calculated Summary Box */}
                    <div className="rounded-2xl border border-white/10 bg-black/40 p-5 space-y-2 text-sm">
                        <div className="flex justify-between text-zinc-400">
                            <span>Calculated Order Amount:</span>
                            <span className="font-semibold text-white">{formatCurrency(orderAmount)}</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                            <span>Bounce Deduction:</span>
                            <span className="font-semibold text-amber-400">-{formatCurrency(bounceNum)}</span>
                        </div>
                        <div className="border-t border-white/10 pt-2 flex justify-between text-base font-bold text-emerald-400">
                            <span>Net Remaining Amount:</span>
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
                        disabled={loading}
                        className="inline-flex items-center gap-2 w-full justify-center rounded-xl bg-white px-6 py-3.5 font-medium text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-50"
                    >
                        <PlusCircle size={18} />
                        {loading ? "Submitting Order..." : "Create In-House Order"}
                    </button>
                </form>
            </div>
        </div>
    );
}
