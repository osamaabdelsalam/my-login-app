"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { createClient } from "@/lib/supabase/client";
import { AuditLog } from "@/types/orders";
import { formatDateTime, exportToCSV } from "@/utils/helpers";
import { FileText, Download, Filter } from "lucide-react";

export default function AuditLogsPage() {
    return (
        <ProtectedRoute requireSuperAdmin>
            <div className="flex min-h-screen bg-zinc-950 text-white">
                <Sidebar />
                <div className="flex-1 md:ml-64 p-6 sm:p-10">
                    <AuditLogsContent />
                </div>
            </div>
        </ProtectedRoute>
    );
}

function AuditLogsContent() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionFilter, setActionFilter] = useState("");
    const [tableFilter, setTableFilter] = useState("");

    const supabase = createClient();

    async function fetchAuditLogs() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("audit_logs")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(100);

            if (error) throw error;
            setLogs((data || []) as AuditLog[]);
        } catch (err) {
            console.error("Failed to load audit logs:", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchAuditLogs();
    }, []);

    const filteredLogs = logs.filter((l) => {
        const matchesAction = !actionFilter || l.action_type.toLowerCase().includes(actionFilter.toLowerCase());
        const matchesTable = !tableFilter || l.table_name.toLowerCase().includes(tableFilter.toLowerCase());
        return matchesAction && matchesTable;
    });

    function handleExportCSV() {
        const exportData = filteredLogs.map((l) => ({
            ID: l.id,
            "User ID": l.user_id || "System",
            Action: l.action_type,
            Table: l.table_name,
            "Record ID": l.record_id || "N/A",
            "Old Values": JSON.stringify(l.old_values || {}),
            "New Values": JSON.stringify(l.new_values || {}),
            Timestamp: formatDateTime(l.created_at),
        }));
        exportToCSV("audit_logs", exportData);
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">System Audit Logs</h1>
                    <p className="text-zinc-400 text-sm mt-1">Complete security trail of all data mutations</p>
                </div>
                <button
                    onClick={handleExportCSV}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
                >
                    <Download size={16} /> Export Logs CSV
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white">
                    <Filter size={16} className="text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Filter by Action (e.g. CREATE)"
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                        className="bg-transparent outline-none text-white placeholder:text-zinc-500"
                    />
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white">
                    <Filter size={16} className="text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Filter by Table Name"
                        value={tableFilter}
                        onChange={(e) => setTableFilter(e.target.value)}
                        className="bg-transparent outline-none text-white placeholder:text-zinc-500"
                    />
                </div>
            </div>

            {/* Logs Table */}
            <div className="overflow-x-auto rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
                <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="border-b border-white/10 bg-black/40 font-semibold uppercase tracking-wider text-zinc-400">
                        <tr>
                            <th className="px-4 py-3">Timestamp</th>
                            <th className="px-4 py-3">Action</th>
                            <th className="px-4 py-3">Table</th>
                            <th className="px-4 py-3">Record ID</th>
                            <th className="px-4 py-3">User ID</th>
                            <th className="px-4 py-3">Changes Summary</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-zinc-400 font-sans">
                                    Loading audit trail...
                                </td>
                            </tr>
                        ) : filteredLogs.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-zinc-500 font-sans">
                                    No matching audit logs recorded yet.
                                </td>
                            </tr>
                        ) : (
                            filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-white/5 transition">
                                    <td className="px-4 py-3 text-zinc-400">
                                        {formatDateTime(log.created_at)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-block rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 font-sans font-semibold">
                                            {log.action_type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-white font-medium">{log.table_name}</td>
                                    <td className="px-4 py-3 text-zinc-400 truncate max-w-[120px]" title={log.record_id || ""}>
                                        {log.record_id || "N/A"}
                                    </td>
                                    <td className="px-4 py-3 text-zinc-400 truncate max-w-[120px]" title={log.user_id || ""}>
                                        {log.user_id || "System"}
                                    </td>
                                    <td className="px-4 py-3 text-zinc-400 max-w-xs truncate" title={JSON.stringify(log.new_values || {})}>
                                        {log.new_values ? JSON.stringify(log.new_values) : "N/A"}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
