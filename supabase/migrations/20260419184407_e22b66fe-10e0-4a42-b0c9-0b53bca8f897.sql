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