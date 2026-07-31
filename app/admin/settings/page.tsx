"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { createClient } from "@/lib/supabase/client";
import { ProductSetting, CompanyInfoSetting, InvoiceConfigSetting } from "@/types/orders";
import { logAudit } from "@/utils/auditLogger";
import { Settings as SettingsIcon, Save, Plus, Trash2, CheckCircle } from "lucide-react";

export default function SettingsPage() {
    return (
        <ProtectedRoute requireSuperAdmin>
            <div className="flex min-h-screen bg-zinc-950 text-white">
                <Sidebar />
                <div className="flex-1 md:ml-64 p-6 sm:p-10">
                    <SettingsContent />
                </div>
            </div>
        </ProtectedRoute>
    );
}

function SettingsContent() {
    const [products, setProducts] = useState<ProductSetting[]>([
        { id: "1", name: "Hyalone", value: "Hyalone", is_active: true },
        { id: "2", name: "Hyalubrix", value: "Hyalubrix", is_active: true },
    ]);
    const [newProductName, setNewProductName] = useState("");

    const [companyInfo, setCompanyInfo] = useState<CompanyInfoSetting>({
        name: "Medical Order Management Corp",
        address: "123 Healthcare Ave, Suite 100",
        phone: "+1 (555) 019-2834",
        email: "support@medicalorders.com",
        tax_id: "TAX-998877",
    });

    const [invoiceConfig, setInvoiceConfig] = useState<InvoiceConfigSetting>({
        prefix: "INV-",
        next_number: 1001,
        terms: "Payment due within 30 days.",
        notes: "Thank you for your business!",
    });

    const [paymentMethods, setPaymentMethods] = useState<string[]>([
        "Cash",
        "Bank Transfer",
        "Credit Card",
        "Cheque",
    ]);
    const [newPaymentMethod, setNewPaymentMethod] = useState("");

    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    const supabase = createClient();

    useEffect(() => {
        async function loadSettings() {
            try {
                const { data } = await supabase.from("settings").select("*");
                if (data) {
                    data.forEach((s) => {
                        if (s.setting_key === "products" && s.setting_value) {
                            setProducts(s.setting_value as ProductSetting[]);
                        } else if (s.setting_key === "company_info" && s.setting_value) {
                            setCompanyInfo(s.setting_value as CompanyInfoSetting);
                        } else if (s.setting_key === "invoice_settings" && s.setting_value) {
                            setInvoiceConfig(s.setting_value as InvoiceConfigSetting);
                        } else if (s.setting_key === "payment_methods" && s.setting_value) {
                            setPaymentMethods(s.setting_value as string[]);
                        }
                    });
                }
            } catch (err) {
                console.error("Failed to load settings:", err);
            }
        }
        loadSettings();
    }, []);

    async function handleAddProduct() {
        if (!newProductName.trim()) return;
        const newProd: ProductSetting = {
            id: Date.now().toString(),
            name: newProductName.trim(),
            value: newProductName.trim(),
            is_active: true,
        };
        setProducts([...products, newProd]);
        setNewProductName("");
    }

    function toggleProductActive(id: string) {
        setProducts(
            products.map((p) => (p.id === id ? { ...p, is_active: !p.is_active } : p))
        );
    }

    function removeProduct(id: string) {
        setProducts(products.filter((p) => p.id !== id));
    }

    function handleAddPaymentMethod() {
        if (!newPaymentMethod.trim()) return;
        if (paymentMethods.includes(newPaymentMethod.trim())) return;
        setPaymentMethods([...paymentMethods, newPaymentMethod.trim()]);
        setNewPaymentMethod("");
    }

    function removePaymentMethod(method: string) {
        setPaymentMethods(paymentMethods.filter((m) => m !== method));
    }

    async function handleSaveAll() {
        setSaving(true);
        setMessage("");

        try {
            const updates: Array<{ setting_key: string; setting_value: unknown; category: string }> = [
                { setting_key: "products", setting_value: products, category: "products" },
                { setting_key: "company_info", setting_value: companyInfo, category: "company" },
                { setting_key: "invoice_settings", setting_value: invoiceConfig, category: "invoice" },
                { setting_key: "payment_methods", setting_value: paymentMethods, category: "payments" },
            ];

            for (const item of updates) {
                await supabase
                    .from("settings")
                    .upsert(item as never, { onConflict: "setting_key" });
            }

            await logAudit("UPDATE_SYSTEM_SETTINGS", "settings", "all", null, {
                productsCount: products.length,
                companyName: companyInfo.name,
            });

            setMessage("System settings updated successfully!");
        } catch (err) {
            console.error("Failed to save settings:", err);
            setMessage("Error saving settings.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="max-w-4xl space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">System Settings</h1>
                    <p className="text-zinc-400 text-sm mt-1">Configure products, company branding, and invoice defaults</p>
                </div>
                <button
                    onClick={handleSaveAll}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-50"
                >
                    <Save size={18} />
                    {saving ? "Saving Settings..." : "Save All Settings"}
                </button>
            </div>

            {message && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400 flex items-center gap-2">
                    <CheckCircle size={16} /> {message}
                </div>
            )}

            {/* Products Management */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl space-y-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <SettingsIcon size={20} className="text-amber-400" /> Products Management
                </h2>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="New product name (e.g. Hyalubrix Plus)"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white outline-none"
                    />
                    <button
                        type="button"
                        onClick={handleAddProduct}
                        className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
                    >
                        <Plus size={16} /> Add Product
                    </button>
                </div>

                <div className="space-y-2 pt-2">
                    {products.map((p) => (
                        <div
                            key={p.id}
                            className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-black/30 text-sm"
                        >
                            <span className="font-semibold text-white">{p.name}</span>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => toggleProductActive(p.id)}
                                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                        p.is_active
                                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                            : "bg-zinc-800 text-zinc-400"
                                    }`}
                                >
                                    {p.is_active ? "Active" : "Disabled"}
                                </button>
                                <button
                                    onClick={() => removeProduct(p.id)}
                                    className="text-zinc-400 hover:text-red-400"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Company Info Configuration */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl space-y-4">
                <h2 className="text-xl font-bold text-white">Company Invoice Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                        <label className="block text-zinc-400 mb-1">Company Name</label>
                        <input
                            type="text"
                            value={companyInfo.name}
                            onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
                            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-white outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-zinc-400 mb-1">Tax ID / VAT</label>
                        <input
                            type="text"
                            value={companyInfo.tax_id}
                            onChange={(e) => setCompanyInfo({ ...companyInfo, tax_id: e.target.value })}
                            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-white outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-zinc-400 mb-1">Phone Number</label>
                        <input
                            type="text"
                            value={companyInfo.phone}
                            onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
                            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-white outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-zinc-400 mb-1">Company Address</label>
                        <input
                            type="text"
                            value={companyInfo.address}
                            onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
                            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-white outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Payment Methods */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl space-y-4">
                <h2 className="text-xl font-bold text-white">Accepted Payment Methods</h2>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Add payment method (e.g. Wire Transfer)"
                        value={newPaymentMethod}
                        onChange={(e) => setNewPaymentMethod(e.target.value)}
                        className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white outline-none"
                    />
                    <button
                        type="button"
                        onClick={handleAddPaymentMethod}
                        className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
                    >
                        <Plus size={16} /> Add Method
                    </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                    {paymentMethods.map((m) => (
                        <span
                            key={m}
                            className="inline-flex items-center gap-2 rounded-xl bg-black/40 border border-white/10 px-3 py-1.5 text-xs text-white"
                        >
                            {m}
                            <button onClick={() => removePaymentMethod(m)} className="text-zinc-400 hover:text-red-400">
                                ×
                            </button>
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
