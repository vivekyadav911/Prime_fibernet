-- Extend plans table for admin Plans Management module (non-destructive)

ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS display_name TEXT DEFAULT '';
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS data_limit TEXT DEFAULT 'Unlimited';
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS router_type TEXT DEFAULT '';
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS plan_tag TEXT DEFAULT '';
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'standard';
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS subscriber_count INTEGER DEFAULT 0;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT '';
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Backfill display_name from name where empty
UPDATE public.plans SET display_name = name WHERE display_name IS NULL OR display_name = '';

-- Backfill subscriber_count from active subscriptions
UPDATE public.plans p SET subscriber_count = (
  SELECT COUNT(*)::INTEGER FROM public.subscriptions s
  WHERE s.plan_id = p.id AND s.status = 'active'
);

-- Enable realtime for plans table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'plans'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.plans;
  END IF;
END $$;
