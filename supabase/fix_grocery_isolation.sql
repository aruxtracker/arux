-- ====================================================================
-- ARUX FIX: HOUSEHOLD & GROCERY PRIVACY ISOLATION
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mcgptjnstxmnvkfnedxt/sql/new
-- ====================================================================

-- 1. Helper function for household membership check (SECURITY DEFINER to prevent recursion)
CREATE OR REPLACE FUNCTION public.is_household_member(_household_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.grocery_household_members
    WHERE household_id = _household_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.grocery_households
    WHERE id = _household_id AND owner_id = _user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_household_member(uuid, uuid) TO authenticated;

-- 2. Restrict grocery_households SELECT to owner or invited members only
DROP POLICY IF EXISTS "View accessible households" ON public.grocery_households;
CREATE POLICY "View accessible households" ON public.grocery_households
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid() OR
    public.is_household_member(id, auth.uid())
  );

-- 3. Restrict grocery_household_members SELECT to members of the household
DROP POLICY IF EXISTS "View members of accessible households" ON public.grocery_household_members;
CREATE POLICY "View members of accessible households" ON public.grocery_household_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    public.is_household_member(household_id, auth.uid())
  );

-- 4. Performance Indexes for fast RLS checks
CREATE INDEX IF NOT EXISTS idx_grocery_households_owner ON public.grocery_households(owner_id);
CREATE INDEX IF NOT EXISTS idx_grocery_household_members_user ON public.grocery_household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_grocery_household_members_hh ON public.grocery_household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_grocery_list_items_household ON public.grocery_list_items(household_id);
CREATE INDEX IF NOT EXISTS idx_grocery_list_items_creator ON public.grocery_list_items(created_by);

