export type UserRole = 'user' | 'super_admin';

export interface UserProfile {
    id: string;
    email: string;
    full_name?: string | null;
    role: UserRole;
    created_at?: string;
    updated_at?: string;
}

export type ProductName = 'Hyalone' | 'Hyalubrix' | string;

export interface InHouseOrder {
    id: string;
    order_number: number;
    dr_name: string;
    product_name: ProductName;
    order_quantity: number;
    price: number;
    order_amount: number;
    bounce_units: number;
    bounce_amount: number;
    remaining_amount: number;
    is_deleted: boolean;
    user_id: string;
    created_at: string;
    updated_at: string;
}

export type PaymentStatus = 'paid' | 'unpaid';
export type DeletionStatus = 'none' | 'requested' | 'approved' | 'rejected';

export interface FartayaOrder {
    id: string;
    original_order_id: string;
    original_order_number?: number | null;
    original_dr_name?: string | null;
    fartaya_dr_name: string;
    order_quantity: number;
    price: number;
    order_amount: number;
    payment_status: PaymentStatus;
    deletion_status: DeletionStatus;
    deletion_requested_by?: string | null;
    deletion_requested_at?: string | null;
    deletion_approved_by?: string | null;
    deletion_approved_at?: string | null;
    invoice_generated: boolean;
    invoice_number?: string | null;
    invoice_date?: string | null;
    invoice_url?: string | null;
    is_deleted: boolean;
    user_id: string;
    created_at: string;
    updated_at: string;
}

export interface AuditLog {
    id: string;
    user_id?: string | null;
    action_type: string;
    table_name: string;
    record_id?: string | null;
    old_values?: unknown;
    new_values?: unknown;
    ip_address?: string | null;
    user_agent?: string | null;
    browser_info?: string | null;
    location_info?: string | null;
    created_at: string;
}

export interface ProductSetting {
    id: string;
    name: string;
    value: string;
    price: number;
    is_active: boolean;
}

export interface CompanyInfoSetting {
    name: string;
    address: string;
    phone: string;
    email: string;
    tax_id: string;
}

export interface InvoiceConfigSetting {
    prefix: string;
    next_number: number;
    terms: string;
    notes: string;
}

export interface Setting {
    id: string;
    setting_key: string;
    setting_value: unknown;
    category: string;
    description?: string | null;
    created_by?: string | null;
    created_at?: string;
    updated_at?: string;
}
