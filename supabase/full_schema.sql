
-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE USING (auth.uid() = user_id);

-- Incomes table
CREATE TABLE public.incomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  source TEXT NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own incomes" ON public.incomes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own incomes" ON public.incomes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own incomes" ON public.incomes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own incomes" ON public.incomes FOR DELETE USING (auth.uid() = user_id);

-- Expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expenses" ON public.expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expenses" ON public.expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON public.expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON public.expenses FOR DELETE USING (auth.uid() = user_id);

-- Meetings table
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meetings" ON public.meetings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meetings" ON public.meetings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meetings" ON public.meetings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meetings" ON public.meetings FOR DELETE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Savings Goals table
CREATE TABLE public.savings_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  saved_amount NUMERIC NOT NULL DEFAULT 0,
  deadline DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals" ON public.savings_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON public.savings_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON public.savings_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON public.savings_goals FOR DELETE USING (auth.uid() = user_id);

-- Tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.tasks FOR DELETE USING (auth.uid() = user_id);

-- Add category to incomes
ALTER TABLE public.incomes ADD COLUMN category text NOT NULL DEFAULT 'Other';

-- Add new expense categories support (already text, just need app-level changes)

-- Habits table
CREATE TABLE public.habits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '✅',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own habits" ON public.habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habits" ON public.habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habits" ON public.habits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habits" ON public.habits FOR DELETE USING (auth.uid() = user_id);

-- Habit logs (one per habit per day)
CREATE TABLE public.habit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(habit_id, date)
);
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own habit_logs" ON public.habit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habit_logs" ON public.habit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habit_logs" ON public.habit_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habit_logs" ON public.habit_logs FOR DELETE USING (auth.uid() = user_id);

-- Reminders table
CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  date DATE NOT NULL,
  time TIME,
  recurring TEXT DEFAULT NULL,
  notes TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own reminders" ON public.reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reminders" ON public.reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reminders" ON public.reminders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reminders" ON public.reminders FOR DELETE USING (auth.uid() = user_id);

-- Ideas/Idea Vault table
CREATE TABLE public.ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'random',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own ideas" ON public.ideas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ideas" ON public.ideas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ideas" ON public.ideas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ideas" ON public.ideas FOR DELETE USING (auth.uid() = user_id);

-- Mood entries table
CREATE TABLE public.mood_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood INTEGER NOT NULL CHECK (mood >= 1 AND mood <= 5),
  energy INTEGER NOT NULL CHECK (energy >= 1 AND energy <= 5),
  sleep_quality INTEGER NOT NULL CHECK (sleep_quality >= 1 AND sleep_quality <= 5),
  productivity INTEGER NOT NULL CHECK (productivity >= 1 AND productivity <= 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own mood_entries" ON public.mood_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own mood_entries" ON public.mood_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own mood_entries" ON public.mood_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own mood_entries" ON public.mood_entries FOR DELETE USING (auth.uid() = user_id);

-- Dream Bucket table
CREATE TABLE public.dream_bucket (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  product_link TEXT,
  image_url TEXT,
  target_price NUMERIC NOT NULL DEFAULT 0,
  saved_amount NUMERIC NOT NULL DEFAULT 0,
  target_date DATE,
  achieved BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.dream_bucket ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own dream_bucket" ON public.dream_bucket FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own dream_bucket" ON public.dream_bucket FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own dream_bucket" ON public.dream_bucket FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own dream_bucket" ON public.dream_bucket FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.dream_bucket 
  ADD COLUMN category text DEFAULT 'general',
  ADD COLUMN tags text[] DEFAULT '{}',
  ADD COLUMN priority boolean DEFAULT false;
-- Vehicles table
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'car',
  reg_number TEXT,
  image_url TEXT,
  purchase_date DATE,
  current_km NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vehicles" ON public.vehicles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own vehicles" ON public.vehicles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vehicles" ON public.vehicles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own vehicles" ON public.vehicles FOR DELETE USING (auth.uid() = user_id);

-- Vehicle services / reminders
CREATE TABLE public.vehicle_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date DATE,
  due_km NUMERIC,
  completed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicle_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vehicle_services" ON public.vehicle_services FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own vehicle_services" ON public.vehicle_services FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vehicle_services" ON public.vehicle_services FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own vehicle_services" ON public.vehicle_services FOR DELETE USING (auth.uid() = user_id);

-- Vehicle expenses
CREATE TABLE public.vehicle_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL DEFAULT 'Fuel',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  expense_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicle_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vehicle_expenses" ON public.vehicle_expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own vehicle_expenses" ON public.vehicle_expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vehicle_expenses" ON public.vehicle_expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own vehicle_expenses" ON public.vehicle_expenses FOR DELETE USING (auth.uid() = user_id);
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

-- Enable required extensions for cron + http
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Unique constraint so subscribers can upsert by endpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'push_subscriptions_endpoint_unique'
  ) THEN
    ALTER TABLE public.push_subscriptions
      ADD CONSTRAINT push_subscriptions_endpoint_unique UNIQUE (endpoint);
  END IF;
END $$;

-- Index for fast lookup of upcoming reminders
CREATE INDEX IF NOT EXISTS reminders_due_idx
  ON public.reminders (date, time) WHERE completed = false;

CREATE INDEX IF NOT EXISTS vehicle_services_due_idx
  ON public.vehicle_services (due_date) WHERE completed = false;

-- Enable realtime for collaborative tables
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.task_lists REPLICA IDENTITY FULL;
ALTER TABLE public.task_activity REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='tasks') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='task_lists') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_lists;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='task_activity') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_activity;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='task_list_members_list_user_unique') THEN
    ALTER TABLE public.task_list_members ADD CONSTRAINT task_list_members_list_user_unique UNIQUE (list_id, user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='monthly_insights_user_month_unique') THEN
    ALTER TABLE public.monthly_insights ADD CONSTRAINT monthly_insights_user_month_unique UNIQUE (user_id, month);
  END IF;
