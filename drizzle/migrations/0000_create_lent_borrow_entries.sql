CREATE TABLE public.lent_borrow_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  direction text NOT NULL DEFAULT 'lent',
  person_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  settled_amount numeric NOT NULL DEFAULT 0,
  lent_or_borrowed_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  notes text,
  settled boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lent_borrow_entries TO authenticated;
GRANT ALL ON public.lent_borrow_entries TO service_role;

ALTER TABLE public.lent_borrow_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own lent and borrow entries"
  ON public.lent_borrow_entries FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lent and borrow entries"
  ON public.lent_borrow_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lent and borrow entries"
  ON public.lent_borrow_entries FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lent and borrow entries"
  ON public.lent_borrow_entries FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX lent_borrow_entries_user_date_idx
  ON public.lent_borrow_entries (user_id, lent_or_borrowed_date DESC);