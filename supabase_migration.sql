-- ==============================================================================
-- ROAD REALITY — SUPABASE DATABASE MIGRATION SCRIPT
-- ==============================================================================
-- Project: Road Reality (Clean Setup for New Supabase Project)
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your "Road Reality" project (Ref: wqfgolqetkqttrrdwfix).
-- 3. Click "SQL Editor" in the left navigation sidebar.
-- 4. Click "+ New query", paste this entire script, and click "Run".
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. PROFILES TABLE & POLICIES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure all expected columns exist on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Automatic Profile Creation Trigger on Sign Up / Google OAuth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT := 'user';
BEGIN
  -- If this email has a pending admin invitation, grant admin role immediately
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'admin_invitations'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM public.admin_invitations 
      WHERE lower(email) = lower(NEW.email) AND status = 'pending'
    ) THEN
      v_role := 'admin';
      UPDATE public.admin_invitations
      SET status = 'accepted', updated_at = timezone('utc'::text, now())
      WHERE lower(email) = lower(NEW.email) AND status = 'pending';
    END IF;
  END IF;

  INSERT INTO public.profiles (id, email, name, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    v_role
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = COALESCE(public.profiles.name, EXCLUDED.name),
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    role = CASE WHEN public.profiles.role = 'admin' OR v_role = 'admin' THEN 'admin' ELSE public.profiles.role END,
    updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 3. HAZARD_REPORTS TABLE & POLICIES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.hazard_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  hazard_type TEXT,
  title TEXT,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  traffic_impact TEXT NOT NULL DEFAULT 'moderate' CHECK (traffic_impact IN ('low', 'moderate', 'high', 'blocked')),
  traffic_affected BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'REPORTED' CHECK (status IN ('REPORTED', 'VERIFIED', 'IN_PROGRESS', 'RESOLVED')),
  latitude DOUBLE PRECISION DEFAULT 12.9716,
  longitude DOUBLE PRECISION DEFAULT 77.5946,
  address TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure coordinates are nullable so reporting is never blocked if GPS is unavailable
ALTER TABLE public.hazard_reports ALTER COLUMN latitude DROP NOT NULL;
ALTER TABLE public.hazard_reports ALTER COLUMN longitude DROP NOT NULL;

-- Ensure all expected columns exist on hazard_reports
ALTER TABLE public.hazard_reports ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.hazard_reports ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.hazard_reports ADD COLUMN IF NOT EXISTS hazard_type TEXT;
ALTER TABLE public.hazard_reports ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.hazard_reports ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.hazard_reports ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE public.hazard_reports ADD COLUMN IF NOT EXISTS traffic_impact TEXT NOT NULL DEFAULT 'moderate';
ALTER TABLE public.hazard_reports ADD COLUMN IF NOT EXISTS traffic_affected BOOLEAN DEFAULT false;
ALTER TABLE public.hazard_reports ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'REPORTED';
ALTER TABLE public.hazard_reports ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.hazard_reports ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE public.hazard_reports ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.hazard_reports ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.hazard_reports ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE public.hazard_reports ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.hazard_reports ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
ALTER TABLE public.hazard_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- Automatically sync category and hazard_type
UPDATE public.hazard_reports
SET category = COALESCE(category, hazard_type, 'Other'),
    hazard_type = COALESCE(hazard_type, category, 'Other')
WHERE category IS NULL OR hazard_type IS NULL;

-- Enable RLS on hazard_reports
ALTER TABLE public.hazard_reports ENABLE ROW LEVEL SECURITY;

-- Hazard Reports Policies
DROP POLICY IF EXISTS "Anyone can view hazard reports" ON public.hazard_reports;
CREATE POLICY "Anyone can view hazard reports"
  ON public.hazard_reports FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create hazard reports" ON public.hazard_reports;
DROP POLICY IF EXISTS "Anyone can create hazard reports" ON public.hazard_reports;
CREATE POLICY "Anyone can create hazard reports"
  ON public.hazard_reports FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own hazard reports or admin" ON public.hazard_reports;
CREATE POLICY "Users can update their own hazard reports or admin"
  ON public.hazard_reports FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can delete their own hazard reports or admin" ON public.hazard_reports;
CREATE POLICY "Users can delete their own hazard reports or admin"
  ON public.hazard_reports FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ==============================================================================
-- 4. COMPATIBILITY VIEW: 'reports' (WITHOUT DUPLICATING TABLES)
-- ==============================================================================
-- Creates an updatable view named 'reports' pointing directly to 'hazard_reports'.
-- This guarantees seamless compatibility with code using either table name.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'reports'
  ) THEN
    CREATE OR REPLACE VIEW public.reports 
    WITH (security_invoker = true) AS 
      SELECT * FROM public.hazard_reports;
  END IF;
