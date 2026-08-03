"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
    Home,
    ShoppingBag,
    PlusCircle,
    Layers,
    User,
    Shield,
    FileText,
    Settings,
    LogOut,
    Menu,
    X,
} from "lucide-react";

export default function Sidebar() {
    const pathname = usePathname();
    const { user, profile, isSuperAdmin, signOut } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    const navItems = [
        { name: "Dashboard", href: "/dashboard", icon: Home },
        { name: "In-House Orders", href: "/orders/in-house", icon: ShoppingBag },
        { name: "Add In-House Order", href: "/orders/in-house/add", icon: PlusCircle },
        { name: "Fartaya Orders", href: "/orders/fartaya", icon: Layers },
        { name: "Add Fartaya Order", href: "/orders/fartaya/add", icon: PlusCircle },
        { name: "My Profile", href: "/profile", icon: User },
    ];

    const adminItems = [
        { name: "Admin Dashboard", href: "/admin/dashboard", icon: Shield },
        { name: "Audit Logs", href: "/admin/audit-logs", icon: FileText },
        { name: "System Settings", href: "/admin/settings", icon: Settings },
    ];

    return (
        <>
            {/* Mobile Toggle Button */}
            <div className="md:hidden fixed top-4 left-4 z-50">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 rounded-xl bg-zinc-900 border border-white/10 text-white shadow-xl"
                >
                    {isOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    onClick={() => setIsOpen(false)}
                    className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-zinc-900 border-r border-white/10 flex flex-col justify-between transition-transform duration-300 ${
                    isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                }`}
            >
                <div>
                    {/* Header */}
                    <div className="p-6 border-b border-white/10 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/20 text-2xl shadow-lg">
                            🩺
                        </div>
                        <div>
                            <h2 className="font-bold text-white tracking-tight leading-tight">
                                MedOrder System
                            </h2>
                            <p className="text-xs text-zinc-400">Medical Order Management</p>
                        </div>
                    </div>

                    {/* Navigation Items */}
                    <nav className="p-4 space-y-1">
                        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                            Menu
                        </div>
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                                        isActive
                                            ? "bg-white text-zinc-950 shadow-md font-semibold"
                                            : "text-zinc-400 hover:text-white hover:bg-white/5"
                                    }`}
                                >
                                    <Icon size={18} />
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}

                        {/* Admin Section */}
                        {isSuperAdmin() && (
                            <>
                                <div className="pt-4 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-amber-500">
                                    Super Admin
                                </div>
                                {adminItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setIsOpen(false)}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                                                isActive
                                                    ? "bg-amber-500 text-zinc-950 font-semibold shadow-md"
                                                    : "text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10"
                                            }`}
                                        >
                                            <Icon size={18} />
                                            <span>{item.name}</span>
                                        </Link>
                                    );
                                })}
                            </>
                        )}
                    </nav>
                </div>

                {/* User Info & Sign Out Footer */}
                <div className="p-4 border-t border-white/10 bg-black/20">
                    <div className="flex items-center justify-between">
                        <div className="truncate pr-2">
                            <div className="text-sm font-medium text-white truncate">
                                {profile?.full_name || user?.email?.split("@")[0]}
                            </div>
                            <div className="text-xs text-zinc-400 capitalize">
                                {profile?.role || "user"}
                            </div>
                        </div>
                        <button
                            onClick={signOut}
                            title="Sign Out"
                            className="p-2 rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-red-500/20 transition"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
