-- =========================================================
-- GROCERY MANAGEMENT SYSTEM MIGRATION
-- Arux Tracer: Purchase Lists, Stock Tracker & Roommate Shared Household
-- =========================================================

-- 1. GROCERY HOUSEHOLDS (Shared flat / hostel / roommates)
CREATE TABLE IF NOT EXISTS public.grocery_households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.grocery_households ENABLE ROW LEVEL SECURITY;

-- 2. GROCERY HOUSEHOLD MEMBERS
CREATE TABLE IF NOT EXISTS public.grocery_household_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.grocery_households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, user_id)
);

ALTER TABLE public.grocery_household_members ENABLE ROW LEVEL SECURITY;

-- Helper functions for household membership checks
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

-- RLS for grocery_households
DROP POLICY IF EXISTS "View accessible households" ON public.grocery_households;
CREATE POLICY "View accessible households" ON public.grocery_households
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_household_member(id, auth.uid()));

DROP POLICY IF EXISTS "Insert own households" ON public.grocery_households;
CREATE POLICY "Insert own households" ON public.grocery_households
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Update owned households" ON public.grocery_households;
CREATE POLICY "Update owned households" ON public.grocery_households
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Delete owned households" ON public.grocery_households;
CREATE POLICY "Delete owned households" ON public.grocery_households
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- RLS for grocery_household_members
DROP POLICY IF EXISTS "View members of accessible households" ON public.grocery_household_members;
CREATE POLICY "View members of accessible households" ON public.grocery_household_members
  FOR SELECT TO authenticated
  USING (public.is_household_member(household_id, auth.uid()));

DROP POLICY IF EXISTS "Join household or owners add members" ON public.grocery_household_members;
CREATE POLICY "Join household or owners add members" ON public.grocery_household_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_household_member(household_id, auth.uid()));

DROP POLICY IF EXISTS "Members delete self or owner deletes member" ON public.grocery_household_members;
CREATE POLICY "Members delete self or owner deletes member" ON public.grocery_household_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.grocery_households WHERE id = household_id AND owner_id = auth.uid()
  ));

-- 3. GROCERY LISTS (Shopping lists: Monthly, Weekly, Emergency)
CREATE TABLE IF NOT EXISTS public.grocery_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES public.grocery_households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  color text NOT NULL DEFAULT '#10b981',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.grocery_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View own or household grocery lists" ON public.grocery_lists;
CREATE POLICY "View own or household grocery lists" ON public.grocery_lists
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    (household_id IS NOT NULL AND public.is_household_member(household_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Insert grocery lists" ON public.grocery_lists;
CREATE POLICY "Insert grocery lists" ON public.grocery_lists
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    (household_id IS NOT NULL AND public.is_household_member(household_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Update grocery lists" ON public.grocery_lists;
CREATE POLICY "Update grocery lists" ON public.grocery_lists
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid() OR
    created_by = auth.uid() OR
    (household_id IS NOT NULL AND public.is_household_member(household_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Delete grocery lists" ON public.grocery_lists;
CREATE POLICY "Delete grocery lists" ON public.grocery_lists
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid() OR
    created_by = auth.uid() OR
    (household_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.grocery_households WHERE id = household_id AND owner_id = auth.uid()
    ))
  );

-- 4. GROCERY LIST ITEMS (Items inside a shopping list)
CREATE TABLE IF NOT EXISTS public.grocery_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.grocery_lists(id) ON DELETE CASCADE,
  household_id uuid REFERENCES public.grocery_households(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  normalized_item_name text NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  quantity numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'packet',
  estimated_price numeric DEFAULT 0,
  actual_price numeric,
  is_purchased boolean NOT NULL DEFAULT false,
  purchased_quantity numeric,
  purchased_at timestamptz,
  purchased_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expense_id uuid REFERENCES public.expenses(id) ON DELETE SET NULL,
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.grocery_list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View grocery list items" ON public.grocery_list_items;
CREATE POLICY "View grocery list items" ON public.grocery_list_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.grocery_lists l
      WHERE l.id = list_id AND (
        l.user_id = auth.uid() OR
        (l.household_id IS NOT NULL AND public.is_household_member(l.household_id, auth.uid()))
      )
    )
  );

DROP POLICY IF EXISTS "Insert grocery list items" ON public.grocery_list_items;
CREATE POLICY "Insert grocery list items" ON public.grocery_list_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.grocery_lists l
      WHERE l.id = list_id AND (
        l.user_id = auth.uid() OR
        (l.household_id IS NOT NULL AND public.is_household_member(l.household_id, auth.uid()))
      )
    )
  );

DROP POLICY IF EXISTS "Update grocery list items" ON public.grocery_list_items;
CREATE POLICY "Update grocery list items" ON public.grocery_list_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.grocery_lists l
      WHERE l.id = list_id AND (
        l.user_id = auth.uid() OR
        (l.household_id IS NOT NULL AND public.is_household_member(l.household_id, auth.uid()))
      )
    )
  );

