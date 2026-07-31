"use client";

import React, { useState } from "react";
import { FartayaOrder } from "@/types/orders";
import { generateInvoicePDF } from "@/services/InvoiceService";
import { FileText, CheckCircle } from "lucide-react";

interface InvoiceGeneratorProps {
    fartayaOrder: FartayaOrder;
    onGenerated?: () => void;
}

export default function InvoiceGenerator({ fartayaOrder, onGenerated }: InvoiceGeneratorProps) {
    const [generating, setGenerating] = useState(false);

    async function handleGenerate() {
        setGenerating(true);
        try {
            await generateInvoicePDF(fartayaOrder);
            if (onGenerated) onGenerated();
        } catch (err) {
            console.error("Invoice generation error:", err);
        } finally {
            setGenerating(false);
        }
    }

    return (
        <button
            onClick={handleGenerate}
            disabled={generating}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                fartayaOrder.invoice_generated
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                    : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20"
            }`}
        >
            {generating ? (
                <span>Generating...</span>
            ) : fartayaOrder.invoice_generated ? (
                <>
                    <CheckCircle size={14} />
                    <span>Re-download PDF ({fartayaOrder.invoice_number})</span>
                </>
            ) : (
                <>
                    <FileText size={14} />
                    <span>Generate PDF Invoice</span>
                </>
            )}
        </button>
    );
}
