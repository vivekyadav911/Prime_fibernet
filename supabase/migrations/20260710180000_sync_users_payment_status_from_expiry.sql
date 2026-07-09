-- Sync denormalized users.payment_status from account state (expiry, blocked, outstanding).

UPDATE public.users
SET payment_status = 'suspended', updated_at = NOW()
WHERE role = 'customer'
  AND is_blocked = TRUE
  AND payment_status IS DISTINCT FROM 'suspended';

UPDATE public.users
SET payment_status = 'paid', updated_at = NOW()
WHERE role = 'customer'
  AND is_blocked = FALSE
  AND expiry_date IS NOT NULL
  AND expiry_date::date >= CURRENT_DATE
  AND payment_status IS DISTINCT FROM 'paid';

UPDATE public.users
SET payment_status = 'overdue', updated_at = NOW()
WHERE role = 'customer'
  AND is_blocked = FALSE
  AND (
    COALESCE(outstanding_amount, 0) > 0
    OR (expiry_date IS NOT NULL AND expiry_date::date < CURRENT_DATE)
  )
  AND payment_status IS DISTINCT FROM 'overdue';
