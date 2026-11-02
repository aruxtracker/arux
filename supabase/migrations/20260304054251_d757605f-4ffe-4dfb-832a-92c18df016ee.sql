
ALTER TABLE public.dream_bucket 
  ADD COLUMN category text DEFAULT 'general',
  ADD COLUMN tags text[] DEFAULT '{}',
  ADD COLUMN priority boolean DEFAULT false;
