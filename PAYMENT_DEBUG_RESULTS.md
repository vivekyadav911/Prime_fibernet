# Payment System Diagnostic Results — 10 Jul 2026

Run against linked Supabase project via MCP `execute_sql` / `list_edge_functions`.

---

## DIAGNOSTIC 1: Storage buckets

```sql
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('documents', 'receipts', 'invoices', 'files', 'assets', 'exports');
```

**Result:**

| id | name | public | file_size_limit | allowed_mime_types |
|---|---|---|---|---|
| invoices | invoices | false | 10485760 | application/pdf |
| exports | exports | false | 52428800 | application/pdf, application/vnd...xlsx, text/html, text/html; charset=utf-8 |

**Finding:** `documents` and `receipts` buckets **do not exist**. Receipts use the **`exports`** bucket (`receipt_{payment_number}.html`). Invoices use **`invoices`** bucket.

---

## DIAGNOSTIC 2: Receipt files in storage

```sql
SELECT name, bucket_id, created_at
FROM storage.objects
WHERE bucket_id IN ('documents', 'receipts', 'invoices', 'exports')
  AND (name ILIKE '%receipt%' OR name ILIKE '%payment%')
ORDER BY created_at DESC LIMIT 20;
```

**Result:** `[]` (zero rows)

**Finding:** No receipt HTML files in storage for recent UPI payments. `payment_receipts` rows exist for older cash/card payments but `pdf_url` is null. Receipt generation has not run successfully for confirmed online payments (or files were never uploaded).

---

## DIAGNOSTIC 3: Payments table structure

Original query failed: `invoice_number` column does not exist.

**Actual key columns:**

| column | type |
|---|---|
| id | uuid |
| payment_number | text |
| status | payment_status enum |
| amount / total_amount | numeric |
| method | enum |
| gateway_order_id | text |
| gateway_payment_id | text |
| customer_id | uuid |
| receipt_number | text |
| paid_at / confirmed_at | timestamptz |

**Recent payments (top 10):**

| payment_number | status | amount | gateway_order_id | gateway_payment_id |
|---|---|---|---|---|
| PAY-2026-000044 | initiated | 449 | order_TBEE2MxdTO1agn | null |
| PAY-2026-000043 | failed | 449 | order_TBCzQhMqBzhZLM | null |
| PAY-2026-000040 | **confirmed** | 100 | order_TA6PzohXtFj5qR | pay_TA6QNktftXZYFL |
| PAY-2026-000039 | confirmed | 250 | ... | pay_... |
| PAY-2026-000038 | confirmed | 499 | ... | pay_... |
| PAY-2026-000037 | failed | 499 | dev_razorpay_... | null |

---

## DIAGNOSTIC 4: Payment status distribution

```sql
SELECT status, COUNT(*) as count, SUM(total_amount) as total FROM payments GROUP BY status ORDER BY count DESC;
```

| status | count | total (INR) |
|---|---|---|
| failed | 20 | 9,671.02 |
| confirmed | 9 | 6,848.00 |
| cancelled | 2 | 998.00 |
| initiated | 1 | 449.00 |
| refunded | 1 | 500.00 |
| pending_review | 1 | 100.00 |

**Finding:** 20 failures confirmed. 1 stuck `initiated` (PAY-000044). No `paid` status — app uses `confirmed`.

---

## DIAGNOSTIC 5: Outstanding balance

`get_customer_outstanding` RPC: **does not exist**.

Outstanding is stored on `users.outstanding_amount` (denormalized column).

```sql
SELECT COUNT(*) FROM users WHERE role = 'customer' AND outstanding_amount > 0;
```

**Result:** `0`

All customers (including 16 "Vivek" matches) have `outstanding_amount = 0.00`.

---

## DIAGNOSTIC 6: Collection assignments — customers with outstanding > 0

Adapted query (schema uses `users`, not `customers`):

**Result:** 0 customers with outstanding > 0

**Finding:** "Due for collection" view correctly shows empty. Search for "vivek" returns nothing because default filters require `outstanding_amount > 0` AND `dueForCollectionOnly`.

---

## DIAGNOSTIC 7: Razorpay orders

`razorpay_orders` table: **does not exist**.

Orders are stored on `payments.gateway_order_id`. Stuck initiated:

| payment_number | status | amount | gateway_order_id | created_at |
|---|---|---|---|---|
| PAY-2026-000044 | initiated | 449 | order_TBEE2MxdTO1agn | 2026-07-09 |

Many failures use `dev_razorpay_{payment_id}` order IDs (dev/sandbox checkout).

---

## DIAGNOSTIC 8: Edge functions

| Function | Status | Notes |
|---|---|---|
| generate-payment-receipt | ACTIVE | Not `generate-receipt` |
| verify-payment | ACTIVE | Poll + signature verify |
| create-payment-order | ACTIVE | Has 30-min order reuse + stale expiry |
| razorpay-webhook | ACTIVE | verify_jwt: false |
| payment-webhook | ACTIVE | Legacy handler |
| resolve-stale-payments | **DEPLOYED** (v1 via CLI) | verify_jwt: false |

**pg_cron:** Not enabled on project — cron schedule for resolve-stale-payments not applied. Invoke manually or enable pg_cron later.

---

## DIAGNOSTIC 9: Storage RLS (exports + invoices)

**exports policies:**
- `exports_admin` — ALL for `is_admin_user()`
- `exports_customer_receipts_read` — SELECT for customer's own `receipt_*.html`

**invoices policies:** admin + customer read by user folder

**Finding:** No `documents` bucket policies needed. Service role bypasses RLS for edge function uploads.

---

## DIAGNOSTIC 10: Collection tables

| table | exists |
|---|---|
| collection_assignments | **No** |
| collection_assignment_events | Yes |
| inventory_assignments | Yes (unrelated) |

Collection assignments use `users` table fields: `assigned_officer_id`, `collection_status`, `outstanding_amount`, etc.

---

## DIAGNOSTIC 11: Pending amount KPI (app logic)

`pendingSum` in `paymentCollectionApi` counts only `pending_review` + `cash_collected` — **not** `initiated`.

Current pending_review total: **₹100** (1 payment) — matches screenshot.

---

## Root causes confirmed

| Issue | Root cause | Fix |
|---|---|---|
| Receipt download fails | Admin `PaymentDetailScreen` shows Alert with receipt number but **never opens URL**; no receipt files in storage yet | Open `Linking.openURL(result.url)`; ensure generate-payment-receipt runs |
| Collection "No customers match" for vivek | All customers have ₹0 outstanding; default filter `dueForCollectionOnly` + `outstandingOnly` | Bypass outstanding filter when searching; improve empty state |
| 0 due for collection | Correct — 0 customers with outstanding > 0 | No data fix needed |
| 20 failed payments | Mix of dev checkout (`dev_razorpay_*`) and abandoned UPI attempts | Existing idempotency in create-payment-order; add stale resolver |
| PAY-000044 stuck initiated | No webhook/poll resolved it; stale expiry only runs on new checkout | Add admin "Check status" + `resolve-stale-payments` cron |
| ₹100 pending amount | `pending_review` payment (legitimate) | No fix — not counting initiated |
