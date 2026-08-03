export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
    }).format(amount || 0);
}

export function formatDate(dateString?: string | null): string {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

export function formatDateTime(dateString?: string | null): string {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function exportToCSV<T extends Record<string, unknown>>(
    filename: string,
    rows: T[]
) {
    if (!rows || !rows.length) return;

    const headers = Object.keys(rows[0]);
    const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
            headers
                .map((header) => {
                    const val = row[header];
                    const escaped = String(val ?? "").replace(/"/g, '""');
                    return `"${escaped}"`;
                })
                .join(",")
        ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export function getAuditActionDescription(actionType: string, newValues?: any, oldValues?: any): string {
    switch (actionType) {
        case "CREATE_IN_HOUSE_ORDER":
            return "Order created in draft status";
        case "EDIT_IN_HOUSE_ORDER":
            return "Order details updated";
        case "UPDATE_ORDER_STATUS":
            return `Order status updated to '${newValues?.status || 'updated'}'`;
        case "DELETE_IN_HOUSE_ORDER":
            return "Order deleted (soft delete)";
        case "CREATE_FARTAYA_ORDER":
            return `Fartaya sub-order allocated to Dr. ${newValues?.fartaya_dr_name || 'N/A'}`;
        case "UPDATE_PAYMENT_STATUS":
            return `Payment status changed to ${newValues?.payment_status === 'paid' ? 'PAID' : 'UNPAID'}`;
        case "REQUEST_DELETION":
            return "Fartaya deletion requested";
        case "APPROVE_DELETION":
            return "Fartaya deletion approved by super admin";
        case "REJECT_DELETION":
            return "Fartaya deletion request rejected";
        case "GENERATE_INVOICE":
            return `Invoice generated (#${newValues?.invoice_number || 'N/A'})`;
        case "CREATE_ORDER_TEMPLATE":
            return "Order template created";
        default:
            return actionType.replace(/_/g, " ").toLowerCase();
    }
}