DROP POLICY IF EXISTS "Delete grocery list items" ON public.grocery_list_items;
CREATE POLICY "Delete grocery list items" ON public.grocery_list_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.grocery_lists l
      WHERE l.id = list_id AND (
        l.user_id = auth.uid() OR
        (l.household_id IS NOT NULL AND public.is_household_member(l.household_id, auth.uid()))
      )
    )
  );

-- 5. GROCERY STOCK TRACKER (Stock in hostel/home)
CREATE TABLE IF NOT EXISTS public.grocery_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES public.grocery_households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  normalized_item_name text NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  current_quantity numeric NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
  unit text NOT NULL DEFAULT 'packet',
  minimum_stock numeric NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
  purchase_price numeric,
  expiry_date date,
  last_purchased_at timestamptz,
  storage_location text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.grocery_stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View grocery stock" ON public.grocery_stock;
CREATE POLICY "View grocery stock" ON public.grocery_stock
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    (household_id IS NOT NULL AND public.is_household_member(household_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Insert grocery stock" ON public.grocery_stock;
CREATE POLICY "Insert grocery stock" ON public.grocery_stock
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    (household_id IS NOT NULL AND public.is_household_member(household_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Update grocery stock" ON public.grocery_stock;
CREATE POLICY "Update grocery stock" ON public.grocery_stock
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid() OR
    (household_id IS NOT NULL AND public.is_household_member(household_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Delete grocery stock" ON public.grocery_stock;
CREATE POLICY "Delete grocery stock" ON public.grocery_stock
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid() OR
    (household_id IS NOT NULL AND public.is_household_member(household_id, auth.uid()))
  );

-- 6. GROCERY STOCK MOVEMENTS (Auditable stock movements: purchase, consumption, adjustment, waste)
CREATE TABLE IF NOT EXISTS public.grocery_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid NOT NULL REFERENCES public.grocery_stock(id) ON DELETE CASCADE,
  household_id uuid REFERENCES public.grocery_households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('purchase', 'consumption', 'adjustment', 'waste')),
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit text NOT NULL,
  reference_id uuid,
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.grocery_stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View stock movements" ON public.grocery_stock_movements;
CREATE POLICY "View stock movements" ON public.grocery_stock_movements
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    (household_id IS NOT NULL AND public.is_household_member(household_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Insert stock movements" ON public.grocery_stock_movements;
CREATE POLICY "Insert stock movements" ON public.grocery_stock_movements
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    (household_id IS NOT NULL AND public.is_household_member(household_id, auth.uid()))
  );

-- 7. GROCERY ACTIVITY (Activity feed for shared roommates/hostel members)
CREATE TABLE IF NOT EXISTS public.grocery_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES public.grocery_households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_name text NOT NULL,
  action text NOT NULL,
  item_name text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.grocery_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View grocery activity" ON public.grocery_activity;
CREATE POLICY "View grocery activity" ON public.grocery_activity
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    (household_id IS NOT NULL AND public.is_household_member(household_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Insert grocery activity" ON public.grocery_activity;
CREATE POLICY "Insert grocery activity" ON public.grocery_activity
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    (household_id IS NOT NULL AND public.is_household_member(household_id, auth.uid()))
  );

-- 8. CUSTOM GROCERY CATEGORIES
CREATE TABLE IF NOT EXISTS public.grocery_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id uuid REFERENCES public.grocery_households(id) ON DELETE CASCADE,
  name text NOT NULL,
  emoji text DEFAULT '🛒',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE public.grocery_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View grocery categories" ON public.grocery_categories;
CREATE POLICY "View grocery categories" ON public.grocery_categories
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    (household_id IS NOT NULL AND public.is_household_member(household_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Manage own grocery categories" ON public.grocery_categories;
CREATE POLICY "Manage own grocery categories" ON public.grocery_categories
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gli_list ON public.grocery_list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_gli_purchased ON public.grocery_list_items(is_purchased);
CREATE INDEX IF NOT EXISTS idx_gs_user ON public.grocery_stock(user_id);
CREATE INDEX IF NOT EXISTS idx_gs_household ON public.grocery_stock(household_id);
CREATE INDEX IF NOT EXISTS idx_gs_norm_name ON public.grocery_stock(normalized_item_name);
CREATE INDEX IF NOT EXISTS idx_gsm_stock ON public.grocery_stock_movements(stock_id);
CREATE INDEX IF NOT EXISTS idx_ga_household ON public.grocery_activity(household_id);
CREATE INDEX IF NOT EXISTS idx_ga_created ON public.grocery_activity(created_at DESC);

