-- ====================================================================
-- ARUX FIX: Allow roommates to join household with invite code
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mcgptjnstxmnvkfnedxt/sql/new
-- ====================================================================

-- 1. Fix SELECT policy on grocery_households
-- Previously, only existing members could see households, which blocked new friends
-- from looking up the household code to join it!
DROP POLICY IF EXISTS "View accessible households" ON public.grocery_households;
CREATE POLICY "View accessible households" ON public.grocery_households
  FOR SELECT TO authenticated
  USING (true);

-- 2. Allow authenticated users to join as members
DROP POLICY IF EXISTS "Join household or owners add members" ON public.grocery_household_members;
CREATE POLICY "Join household or owners add members" ON public.grocery_household_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_household_member(household_id, auth.uid()));

-- 3. Dedicated SECURITY DEFINER RPC to join cleanly & atomically
CREATE OR REPLACE FUNCTION public.join_grocery_household_by_code(_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_household record;
BEGIN
  -- Look up household by code (case-insensitive & trimmed)
  SELECT * INTO v_household
  FROM public.grocery_households
  WHERE UPPER(TRIM(code)) = UPPER(TRIM(_code));

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'No household found with this invite code. Check the code with your roommate.');
  END IF;

  -- Add the authenticated user as member
  INSERT INTO public.grocery_household_members (household_id, user_id, role)
  VALUES (v_household.id, auth.uid(), 'member')
  ON CONFLICT (household_id, user_id) DO NOTHING;

  RETURN json_build_object(
    'success', true,
    'household', row_to_json(v_household)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_grocery_household_by_code(text) TO authenticated;

