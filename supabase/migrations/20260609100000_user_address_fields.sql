-- Add user profile fields for admin create-user form

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS middle_name VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS state VARCHAR(100);
