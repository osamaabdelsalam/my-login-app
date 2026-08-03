"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuditLog } from "@/types/orders";
import { formatDateTime, getAuditActionDescription } from "@/utils/helpers";
import { X, Clock, Activity, CheckCircle, ShieldAlert, FileText, Layers, PlusCircle, Edit3 } from "lucide-react";

interface OrderTimelineProps {
    orderId: string;
    orderNumber?: number;
    title?: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function OrderTimeline({ orderId, orderNumber, title, isOpen, onClose }: OrderTimelineProps) {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    const supabase = createClient();

    useEffect(() => {
        async function fetchTimeline() {
            if (!orderId || !isOpen) return;
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from("audit_logs")
                    .select("*")
                    .eq("record_id", orderId)
                    .order("created_at", { ascending: false });

                if (error) throw error;
                setLogs((data || []) as AuditLog[]);
            } catch (err) {
                console.error("Failed to load order timeline:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchTimeline();
    }, [orderId, isOpen]);

    if (!isOpen) return null;

    function getEventIcon(action: string) {
        switch (action) {
            case "CREATE_IN_HOUSE_ORDER":
                return <PlusCircle size={16} className="text-emerald-400" />;
            case "EDIT_IN_HOUSE_ORDER":
            case "UPDATE_ORDER_STATUS":
                return <Edit3 size={16} className="text-indigo-400" />;
            case "CREATE_FARTAYA_ORDER":
                return <Layers size={16} className="text-purple-400" />;
            case "UPDATE_PAYMENT_STATUS":
            case "GENERATE_INVOICE":
                return <FileText size={16} className="text-amber-400" />;
            case "DELETE_IN_HOUSE_ORDER":
            case "APPROVE_DELETION":
                return <ShieldAlert size={16} className="text-red-400" />;
            default:
                return <Activity size={16} className="text-zinc-400" />;
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl space-y-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
                            <Clock size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">
                                Activity Timeline {orderNumber ? `#${orderNumber}` : ""}
                            </h3>
                            <p className="text-xs text-zinc-400">{title || "Order lifecycle event history"}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-xl p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Timeline Content */}
                <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
                    {loading ? (
                        <div className="py-8 text-center text-sm text-zinc-400">Loading timeline events...</div>
                    ) : logs.length === 0 ? (
                        <div className="py-8 text-center text-sm text-zinc-500">
                            No specific timeline history logged for this record yet.
                        </div>
                    ) : (
                        <div className="relative border-l border-white/10 ml-4 space-y-6 pl-6">
                            {logs.map((log) => (
                                <div key={log.id} className="relative group">
                                    {/* Event Icon Marker */}
                                    <div className="absolute -left-[35px] top-0 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-zinc-950 text-white shadow-md">
                                        {getEventIcon(log.action_type)}
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-semibold text-white">
                                                {log.action_type}
                                            </span>
                                            <span className="text-zinc-500 font-mono">
                                                {formatDateTime(log.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-zinc-300 mt-1 font-medium">
                                            {getAuditActionDescription(log.action_type, log.new_values, log.old_values)}
                                        </p>
                                        {log.user_id && (
                                            <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                                                User ID: {log.user_id}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-white/10 pt-4 text-right">
                    <button
                        onClick={onClose}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
