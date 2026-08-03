"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { OrderTemplate, ProductSetting } from "@/types/orders";
import { logAudit } from "@/utils/auditLogger";
import { Bookmark, Plus, Trash2, Edit3, ArrowLeft, CheckCircle } from "lucide-react";

export default function OrderTemplatesPage() {
    return (
        <ProtectedRoute>
            <div className="flex min-h-screen bg-zinc-950 text-white">
                <Sidebar />
                <div className="flex-1 md:ml-64 p-6 sm:p-10">
                    <OrderTemplatesContent />
                </div>
            </div>
        </ProtectedRoute>
    );
}

function OrderTemplatesContent() {
    const { user, isSuperAdmin } = useAuth();
    const [templates, setTemplates] = useState<OrderTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const [editingTemplate, setEditingTemplate] = useState<OrderTemplate | null>(null);
    const [templateName, setTemplateName] = useState("");
    const [drName, setDrName] = useState("");
    const [productName, setProductName] = useState("Hyalone");
    const [quantity, setQuantity] = useState<number | "">(1);
    const [bounceUnits, setBounceUnits] = useState<number | "">(0);
    const [error, setError] = useState("");

    const supabase = createClient();

    async function fetchTemplates() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("order_templates")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setTemplates((data || []) as OrderTemplate[]);
        } catch (err) {
            console.error("Failed to load order templates:", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchTemplates();
    }, []);

    function openCreateModal() {
        setEditingTemplate(null);
        setTemplateName("");
        setDrName("");
        setProductName("Hyalone");
        setQuantity(1);
        setBounceUnits(0);
        setError("");
        setShowModal(true);
    }

    function openEditModal(t: OrderTemplate) {
        setEditingTemplate(t);
        setTemplateName(t.name);
        setDrName(t.dr_name);
        setProductName(t.product_name);
        setQuantity(t.order_quantity);
        setBounceUnits(t.bounce_units);
        setError("");
        setShowModal(true);
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (!user) return;
        if (!templateName.trim() || !drName.trim()) {
            setError("Template name and doctor name are required.");
            return;
        }

        setSaving(true);
        setError("");

        const record = {
            name: templateName.trim(),
            dr_name: drName.trim(),
            product_name: productName,
            order_quantity: Number(quantity) || 1,
            bounce_units: Number(bounceUnits) || 0,
            user_id: user.id,
            updated_at: new Date().toISOString(),
        };

        try {
            if (editingTemplate) {
                const { error: updateErr } = await supabase
                    .from("order_templates")
                    .update(record)
                    .eq("id", editingTemplate.id);

                if (updateErr) throw updateErr;
                await logAudit("EDIT_ORDER_TEMPLATE", "order_templates", editingTemplate.id, editingTemplate, record);
            } else {
                const { data, error: insertErr } = await supabase
                    .from("order_templates")
                    .insert([record])
                    .select()
                    .single();

                if (insertErr) throw insertErr;
                await logAudit("CREATE_ORDER_TEMPLATE", "order_templates", data.id, null, data);
            }

            setShowModal(false);
            fetchTemplates();
        } catch (err: any) {
            console.error("Failed to save order template:", err);
            setError(err?.message || "Failed to save template.");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(t: OrderTemplate) {
        if (t.user_id !== user?.id && !isSuperAdmin()) {
            alert("Only the template creator or super admin can delete this template.");
            return;
        }
        if (!confirm(`Are you sure you want to delete template "${t.name}"?`)) return;

        try {
            await supabase.from("order_templates").delete().eq("id", t.id);
            await logAudit("DELETE_ORDER_TEMPLATE", "order_templates", t.id, t, null);
            fetchTemplates();
        } catch (err) {
            console.error("Failed to delete template:", err);
        }
    }

    return (
        <div className="max-w-6xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Bookmark size={28} className="text-amber-400" /> Order Templates
                    </h1>
                    <p className="text-zinc-400 text-sm mt-1">Save and manage reusable order presets for quick order entry</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
                >
                    <Plus size={18} /> Create New Template
                </button>
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-12 text-center text-zinc-400">Loading order templates...</div>
                ) : templates.length === 0 ? (
                    <div className="col-span-full rounded-3xl border border-white/10 bg-white/5 p-12 text-center text-zinc-500">
                        No order templates created yet. Click "Create New Template" to add one.
                    </div>
                ) : (
                    templates.map((t) => {
                        const canModify = t.user_id === user?.id || isSuperAdmin();
                        return (
                            <div
                                key={t.id}
                                className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between hover:border-white/20 transition"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-bold text-white text-lg truncate">{t.name}</h3>
                                        <span className="text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-md">
                                            {t.product_name}
                                        </span>
                                    </div>
                                    <div className="space-y-2 text-sm text-zinc-300">
                                        <div className="flex justify-between">
                                            <span className="text-zinc-400">Doctor Name:</span>
                                            <span className="font-medium text-white">Dr. {t.dr_name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-400">Quantity:</span>
                                            <span className="font-medium text-white">{t.order_quantity} units</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-400">Bounce Units:</span>
                                            <span className="font-medium text-amber-400">{t.bounce_units} units</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-white/10 pt-4 mt-6 flex items-center justify-between">
                                    <Link
                                        href={`/orders/in-house/add?templateId=${t.id}`}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 px-3 py-1.5 rounded-xl hover:bg-indigo-500/30 transition"
                                    >
                                        Use Template →
                                    </Link>
                                    {canModify && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => openEditModal(t)}
                                                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
                                                title="Edit Template"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(t)}
                                                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition"
                                                title="Delete Template"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Create / Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl space-y-6">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <h3 className="font-bold text-white text-lg">
                                {editingTemplate ? "Edit Order Template" : "Create Order Template"}
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-zinc-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4 text-sm">
                            <div>
                                <label className="block text-zinc-300 font-medium mb-1">Template Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    placeholder="e.g. Standard Hyalone Order"
                                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-white outline-none focus:border-white/30"
                                />
                            </div>

                            <div>
                                <label className="block text-zinc-300 font-medium mb-1">Doctor Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={drName}
                                    onChange={(e) => setDrName(e.target.value)}
                                    placeholder="e.g. Dr. John Smith"
                                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-white outline-none focus:border-white/30"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-zinc-300 font-medium mb-1">Product</label>
                                    <select
                                        value={productName}
                                        onChange={(e) => setProductName(e.target.value)}
                                        className="w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-2.5 text-white outline-none focus:border-white/30"
                                    >
                                        <option value="Hyalone">Hyalone</option>
                                        <option value="Hyalubrix">Hyalubrix</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-zinc-300 font-medium mb-1">Order Quantity</label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-white outline-none focus:border-white/30"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-zinc-300 font-medium mb-1">Bounce (Bonus Units)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={bounceUnits}
                                    onChange={(e) => setBounceUnits(e.target.value === "" ? "" : Number(e.target.value))}
                                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-white outline-none focus:border-white/30"
                                />
                            </div>

                            {error && (
                                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-400">
                                    ⚠️ {error}
                                </div>
                            )}

                            <div className="border-t border-white/10 pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-zinc-300 hover:bg-white/10"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="rounded-xl bg-white px-5 py-2 font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-50"
                                >
                                    {saving ? "Saving..." : "Save Template"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
