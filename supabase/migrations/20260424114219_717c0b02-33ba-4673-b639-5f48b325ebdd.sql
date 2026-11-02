
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
