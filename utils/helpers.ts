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
