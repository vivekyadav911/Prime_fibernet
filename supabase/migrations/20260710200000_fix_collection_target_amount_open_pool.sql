-- Drop ambiguous 2-arg bulk_assign overload; backfill collection_target_amount from assignment events.

DROP FUNCTION IF EXISTS public.bulk_assign_collection_officer(uuid[], uuid);

-- ponytail: repair rows where event log recorded an amount but open-pool bug cleared the column
UPDATE public.users u
SET
  collection_target_amount = sub.amount,
  updated_at = NOW()
FROM (
  SELECT DISTINCT ON (e.customer_id)
    e.customer_id,
    (regexp_match(e.notes, 'Collection target set to ₹([0-9.]+)'))[1]::numeric AS amount
  FROM public.collection_assignment_events e
  WHERE e.notes LIKE 'Collection target set to ₹%'
  ORDER BY e.customer_id, e.created_at DESC
) sub
WHERE u.id = sub.customer_id
  AND (u.collection_target_amount IS NULL OR u.collection_target_amount <= 0)
  AND sub.amount IS NOT NULL
  AND sub.amount > 0;
