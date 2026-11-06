-- ====================================================================
-- ARUX GROCERY SYSTEM: Invite Household Members by Registered Email
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mcgptjnstxmnvkfnedxt/sql/new
-- ====================================================================

-- 1. Function to invite / add a member by their registered ARUX email
CREATE OR REPLACE FUNCTION public.add_grocery_household_member_by_email(
  _household_id uuid,
  _email text,
  _role text DEFAULT 'member'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_owner_id uuid;
  v_household_name text;
  v_target_user_id uuid;
  v_target_email text;
  v_target_name text;
  v_member_id uuid;
BEGIN
  -- Verify household exists and caller is the owner
  SELECT owner_id, name INTO v_owner_id, v_household_name
  FROM public.grocery_households
  WHERE id = _household_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Household not found');
  END IF;

  IF v_owner_id != auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Only the household owner can invite members');
  END IF;

  -- Look up target user by email in auth.users
  SELECT id, email INTO v_target_user_id, v_target_email
  FROM auth.users
  WHERE LOWER(email) = LOWER(TRIM(_email))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No ARUX user found with email "' || TRIM(_email) || '". Make sure your friend has registered in ARUX with this exact email.'
    );
  END IF;

  IF v_target_user_id = auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'You are already the owner of this household');
  END IF;

  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM public.grocery_household_members
    WHERE household_id = _household_id AND user_id = v_target_user_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'This user is already a member of this household');
  END IF;

  -- Insert into household members
  INSERT INTO public.grocery_household_members (household_id, user_id, role)
  VALUES (_household_id, v_target_user_id, _role)
  RETURNING id INTO v_member_id;

  -- Get target user's display name from profiles if exists
  SELECT display_name INTO v_target_name
  FROM public.profiles
  WHERE user_id = v_target_user_id;

  RETURN json_build_object(
    'success', true,
    'member_id', v_member_id,
    'user_id', v_target_user_id,
    'email', v_target_email,
    'name', COALESCE(v_target_name, SPLIT_PART(v_target_email, '@', 1))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_grocery_household_member_by_email(uuid, text, text) TO authenticated;

-- 2. Function to fetch household members with their registered emails and names
CREATE OR REPLACE FUNCTION public.get_grocery_household_members(_household_id uuid)
RETURNS TABLE (
  id uuid,
  household_id uuid,
  user_id uuid,
  role text,
  joined_at timestamptz,
  email text,
  display_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
  SELECT 
    m.id,
    m.household_id,
    m.user_id,
    m.role,
    m.joined_at,
    u.email::text,
    COALESCE(p.display_name, SPLIT_PART(u.email::text, '@', 1)) AS display_name
  FROM public.grocery_household_members m
  JOIN auth.users u ON u.id = m.user_id
  LEFT JOIN public.profiles p ON p.user_id = m.user_id
  WHERE m.household_id = _household_id
    AND (
      EXISTS (
        SELECT 1 FROM public.grocery_households h
        WHERE h.id = _household_id
          AND (h.owner_id = auth.uid() OR public.is_household_member(_household_id, auth.uid()))
      )
    )
  ORDER BY m.joined_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_grocery_household_members(uuid) TO authenticated;

