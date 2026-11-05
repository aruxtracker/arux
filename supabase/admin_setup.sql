-- ========================================================
-- ARUX Super Admin Setup Migration for Supabase
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mcgptjnstxmnvkfnedxt/sql/new
-- ========================================================

-- 1. Create User Roles Table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Helper function to check if current user is admin / super_admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = user_uuid AND role IN ('admin', 'super_admin')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = user_uuid AND role = 'super_admin'
  );
END;
$$;

-- 3. Row-Level Security Policies for user_roles
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
  CREATE POLICY "Users can read own role" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

  DROP POLICY IF EXISTS "Super admins can manage roles" ON public.user_roles;
  CREATE POLICY "Super admins can manage roles" ON public.user_roles
    FOR ALL USING (public.is_super_admin() OR auth.uid() = user_id);
END $$;

-- 4. Allow Super Admins to view all profiles
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
  CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
END $$;

-- 5. Global System Broadcasts Table
CREATE TABLE IF NOT EXISTS public.system_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'update' CHECK (category IN ('update', 'alert', 'info')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  active BOOLEAN NOT NULL DEFAULT true,
  action_label TEXT,
  action_tab TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_broadcasts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can read active broadcasts" ON public.system_broadcasts;
  CREATE POLICY "Anyone can read active broadcasts" ON public.system_broadcasts
    FOR SELECT USING (active = true);

  DROP POLICY IF EXISTS "Admins can manage broadcasts" ON public.system_broadcasts;
  CREATE POLICY "Admins can manage broadcasts" ON public.system_broadcasts
    FOR ALL USING (public.is_admin());
END $$;

-- 6. Trigger: Auto-promote first user to super_admin
CREATE OR REPLACE FUNCTION public.handle_first_user_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_first_user_admin();

-- 7. Function to fetch live admin dashboard metrics
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_metrics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM auth.users),
    'total_profiles', (SELECT COUNT(*) FROM public.profiles),
    'total_incomes_count', (SELECT COUNT(*) FROM public.incomes),
    'total_incomes_sum', (SELECT COALESCE(SUM(amount), 0) FROM public.incomes),
    'total_expenses_count', (SELECT COUNT(*) FROM public.expenses),
    'total_expenses_sum', (SELECT COALESCE(SUM(amount), 0) FROM public.expenses),
    'total_tasks_count', (SELECT COUNT(*) FROM public.tasks),
    'completed_tasks_count', (SELECT COUNT(*) FROM public.tasks WHERE completed = true),
    'total_habits_count', (SELECT COUNT(*) FROM public.habits),
    'total_budgets_count', (SELECT COUNT(*) FROM public.budgets),
    'total_subscriptions_count', (SELECT COUNT(*) FROM public.subscriptions)
  ) INTO result;

  RETURN result;
END;
$$;
