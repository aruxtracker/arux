-- Grooming tracker (haircut, beard, spa, etc.)
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

CREATE INDEX idx_grooming_user_date ON public.grooming_entries(user_id, date DESC);