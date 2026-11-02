DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='task_list_members_list_user_unique') THEN
    ALTER TABLE public.task_list_members ADD CONSTRAINT task_list_members_list_user_unique UNIQUE (list_id, user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='monthly_insights_user_month_unique') THEN
    ALTER TABLE public.monthly_insights ADD CONSTRAINT monthly_insights_user_month_unique UNIQUE (user_id, month);
  END IF;
END $$;