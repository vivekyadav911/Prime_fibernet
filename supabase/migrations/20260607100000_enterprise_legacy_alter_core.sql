-- Enterprise legacy: extend v2.0 core tables for production data compatibility

-- users: legacy CRM + auth link
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS legacy_user_id INTEGER;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS customer_id VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS first_name VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS current_latitude DECIMAL(10, 8);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS current_longitude DECIMAL(11, 8);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_renewal_date TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS block_reason TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS block_updated_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS invoice_delivery_preference VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS requires_gst_invoice BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);

-- plans: legacy columns alongside speed_mbps
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS speed VARCHAR(50);
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- officers: legacy HR fields
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS roles JSONB;
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS current_latitude DECIMAL(10, 8);
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS current_longitude DECIMAL(11, 8);
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMPTZ;
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS status VARCHAR(50);
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS terminated_at TIMESTAMPTZ;
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS termination_reason TEXT;
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS joining_date DATE;
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS role_id UUID;
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_officers_email ON public.officers(email) WHERE email IS NOT NULL;

-- subscriptions: legacy timestamps
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- service_requests: legacy CRM fields
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS type VARCHAR(100);
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS user_name VARCHAR(255);
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS user_phone VARCHAR(20);
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS plan_id UUID;
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS ticket_type VARCHAR(100);
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS sub_category VARCHAR(100);
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10, 8);
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS location_lng DECIMAL(11, 8);
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS location_address TEXT;
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS source VARCHAR(50);
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS created_by_admin_id UUID;

-- user_payments: legacy fields
ALTER TABLE public.user_payments ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR';
ALTER TABLE public.user_payments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.user_payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.user_payments ADD COLUMN IF NOT EXISTS invoice_id UUID;

-- request_activities: ensure updated_at
ALTER TABLE public.request_activities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
