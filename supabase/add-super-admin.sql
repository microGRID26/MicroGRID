-- Add super_admin column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS super_admin BOOLEAN DEFAULT false;

-- Set Greg as super admin
UPDATE public.users SET super_admin = true WHERE email = 'gkelsch@trismartsolar.com';
