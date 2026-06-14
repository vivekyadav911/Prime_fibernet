-- Inventory management module: extended schema, history audit, RLS

-- ---------------------------------------------------------------------------
-- inventory_categories extensions
-- ---------------------------------------------------------------------------
ALTER TABLE public.inventory_categories
  ADD COLUMN IF NOT EXISTS icon_name TEXT DEFAULT 'cube-outline',
  ADD COLUMN IF NOT EXISTS icon_color TEXT DEFAULT '#3B82F6',
  ADD COLUMN IF NOT EXISTS icon_bg_color TEXT DEFAULT '#EFF6FF',
  ADD COLUMN IF NOT EXISTS item_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ---------------------------------------------------------------------------
-- inventory_items extensions
-- ---------------------------------------------------------------------------
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_name TEXT DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS brand TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS model TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS location TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS total_quantity INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS available_quantity INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assigned_quantity INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS damaged_quantity INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sold_quantity INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_value NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS stock_status TEXT DEFAULT 'in_stock',
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Legacy quantity column (phase2 foundation)
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;

-- Backfill from legacy columns
UPDATE public.inventory_items
SET
  total_quantity = COALESCE(NULLIF(total_quantity, 0), quantity, 0),
  available_quantity = CASE
    WHEN available_quantity IS NOT NULL AND available_quantity > 0 THEN available_quantity
    ELSE GREATEST(0, COALESCE(NULLIF(total_quantity, 0), quantity, 0) - COALESCE(assigned_quantity, 0))
  END,
  category_name = COALESCE(NULLIF(category_name, ''), NULLIF(category, ''), 'General'),
  assigned_quantity = COALESCE(assigned_quantity, 0),
  damaged_quantity = COALESCE(damaged_quantity, 0),
  sold_quantity = COALESCE(sold_quantity, 0),
  low_stock_threshold = COALESCE(low_stock_threshold, 5),
  unit_cost = COALESCE(unit_cost, 0),
  total_value = COALESCE(available_quantity, 0) * COALESCE(unit_cost, 0),
  stock_status = CASE
    WHEN COALESCE(available_quantity, 0) <= 0 THEN 'out_of_stock'
    WHEN COALESCE(available_quantity, 0) <= COALESCE(low_stock_threshold, 5) THEN 'low_stock'
    ELSE 'in_stock'
  END,
  status = CASE
    WHEN status IN ('active', 'inactive') THEN status
    WHEN status = 'available' THEN 'active'
    ELSE 'active'
  END,
  updated_at = COALESCE(updated_at, created_at, NOW())
WHERE TRUE;

-- Link category_id from category_name where possible
UPDATE public.inventory_items ii
SET category_id = ic.id
FROM public.inventory_categories ic
WHERE ii.category_id IS NULL
  AND LOWER(TRIM(ii.category_name)) = LOWER(TRIM(ic.name));

-- Create missing categories from legacy category text
INSERT INTO public.inventory_categories (name, description)
SELECT DISTINCT TRIM(ii.category_name), ''
FROM public.inventory_items ii
WHERE ii.category_name IS NOT NULL
  AND TRIM(ii.category_name) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.inventory_categories ic
    WHERE LOWER(TRIM(ic.name)) = LOWER(TRIM(ii.category_name))
  );

UPDATE public.inventory_items ii
SET category_id = ic.id
FROM public.inventory_categories ic
WHERE ii.category_id IS NULL
  AND LOWER(TRIM(ii.category_name)) = LOWER(TRIM(ic.name));

-- Refresh category item counts
UPDATE public.inventory_categories ic
SET item_count = (
  SELECT COUNT(*)::INTEGER FROM public.inventory_items ii WHERE ii.category_id = ic.id
);

-- ---------------------------------------------------------------------------
-- inventory_history (audit log)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  item_name TEXT,
  item_sku TEXT,
  action_type TEXT NOT NULL,
  quantity_delta INTEGER NOT NULL DEFAULT 0,
  quantity_before INTEGER NOT NULL DEFAULT 0,
  quantity_after INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  performed_by TEXT DEFAULT 'System',
  performed_by_uid UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_history_item_id ON public.inventory_history(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_history_created_at ON public.inventory_history(created_at DESC);

-- ---------------------------------------------------------------------------
-- inventory_requests (officer assignment requests — used by app APIs)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id UUID,
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_requests_status ON public.inventory_requests(status);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.inventory_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_history_admin ON public.inventory_history;
CREATE POLICY inventory_history_admin ON public.inventory_history
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS inventory_requests_admin ON public.inventory_requests;
CREATE POLICY inventory_requests_admin ON public.inventory_requests
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS inventory_requests_officer_insert ON public.inventory_requests;
CREATE POLICY inventory_requests_officer_insert ON public.inventory_requests
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR officer_id IN (
      SELECT id FROM public.officers
      WHERE user_id = auth.uid() OR auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS inventory_requests_officer_read ON public.inventory_requests;
CREATE POLICY inventory_requests_officer_read ON public.inventory_requests
  FOR SELECT USING (
    public.is_admin()
    OR officer_id IN (
      SELECT id FROM public.officers
      WHERE user_id = auth.uid() OR auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS inventory_items_admin_write ON public.inventory_items;
CREATE POLICY inventory_items_admin_write ON public.inventory_items
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS inventory_categories_admin ON public.inventory_categories;
CREATE POLICY inventory_categories_admin ON public.inventory_categories
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS inventory_categories_read ON public.inventory_categories;
CREATE POLICY inventory_categories_read ON public.inventory_categories
  FOR SELECT USING (true);