END $$;-- Grooming tracker (haircut, beard, spa, etc.)
CREATE TABLE public.grooming_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'haircut',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL DEFAULT 0,
  place TEXT,
  next_due DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.grooming_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own grooming"   ON public.grooming_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own grooming" ON public.grooming_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own grooming" ON public.grooming_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own grooming" ON public.grooming_entries FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_grooming_user_date ON public.grooming_entries(user_id, date DESC);ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS priority smallint NOT NULL DEFAULT 0;-- 1. Budget Planner table
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  monthly_limit NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, category)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
GRANT ALL ON public.budgets TO service_role;

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own budgets" ON public.budgets
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Subscription Tracker table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  next_renewal_date DATE,
  category TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own subscriptions" ON public.subscriptions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Subtasks table
CREATE TABLE IF NOT EXISTS public.subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subtasks TO authenticated;
GRANT ALL ON public.subtasks TO service_role;

ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "List members manage subtasks" ON public.subtasks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = subtasks.task_id
      AND public.is_list_member(t.list_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = subtasks.task_id
      AND public.is_list_member(t.list_id, auth.uid())
    )
  );

-- 4. Add recurring column to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recurring TEXT;

-- updated_at triggers for budgets and subscriptions
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[];ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS avatar_preset text;-- Lock down SECURITY DEFINER functions
-- handle_new_user is trigger-only; nobody should call it directly
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- is_list_member / is_list_owner are used inside RLS policies for shared task lists;
-- only signed-in users need them. Remove PUBLIC/anon access.
REVOKE EXECUTE ON FUNCTION public.is_list_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_list_owner(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_list_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_list_owner(uuid, uuid) TO authenticated;CREATE TABLE public.bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bank_name TEXT,
  account_type TEXT NOT NULL DEFAULT 'bank',
  last_four TEXT,
  color TEXT NOT NULL DEFAULT 'ocean',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own bank accounts"
ON public.bank_accounts
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.incomes
ADD COLUMN bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL;

CREATE INDEX bank_accounts_user_id_idx ON public.bank_accounts(user_id);
CREATE INDEX incomes_bank_account_id_idx ON public.incomes(bank_account_id);

CREATE TRIGGER update_bank_accounts_updated_at
BEFORE UPDATE ON public.bank_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();-- =========================================================
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

