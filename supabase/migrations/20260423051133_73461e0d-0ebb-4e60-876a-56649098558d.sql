
-- =========================================================
-- 1. TASK LISTS
-- =========================================================
CREATE TABLE public.task_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#a78bfa',
  position integer NOT NULL DEFAULT 0,
  is_shared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_lists ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 2. MEMBERS
-- =========================================================
CREATE TABLE public.task_list_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.task_lists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('owner','editor')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (list_id, user_id)
);

ALTER TABLE public.task_list_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_tlm_user ON public.task_list_members(user_id);
CREATE INDEX idx_tlm_list ON public.task_list_members(list_id);

-- =========================================================
-- 3. SECURITY DEFINER HELPER (prevents recursive RLS)
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_list_member(_list_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_list_members
    WHERE list_id = _list_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.task_lists
    WHERE id = _list_id AND owner_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_list_owner(_list_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_lists
    WHERE id = _list_id AND owner_id = _user_id
  );
$$;

-- =========================================================
-- 4. RLS for task_lists
-- =========================================================
CREATE POLICY "View own or member lists" ON public.task_lists
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_list_member(id, auth.uid()));

CREATE POLICY "Insert own lists" ON public.task_lists
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Update owned lists" ON public.task_lists
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Delete owned lists" ON public.task_lists
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- =========================================================
-- 5. RLS for task_list_members
-- =========================================================
CREATE POLICY "View memberships of accessible lists" ON public.task_list_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_list_owner(list_id, auth.uid()));

CREATE POLICY "Owner can add members" ON public.task_list_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_list_owner(list_id, auth.uid()));

CREATE POLICY "Owner removes any, members remove self" ON public.task_list_members
  FOR DELETE TO authenticated
  USING (public.is_list_owner(list_id, auth.uid()) OR user_id = auth.uid());

-- =========================================================
-- 6. INVITES
-- =========================================================
CREATE TABLE public.task_list_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.task_lists(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24),'hex'),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_list_invites ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_invite_email ON public.task_list_invites(invited_email);
CREATE INDEX idx_invite_token ON public.task_list_invites(token);

CREATE POLICY "Owner views own invites" ON public.task_list_invites
  FOR SELECT TO authenticated
  USING (public.is_list_owner(list_id, auth.uid()));

CREATE POLICY "Owner creates invites" ON public.task_list_invites
  FOR INSERT TO authenticated
  WITH CHECK (public.is_list_owner(list_id, auth.uid()) AND invited_by = auth.uid());

CREATE POLICY "Owner revokes invites" ON public.task_list_invites
  FOR UPDATE TO authenticated
  USING (public.is_list_owner(list_id, auth.uid()));

CREATE POLICY "Owner deletes invites" ON public.task_list_invites
  FOR DELETE TO authenticated
  USING (public.is_list_owner(list_id, auth.uid()));

-- =========================================================
-- 7. ACTIVITY FEED
-- =========================================================
CREATE TABLE public.task_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.task_lists(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,
  action text NOT NULL,
  task_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_activity_list ON public.task_activity(list_id, created_at DESC);

CREATE POLICY "Members view activity" ON public.task_activity
  FOR SELECT TO authenticated
  USING (public.is_list_member(list_id, auth.uid()));

CREATE POLICY "Members log activity" ON public.task_activity
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() AND public.is_list_member(list_id, auth.uid()));

-- =========================================================
-- 8. EXTEND TASKS TABLE
-- =========================================================
ALTER TABLE public.tasks
  ADD COLUMN list_id uuid REFERENCES public.task_lists(id) ON DELETE CASCADE,
  ADD COLUMN starred boolean NOT NULL DEFAULT false,
  ADD COLUMN position integer NOT NULL DEFAULT 0,
  ADD COLUMN due_date date,
  ADD COLUMN assigned_to uuid,
  ADD COLUMN completed_by uuid;

ALTER TABLE public.tasks ALTER COLUMN date DROP NOT NULL;

CREATE INDEX idx_tasks_list ON public.tasks(list_id);
CREATE INDEX idx_tasks_due ON public.tasks(due_date);

-- Backfill: create an "Inbox" list per user with existing tasks, copy date->due_date
DO $$
DECLARE
  u record;
  inbox_id uuid;
BEGIN
  FOR u IN SELECT DISTINCT user_id FROM public.tasks WHERE list_id IS NULL LOOP
    INSERT INTO public.task_lists (owner_id, name, color, position)
    VALUES (u.user_id, 'Inbox', '#a78bfa', 0)
    RETURNING id INTO inbox_id;

    UPDATE public.tasks
       SET list_id = inbox_id,
           due_date = COALESCE(due_date, date)
     WHERE user_id = u.user_id AND list_id IS NULL;
  END LOOP;
END$$;

-- =========================================================
-- 9. RLS REWRITE FOR TASKS (support shared lists)
-- =========================================================
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;

CREATE POLICY "View tasks in accessible lists" ON public.tasks
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (list_id IS NOT NULL AND public.is_list_member(list_id, auth.uid()))
  );

CREATE POLICY "Insert tasks in accessible lists" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (list_id IS NULL OR public.is_list_member(list_id, auth.uid()))
  );

CREATE POLICY "Update tasks in accessible lists" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR (list_id IS NOT NULL AND public.is_list_member(list_id, auth.uid()))
  );

CREATE POLICY "Delete tasks in accessible lists" ON public.tasks
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR (list_id IS NOT NULL AND public.is_list_owner(list_id, auth.uid()))
  );

-- =========================================================
-- 10. PUSH SUBSCRIPTIONS
-- =========================================================
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  device_label text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_push_user ON public.push_subscriptions(user_id);

CREATE POLICY "Users view own subs" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own subs" ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own subs" ON public.push_subscriptions
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own subs" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- =========================================================
-- 11. MONTHLY INSIGHTS (AI summaries cache)
-- =========================================================
CREATE TABLE public.monthly_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month text NOT NULL,
  summary text NOT NULL,
  bullets jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, month)
);

ALTER TABLE public.monthly_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own insights" ON public.monthly_insights
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own insights" ON public.monthly_insights
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own insights" ON public.monthly_insights
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own insights" ON public.monthly_insights
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- =========================================================
-- 12. updated_at trigger for task_lists
-- =========================================================
CREATE TRIGGER task_lists_set_updated_at
BEFORE UPDATE ON public.task_lists
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 13. REALTIME for collaborative tables
-- =========================================================
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.task_lists REPLICA IDENTITY FULL;
ALTER TABLE public.task_activity REPLICA IDENTITY FULL;
ALTER TABLE public.task_list_members REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_lists;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_activity;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_list_members;
