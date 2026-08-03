"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { ProductSetting, OrderTemplate } from "@/types/orders";
import { logAudit } from "@/utils/auditLogger";
import { formatCurrency } from "@/utils/helpers";
import { PlusCircle, ArrowLeft, Bookmark, Save } from "lucide-react";

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
    const searchParams = useSearchParams();
    const preselectedTemplateId = searchParams?.get("templateId") || "";

    const { user } = useAuth();

    const [drName, setDrName] = useState("");
    const [productName, setProductName] = useState("Hyalone");
    const [productsList, setProductsList] = useState<ProductSetting[]>([
        { id: "p1", name: "Hyalone", value: "Hyalone", price: 2610, is_active: true },
        { id: "p2", name: "Hyalubrix", value: "Hyalubrix", price: 1305, is_active: true },
    ]);
    const [templates, setTemplates] = useState<OrderTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState(preselectedTemplateId);

    const [quantity, setQuantity] = useState<number | "">(1);
    const [price, setPrice] = useState<number | "">(2610);
    const [bounceUnits, setBounceUnits] = useState<number | "">(0);

    const [loading, setLoading] = useState(false);
    const [savingTemplate, setSavingTemplate] = useState(false);
    const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
    const [templateNameInput, setTemplateNameInput] = useState("");
    const [error, setError] = useState("");

    const supabase = createClient();

    useEffect(() => {
        async function loadProductsAndTemplates() {
            try {
                const [prodRes, tplRes] = await Promise.all([
                    supabase.from("settings").select("*").eq("setting_key", "products").maybeSingle(),
                    supabase.from("order_templates").select("*").order("name", { ascending: true }),
                ]);

                if (prodRes.data?.setting_value) {
                    const list = (prodRes.data.setting_value as ProductSetting[]).filter((p) => p.is_active);
                    if (list.length > 0) {
                        setProductsList(list);
                    }
                }

                if (tplRes.data) {
                    const tplList = tplRes.data as OrderTemplate[];
                    setTemplates(tplList);

                    if (preselectedTemplateId) {
                        const matched = tplList.find((t) => t.id === preselectedTemplateId);
                        if (matched) {
                            applyTemplateData(matched);
                        }
                    }
                }
            } catch (e) {
                console.warn("Error loading products or templates", e);
            }
        }
        loadProductsAndTemplates();
    }, [preselectedTemplateId]);

    function applyTemplateData(t: OrderTemplate) {
        setDrName(t.dr_name);
        setProductName(t.product_name);
        setQuantity(t.order_quantity);
        setBounceUnits(t.bounce_units);

        const match = productsList.find((p) => p.name === t.product_name);
        if (match) {
            setPrice(match.price);
        } else if (t.product_name === "Hyalone") {
            setPrice(2610);
        } else if (t.product_name === "Hyalubrix") {
            setPrice(1305);
        }
    }

    function handleSelectTemplate(id: string) {
        setSelectedTemplateId(id);
        const t = templates.find((item) => item.id === id);
        if (t) {
            applyTemplateData(t);
        }
    }

    function handleProductChange(name: string) {
        setProductName(name);
        const match = productsList.find((p) => p.name === name);
        if (match) {
            setPrice(match.price);
        } else if (name === "Hyalone") {
            setPrice(2610);
        } else if (name === "Hyalubrix") {
            setPrice(1305);
        }
    }

    const qtyNum = Number(quantity) || 0;
    const priceNum = Number(price) || 0;
    const bounceUnitsNum = Number(bounceUnits) || 0;

    const orderAmount = qtyNum * priceNum;
    const netAmount = Math.max(0, (qtyNum - bounceUnitsNum) * priceNum);
    const totalUnits = qtyNum + bounceUnitsNum;
    const effectiveUnitPrice = totalUnits > 0 ? orderAmount / totalUnits : 0;
    const remainingAmount = netAmount;

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
                bounce_units: bounceUnitsNum,
                bounce_amount: 0,
                remaining_amount: remainingAmount,
                status: "draft",
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

    async function handleSaveCurrentAsTemplate(e: React.FormEvent) {
        e.preventDefault();
        if (!user || !templateNameInput.trim() || !drName.trim()) return;

        setSavingTemplate(true);
        try {
            const tplRecord = {
                name: templateNameInput.trim(),
                dr_name: drName.trim(),
                product_name: productName,
                order_quantity: qtyNum,
                bounce_units: bounceUnitsNum,
                user_id: user.id,
            };

            const { data, error: tplErr } = await supabase
                .from("order_templates")
                .insert([tplRecord])
                .select()
                .single();

            if (tplErr) throw tplErr;

            await logAudit("CREATE_ORDER_TEMPLATE", "order_templates", data.id, null, data);

            setTemplates([data as OrderTemplate, ...templates]);
            setSelectedTemplateId(data.id);
            setShowSaveTemplateModal(false);
            setTemplateNameInput("");
        } catch (err) {
            console.error("Failed to save template:", err);
        } finally {
            setSavingTemplate(false);
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

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Create In-House Order</h1>
                    <p className="text-zinc-400 text-sm">Record a new doctor order initialized in Draft status</p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setTemplateNameInput(`Template - Dr. ${drName || "Order"}`);
                        setShowSaveTemplateModal(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-white/10 transition"
                >
                    <Bookmark size={16} /> Save as Template
                </button>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl space-y-6">
                {/* Template Preset Selector */}
                {templates.length > 0 && (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 space-y-2">
                        <label htmlFor="selectTemplate" className="block text-xs font-semibold text-amber-300 uppercase tracking-wider">
                            ⚡ Quick Autofill from Order Template
                        </label>
                        <select
                            id="selectTemplate"
                            value={selectedTemplateId}
                            onChange={(e) => handleSelectTemplate(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-2 text-sm text-white outline-none focus:border-white/30"
                        >
                            <option value="">Select a saved template...</option>
                            {templates.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name} (Dr. {t.dr_name} — {t.product_name}, {t.order_quantity} units)
                                </option>
                            ))}
                        </select>
                    </div>
                )}

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
                                Product Selection *
                            </label>
                            <select
                                id="productName"
                                value={productName}
                                onChange={(e) => handleProductChange(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-white/30 font-medium"
                            >
                                {productsList.map((prod) => (
                                    <option key={prod.id || prod.name} value={prod.name}>
                                        {prod.name} (Default Price: ${prod.price || (prod.name === "Hyalone" ? 2610 : 1305)})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="quantity" className="block text-sm font-medium text-zinc-300 mb-2">
                                Order Quantity (Purchased Units) *
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
                            <label htmlFor="bounceUnits" className="block text-sm font-medium text-zinc-300 mb-2 flex items-center justify-between">
                                <span>Bounce (Bonus Units)</span>
                                <span className="text-xs text-amber-400 font-normal">Free Bonus Units</span>
                            </label>
                            <input
                                id="bounceUnits"
                                type="number"
                                min="0"
                                value={bounceUnits}
                                onChange={(e) => setBounceUnits(e.target.value === "" ? "" : Number(e.target.value))}
                                placeholder="0 units"
                                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-white/30"
                            />
                        </div>
                    </div>

                    {/* Calculated Summary Box */}
                    <div className="rounded-2xl border border-white/10 bg-black/40 p-5 space-y-3 text-sm">
                        <div className="flex justify-between text-zinc-400">
                            <span>Order Total (Purchased Amount):</span>
                            <span className="font-semibold text-white">{formatCurrency(orderAmount)}</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                            <span>Total Units Delivered (Purchased + Bounce):</span>
                            <span className="font-semibold text-indigo-300">
                                {qtyNum} + {bounceUnitsNum} = {totalUnits} units
                            </span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                            <span>Effective Cost / Unit:</span>
                            <span className="font-semibold text-amber-400">{formatCurrency(effectiveUnitPrice)} / unit</span>
                        </div>
                        <div className="border-t border-white/10 pt-2 flex justify-between text-base font-bold text-emerald-400">
                            <span>Remaining Balance Available (Net):</span>
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
                        className="inline-flex items-center gap-2 w-full justify-center rounded-xl bg-white px-6 py-3.5 font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-50"
                    >
                        <PlusCircle size={18} />
                        {loading ? "Creating Order..." : "Create Order (Draft)"}
                    </button>
                </form>
            </div>

            {/* Save Template Modal */}
            {showSaveTemplateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl space-y-4">
                        <h3 className="font-bold text-white text-lg">Save Current Form as Template</h3>
                        <p className="text-xs text-zinc-400">Give this preset a name so you can reuse it later.</p>

                        <form onSubmit={handleSaveCurrentAsTemplate} className="space-y-4">
                            <div>
                                <label className="block text-xs text-zinc-300 font-medium mb-1">Template Name</label>
                                <input
                                    type="text"
                                    required
                                    value={templateNameInput}
                                    onChange={(e) => setTemplateNameInput(e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5 text-sm text-white outline-none focus:border-white/30"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowSaveTemplateModal(false)}
                                    className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-white/10"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingTemplate}
                                    className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-50"
                                >
                                    {savingTemplate ? "Saving..." : "Save Template"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
