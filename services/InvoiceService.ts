import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { createClient } from "@/lib/supabase/client";
import { FartayaOrder } from "@/types/orders";
import { logAudit } from "@/utils/auditLogger";

export async function generateInvoicePDF(fartayaOrder: FartayaOrder): Promise<string | null> {
    const supabase = createClient();

    // Fetch company info and invoice settings
    let companyName = "Medical Order Management Corp";
    let companyAddress = "123 Healthcare Ave, Suite 100";
    let companyPhone = "+1 (555) 019-2834";
    let invoicePrefix = "INV-";

    try {
        const { data: settingsData } = await supabase.from("settings").select("*");
        if (settingsData) {
            const companySetting = settingsData.find((s) => s.setting_key === "company_info");
            if (companySetting?.setting_value) {
                const c = companySetting.setting_value as Record<string, string>;
                if (c.name) companyName = c.name;
                if (c.address) companyAddress = c.address;
                if (c.phone) companyPhone = c.phone;
            }

            const invSetting = settingsData.find((s) => s.setting_key === "invoice_settings");
            if (invSetting?.setting_value) {
                const inv = invSetting.setting_value as Record<string, string>;
                if (inv.prefix) invoicePrefix = inv.prefix;
            }
        }
    } catch (e) {
        console.warn("Could not load custom settings, using defaults.", e);
    }

    const invoiceNumber = fartayaOrder.invoice_number || `${invoicePrefix}${Date.now().toString().slice(-6)}`;
    const invoiceDate = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const doc = new jsPDF();

    // Title / Header
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text(companyName, 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(companyAddress, 14, 27);
    doc.text(`Phone: ${companyPhone}`, 14, 32);

    // Invoice Title & Info
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text("INVOICE", 140, 20);

    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Invoice No: ${invoiceNumber}`, 140, 28);
    doc.text(`Date: ${invoiceDate}`, 140, 34);
    doc.text(`Status: ${fartayaOrder.payment_status.toUpperCase()}`, 140, 40);

    doc.setLineWidth(0.5);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 46, 196, 46);

    // Customer & Order Info
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text("Bill To:", 14, 56);

    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(`Doctor Name: Dr. ${fartayaOrder.fartaya_dr_name}`, 14, 63);
    doc.text(`Original Order #: ${fartayaOrder.original_order_number || "N/A"}`, 14, 69);
    doc.text(`Original Doctor: Dr. ${fartayaOrder.original_dr_name || "N/A"}`, 14, 75);

    // Order Items Table
    const tableData = [
        [
            `Fartaya Order for Dr. ${fartayaOrder.fartaya_dr_name}`,
            fartayaOrder.order_quantity.toString(),
            `$${Number(fartayaOrder.price).toFixed(2)}`,
            `$${Number(fartayaOrder.order_amount).toFixed(2)}`,
        ],
    ];

    autoTable(doc, {
        startY: 85,
        head: [["Item Description", "Qty", "Unit Price", "Total Amount"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
        styles: { fontSize: 10, cellPadding: 4 },
    });

    // Total section
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`Total Amount: $${Number(fartayaOrder.order_amount).toFixed(2)}`, 140, finalY);

    // Terms
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text("Thank you for your business!", 14, finalY + 20);

    const pdfBlob = doc.output("blob");

    // Save to browser download directly
    doc.save(`${invoiceNumber}.pdf`);

    // Update fartaya_drs record in Supabase
    try {
        const now = new Date().toISOString();
        await supabase
            .from("fartaya_drs")
            .update({
                invoice_generated: true,
                invoice_number: invoiceNumber,
                invoice_date: now,
            })
            .eq("id", fartayaOrder.id);

        await logAudit(
            "GENERATE_INVOICE",
            "fartaya_drs",
            fartayaOrder.id,
            { invoice_generated: fartayaOrder.invoice_generated },
            { invoice_generated: true, invoice_number: invoiceNumber, invoice_date: now }
        );
    } catch (e) {
        console.error("Failed to update database record for invoice:", e);
    }

    return invoiceNumber;
}
