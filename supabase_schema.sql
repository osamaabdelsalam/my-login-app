-- Medical Order Management System Database Schema & RLS Policies

-- 1. Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Users Table (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'super_admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to automatically populate public.users on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. In-House Orders Table (with Product Selection: Hyalone=2610, Hyalubrix=1305, and Bounce as Units)
CREATE TABLE IF NOT EXISTS public.in_house_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number BIGSERIAL UNIQUE,
    dr_name TEXT NOT NULL,
    product_name TEXT NOT NULL,
    order_quantity INT NOT NULL CHECK (order_quantity > 0),
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    order_amount NUMERIC(12, 2) GENERATED ALWAYS AS (order_quantity * price) STORED,
    bounce_units INT NOT NULL DEFAULT 0 CHECK (bounce_units >= 0),
    bounce_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (bounce_amount >= 0),
    remaining_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Fartaya Doctors Table (Order Allocations)
CREATE TABLE IF NOT EXISTS public.fartaya_drs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_order_id UUID NOT NULL REFERENCES public.in_house_orders(id) ON DELETE CASCADE,
    original_order_number BIGINT,
    original_dr_name TEXT,
    fartaya_dr_name TEXT NOT NULL,
    order_quantity INT NOT NULL CHECK (order_quantity > 0),
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    order_amount NUMERIC(12, 2) GENERATED ALWAYS AS (order_quantity * price) STORED,
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid')),
    deletion_status TEXT NOT NULL DEFAULT 'none' CHECK (deletion_status IN ('none', 'requested', 'approved', 'rejected')),
    deletion_requested_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    deletion_requested_at TIMESTAMPTZ,
    deletion_approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    deletion_approved_at TIMESTAMPTZ,
    invoice_generated BOOLEAN NOT NULL DEFAULT FALSE,
    invoice_number TEXT,
    invoice_date TIMESTAMPTZ,
    invoice_url TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    browser_info TEXT,
    location_info TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    description TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Default Settings with Product Prices (Hyalone=2610, Hyalubrix=1305)
INSERT INTO public.settings (setting_key, setting_value, category, description)
VALUES 
(
    'products', 
    '[{"id": "p1", "name": "Hyalone", "value": "Hyalone", "price": 2610, "is_active": true}, {"id": "p2", "name": "Hyalubrix", "value": "Hyalubrix", "price": 1305, "is_active": true}]'::jsonb, 
    'products', 
    'List of available products with default prices'
),
(
    'company_info', 
    '{"name": "Medical Order Management Corp", "address": "123 Healthcare Ave, Suite 100", "phone": "+1 (555) 019-2834", "email": "support@medicalorders.com", "tax_id": "TAX-998877"}'::jsonb, 
    'company', 
    'Company header details for invoices'
),
(
    'invoice_settings', 
    '{"prefix": "INV-", "next_number": 1001, "terms": "Payment due within 30 days.", "notes": "Thank you for your business!"}'::jsonb, 
    'invoice', 
    'Invoice generation configuration'
),
(
    'payment_methods', 
    '["Cash", "Bank Transfer", "Credit Card", "Cheque"]'::jsonb, 
    'payments', 
    'Accepted payment methods'
)
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- 7. Storage Bucket setup for Invoices
INSERT INTO storage.buckets (id, name, public) 
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies for Invoices Bucket
CREATE POLICY "Public Read Invoices" ON storage.objects FOR SELECT USING (bucket_id = 'invoices');
CREATE POLICY "Authenticated Upload Invoices" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'invoices' AND auth.uid() IS NOT NULL);

-- 8. Indices for Performance
CREATE INDEX IF NOT EXISTS idx_in_house_orders_user ON public.in_house_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_in_house_orders_created ON public.in_house_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fartaya_drs_original ON public.fartaya_drs(original_order_id);
CREATE INDEX IF NOT EXISTS idx_fartaya_drs_user ON public.fartaya_drs(user_id);
CREATE INDEX IF NOT EXISTS idx_fartaya_drs_created ON public.fartaya_drs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- 9. Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.in_house_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fartaya_drs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Users view self or super admin" ON public.users FOR SELECT USING (auth.uid() = id OR public.is_super_admin());
CREATE POLICY "Super admin manage users" ON public.users FOR ALL USING (public.is_super_admin());

CREATE POLICY "Users select all in_house_orders" ON public.in_house_orders FOR SELECT USING (TRUE);
CREATE POLICY "Users insert own in_house_orders" ON public.in_house_orders FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_super_admin());
CREATE POLICY "Users update own in_house_orders" ON public.in_house_orders FOR UPDATE USING (auth.uid() = user_id OR public.is_super_admin());
CREATE POLICY "Users delete own in_house_orders" ON public.in_house_orders FOR DELETE USING (auth.uid() = user_id OR public.is_super_admin());

CREATE POLICY "Users select all fartaya_drs" ON public.fartaya_drs FOR SELECT USING (TRUE);
CREATE POLICY "Users insert own fartaya_drs" ON public.fartaya_drs FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_super_admin());
CREATE POLICY "Users update own fartaya_drs" ON public.fartaya_drs FOR UPDATE USING (auth.uid() = user_id OR public.is_super_admin());
CREATE POLICY "Users delete own fartaya_drs" ON public.fartaya_drs FOR DELETE USING (auth.uid() = user_id OR public.is_super_admin());

CREATE POLICY "Super admin select audit_logs" ON public.audit_logs FOR SELECT USING (public.is_super_admin());
CREATE POLICY "All authenticated users insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users select settings" ON public.settings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Super admin write settings" ON public.settings FOR ALL USING (public.is_super_admin());
