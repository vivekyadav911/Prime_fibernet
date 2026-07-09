# Payment System Audit — 6 Jul 2026

## Migrations applied (relevant)

- `payment_gateways_admin_rls_restore` — applied
- `payment_receipt_exports_fix` — applied
- `portal_payment_id` column — **NOT YET** (pending Phase 1)

## 1. payment_gateways policies

| policyname | cmd | qual |
|---|---|---|
| payment_gateways_admin | ALL | is_admin_user() OR is_admin() |
| payment_gateways_customer_read_metadata | SELECT | is_active = true |

RLS enabled: **yes**

## 2. payment_gateways GRANTs

**authenticated role has NO table-level GRANT** — only `postgres` and `service_role`. This explains admin "permission denied for table payment_gateways" on embedded joins.

## 3. Recent invoices

| invoice_number | status | total_amount | paid_at | user_id |
|---|---|---|---|---|
| INV-2026-0008 | unpaid | 588.82 | null | Dev Customer (11111111-...) |
| INV-2026-0007 | unpaid | 500.00 | null | karan singh |
| ... | unpaid | ... | null | ... |

All 8 invoices show `status = unpaid` despite confirmed portal payments existing.

## 4. payments table columns

Standard portal schema: `status` (payment_status enum), `gateway_order_id`, `gateway_payment_id`, `paid_at`, `confirmed_at`, `billing_period_start`, etc. No `razorpay_orders` table.

## 5. Storage buckets

| id | public |
|---|---|
| invoices | false |
| exports | false |
| documents | **does not exist** |

## 6. Outstanding balance RPC/view

No `customer_outstanding_balance` view or `get_customer_outstanding` function. Outstanding derived client-side + `users.outstanding_amount`.

## 7. general_settings

| company_name | company_email | smtp_user |
|---|---|---|
| Prime Fibernet | info@primefiber.net | null |

smtp_user null → send-invoice falls back to `billing@primefiber.net` (no display name). Dizitel branding likely from Resend domain config in production.

## 8. Dev Customer payments (latest)

| payment_number | status | total_amount | confirmed_at |
|---|---|---|---|
| PAY-2026-000038 | confirmed | 499.00 | 2026-07-06 |
| PAY-2026-000031 | confirmed | 499.00 | 2026-07-05 |
| (several) | failed/cancelled | 499.00 | — |

INV-2026-0008 (₹588.82 GST invoice) not linked to any confirmed payment.

---

**AUDIT COMPLETE**
