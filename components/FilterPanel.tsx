"use client";

import React from "react";
import { Filter, RotateCcw, Search, ChevronDown, ChevronUp } from "lucide-react";

export interface FilterState {
    drName: string;
    orderNumber: string;
    productName: string;
    status: string;
    startDate: string;
    endDate: string;
    minAmount: string;
    maxAmount: string;
}

interface FilterPanelProps {
    filters: FilterState;
    onChange: (filters: FilterState) => void;
    onReset: () => void;
    products?: string[];
    showStatusFilter?: boolean;
}

export default function FilterPanel({
    filters,
    onChange,
    onReset,
    products = ["Hyalone", "Hyalubrix"],
    showStatusFilter = true,
}: FilterPanelProps) {
    const [isCollapsed, setIsCollapsed] = React.useState(false);

    function handleChange(field: keyof FilterState, value: string) {
        onChange({ ...filters, [field]: value });
    }

    return (
        <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-xl">
            {/* Header Toggle */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                    <Filter size={18} className="text-indigo-400" />
                    <span>Advanced Filters & Multi-Search</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onReset}
                        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition"
                    >
                        <RotateCcw size={14} /> Reset Filters
                    </button>
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
                    >
                        {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    </button>
                </div>
            </div>

            {/* Filter Controls Grid */}
            {!isCollapsed && (
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    {/* Doctor Name */}
                    <div>
                        <label className="block text-zinc-400 font-medium mb-1.5">Doctor Name</label>
                        <input
                            type="text"
                            value={filters.drName}
                            onChange={(e) => handleChange("drName", e.target.value)}
                            placeholder="Search doctor..."
                            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white outline-none focus:border-white/30"
                        />
                    </div>

                    {/* Order Number */}
                    <div>
                        <label className="block text-zinc-400 font-medium mb-1.5">Order Number</label>
                        <input
                            type="text"
                            value={filters.orderNumber}
                            onChange={(e) => handleChange("orderNumber", e.target.value)}
                            placeholder="e.g. 1001"
                            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white outline-none focus:border-white/30"
                        />
                    </div>

                    {/* Product */}
                    <div>
                        <label className="block text-zinc-400 font-medium mb-1.5">Product</label>
                        <select
                            value={filters.productName}
                            onChange={(e) => handleChange("productName", e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-white outline-none focus:border-white/30"
                        >
                            <option value="">All Products</option>
                            {products.map((p) => (
                                <option key={p} value={p}>
                                    {p}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Status */}
                    {showStatusFilter && (
                        <div>
                            <label className="block text-zinc-400 font-medium mb-1.5">Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => handleChange("status", e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-white outline-none focus:border-white/30 capitalize"
                            >
                                <option value="">All Statuses</option>
                                <option value="draft">Draft</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                    )}

                    {/* Date Range Start */}
                    <div>
                        <label className="block text-zinc-400 font-medium mb-1.5">Start Date</label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => handleChange("startDate", e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white outline-none focus:border-white/30"
                        />
                    </div>

                    {/* Date Range End */}
                    <div>
                        <label className="block text-zinc-400 font-medium mb-1.5">End Date</label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => handleChange("endDate", e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white outline-none focus:border-white/30"
                        />
                    </div>

                    {/* Min Amount */}
                    <div>
                        <label className="block text-zinc-400 font-medium mb-1.5">Min Net Amount ($)</label>
                        <input
                            type="number"
                            min="0"
                            value={filters.minAmount}
                            onChange={(e) => handleChange("minAmount", e.target.value)}
                            placeholder="0"
                            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white outline-none focus:border-white/30"
                        />
                    </div>

                    {/* Max Amount */}
                    <div>
                        <label className="block text-zinc-400 font-medium mb-1.5">Max Net Amount ($)</label>
                        <input
                            type="number"
                            min="0"
                            value={filters.maxAmount}
                            onChange={(e) => handleChange("maxAmount", e.target.value)}
                            placeholder="Max"
                            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white outline-none focus:border-white/30"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