END $$;

-- Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_hazard_reports_created_at ON public.hazard_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hazard_reports_user_id ON public.hazard_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_hazard_reports_status ON public.hazard_reports(status);
CREATE INDEX IF NOT EXISTS idx_hazard_reports_category ON public.hazard_reports(category);
CREATE INDEX IF NOT EXISTS idx_hazard_reports_coordinates ON public.hazard_reports(latitude, longitude);

-- ==============================================================================
-- 5. STORAGE BUCKET FOR HAZARD IMAGES (hazard-images)
-- ==============================================================================

-- Create public bucket hazard-images if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hazard-images',
  'hazard-images',
  true,
  5242880, -- 5 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Storage Security Policies
DROP POLICY IF EXISTS "Public read access on hazard-images" ON storage.objects;
CREATE POLICY "Public read access on hazard-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'hazard-images');

DROP POLICY IF EXISTS "Authenticated users can upload hazard-images" ON storage.objects;
CREATE POLICY "Authenticated users can upload hazard-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'hazard-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own hazard-images" ON storage.objects;
CREATE POLICY "Users can update their own hazard-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'hazard-images' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Users can delete their own hazard-images" ON storage.objects;
CREATE POLICY "Users can delete their own hazard-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'hazard-images' 
    AND (
      auth.uid() = owner 
      OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      )
    )
  );

-- ==============================================================================
-- 6. ADMIN MANAGEMENT TABLES & SECURITY POLICIES
-- ==============================================================================

-- 6.1 Admin Invitations (For inviting new admins by Gmail prior to or post signup)
CREATE TABLE IF NOT EXISTS public.admin_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_by_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all invitations" ON public.admin_invitations;
CREATE POLICY "Admins can view all invitations"
  ON public.admin_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
    OR lower(email) = lower(auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS "Admins can insert invitations" ON public.admin_invitations;
CREATE POLICY "Admins can insert invitations"
  ON public.admin_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins or invitees can update invitations" ON public.admin_invitations;
CREATE POLICY "Admins or invitees can update invitations"
  ON public.admin_invitations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
    OR lower(email) = lower(auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS "Admins can delete invitations" ON public.admin_invitations;
CREATE POLICY "Admins can delete invitations"
  ON public.admin_invitations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 6.2 Admin Audit Logs (Audit trail of admin additions, role transfers, and removals)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  target_email TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs"
  ON public.admin_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_invitations_email ON public.admin_invitations(lower(email));
CREATE INDEX IF NOT EXISTS idx_admin_invitations_status ON public.admin_invitations(status);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);

-- ==============================================================================
-- 7. PROMOTE PRIMARY ADMINISTRATOR ACCOUNT (suhaspai13@gmail.com)
-- ==============================================================================
-- This promotes suhaspai13@gmail.com to administrator role if the user already exists.
UPDATE public.profiles
SET role = 'admin', updated_at = timezone('utc'::text, now())
WHERE id = (SELECT id FROM auth.users WHERE email = 'suhaspai13@gmail.com' LIMIT 1);

-- Also update by email on profiles table if already synced:
UPDATE public.profiles
SET role = 'admin', updated_at = timezone('utc'::text, now())
WHERE email = 'suhaspai13@gmail.com';

-- ==============================================================================
-- 8. VERIFICATION QUERY
-- ==============================================================================
SELECT 'Road Reality migration completed successfully!' AS status,
       (SELECT count(*) FROM public.hazard_reports) AS total_hazard_reports,
       (SELECT count(*) FROM public.profiles) AS total_profiles,
       (SELECT count(*) FROM public.profiles WHERE role = 'admin') AS total_admins,
       (SELECT count(*) FROM public.admin_invitations) AS total_invitations;
