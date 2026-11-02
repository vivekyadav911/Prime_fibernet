# Payments and Collections Runbook

Developer-facing reference for the current payments, invoices, gateway, and
field-collection implementation.

Last source review: Nov 2026.

## Source map

| Area | Primary codepaths |
|------|-------------------|
| Customer plan checkout | `apps/unified-app/src/screens/customer/checkout/CheckoutScreen.tsx`, `apps/unified-app/src/services/api/paymentsApi.ts` |
| Admin/officer payment ledger | `apps/unified-app/src/services/api/paymentCollectionApi.ts`, `apps/unified-app/src/types/payments.ts` |
| Admin collection board | `apps/unified-app/src/screens/admin/payments/CollectionAssignmentsScreen.tsx`, `apps/unified-app/src/services/api/collectionAssignmentsApi.ts` |
| Officer collections | `apps/unified-app/src/screens/officer/payments/`, `apps/unified-app/src/hooks/usePayments.ts` |
| Edge functions | `supabase/functions/create-payment-order/`, `verify-payment/`, `payment-webhook/`, `resolve-stale-payments/`, `generate-payment-receipt/`, `export-payments/`, `send-invoice/`, `save-gateway-credentials/` |
| Database rules and RPCs | `supabase/migrations/*collection*`, `supabase/migrations/*payment*` |

Historical files `PAYMENT_AUDIT.md` and `PAYMENT_DEBUG_RESULTS.md` are useful
incident notes. Treat this runbook as the current architecture guide.

## Data model

The live ledger is the `payments` table. `user_payments` is still referenced by
the deprecated `paymentsApi` endpoints for legacy screens, but new admin,
customer bill, officer, invoice, export, and collection flows use `payments`.

Key related records:

- `payment_gateways`: active/default gateway selection and encrypted gateway
  credentials.
- `invoices`: GST/non-GST invoice rows, optionally linked by
  `portal_payment_id`.
- `users`: customer collection state (`outstanding_amount`,
  `payment_status`, `assigned_officer_id`, `claimed_by_officer_id`,
  `collection_status`, `collection_target_amount`, `next_due_date`).
- `collection_assignment_events`: assignment, claim, and payment audit trail.
- `bank_accounts`: active UPI VPA options used by officer QR/manual UPI
  collection.

Payment statuses are defined in `apps/unified-app/src/types/payments.ts`:

| Status | Meaning |
|--------|---------|
| `initiated` | Online gateway order was created and checkout is not yet resolved. |
| `pending_review` | Payment evidence exists but an admin must verify it. Common for officer UPI/manual collection and non-self-serve gateway callbacks. |
| `cash_collected` | Office/admin-side cash state awaiting final confirmation. |
| `confirmed` | Payment is accepted, counted as collected revenue, and may finalize customer collection state. |
| `failed` | Gateway or stale-check failure. |
| `cancelled` | Admin rejected the payment or it was superseded by another successful payment. |
| `refunded` | Refund flow has marked the payment refunded. |

## Online checkout flow

1. The client calls `create-payment-order`.
   - Plan purchases pass `intent: "plan"` and are priced from `plans.price`
     when a plan id is present.
   - Bill/retry/advance payments derive the amount from customer outstanding
     balance, current subscription, or a recent open payment.
   - Custom payments must be between INR 1 and INR 50,000.
2. `create-payment-order` loads the active default row from `payment_gateways`.
3. The function expires older `initiated` rows for that customer, then reuses a
   matching non-dev order created in the last 30 minutes.
4. If no reusable order exists, it inserts a `payments` row with
   `status = initiated`, creates the gateway order through the adapter, stores
   `gateway_order_id`, and returns checkout details.
5. The client opens Razorpay native checkout when the gateway resolves to
   Razorpay. Otherwise it can navigate to the hosted gateway screen.
6. On success, the client calls `verify-payment` with the payment id, order id,
   gateway, and Razorpay signature/payment id.
7. Gateway webhooks hit `payment-webhook?gateway=<slug>`:
   - `online_app` and `online_web` callbacks become `confirmed`.
   - Other channels become `pending_review`.
   - Failed gateway callbacks become `failed`.

`verify-payment` also performs the business-side confirmation work for portal
payments: set the payment `confirmed`, cancel duplicate open rows for the same
billing period, activate the selected plan, create or mark invoices paid when
auto-invoice is enabled, and notify the customer.

### Gateway setup

Use the admin gateway settings UI or `save-gateway-credentials`; do not edit
credential JSON by hand.

- The function requires an authenticated admin (`is_admin_user`).
- Secret credential fields are encrypted before storage and masked in the
  response.
- Test-only calls use the adapter's `testConnection` and do not persist.
- Successful saves return the webhook URL:
  `<SUPABASE_URL>/functions/v1/payment-webhook?gateway=<slug>`.

Supported adapters are `razorpay`, `easebuzz`, `payu`, `cashfree`, and `paytm`.
Razorpay supports order creation, webhook verification, signature verification,
captured-payment polling, and connection tests. If Razorpay credentials are
missing, the adapter returns a `dev_razorpay_<paymentId>` order id; production
environments should not rely on those dev ids.

## Stale initiated payments

`resolve-stale-payments` checks up to 50 non-dev `initiated` payments older than
15 minutes. For Razorpay orders it attempts to fetch a captured payment:

- captured payment found: invokes `verify-payment` in poll mode.
- no captured payment: marks the row `failed` with
  `Payment not completed - checkout expired`.

This function is not a replacement for webhooks. Use it as a scheduled or manual
repair path for missed callbacks and abandoned checkouts.

## Officer and admin collections

### Assignment board

Admins use `CollectionAssignmentsScreen`, backed by
`collectionAssignmentsApi`.

- Upcoming list: active customers that are overdue or expiring within
  `COLLECTION_UPCOMING_HORIZON_DAYS` (30 days), excluding suspended customers.
- Due-for-collection list: customers with `collection_status` in
  `open`, `assigned`, or `claimed`.
- Bulk/single assignment calls `bulk_assign_collection_officer`.
- Passing a null officer releases customers to the open pool.
- Optional collection target amount must be greater than zero.
- Search disables the default queue narrowing so support/admins can find a
  specific account even when it is not currently due.

The app also inserts an officer portal notification after successful assignment.

### Officer queue and open pool

Officers read `get_officer_collectible_customers`, which returns:

- customers assigned to the current officer,
- customers claimed by the current officer, and
- open-pool customers with no assigned/claimed officer, `collection_status =
  open`, not suspended, and either a positive resolved collection amount or an
  overdue payment status.

`claim_collection_customer` self-assigns an open-pool customer. It rejects
customers already assigned to a different officer or not currently in the open
pool.

### Recording payment in the field

There are two officer entry points:

- Assigned customer "Collect": `CashCollectionScreen`.
- General "Record payment": `OfficerRecordPaymentForm`.

Both end in the `payments` ledger:

- cash/netbanking from `CashCollectionScreen` uses `recordCashCollection`, which
  inserts an `officer_cash` payment with `pending_review` and optional GPS/photo
  evidence.
- UPI QR/manual and the general form use `record_manual_payment`.
- Non-cash manual payments require a reference/UTR.
- QR UPI requires a reference/UTR and may include a `bank_account_id`.
- Officer-originated manual payments always stay `pending_review` until admin
  confirmation.

Admin confirmation uses `confirmPaymentV2`. For `officer_cash` and
`office_cash`, confirmation calls `finalize_officer_collection`, which:

- verifies the officer was authorized for the customer,
- decreases `users.outstanding_amount`,
- marks collection `collected` when outstanding reaches zero,
- clears `collection_target_amount` when fully collected,
- records collection assignment history, and
- notifies admins.

Admin rejection uses `rejectPaymentV2`, setting `status = cancelled` with review
and failure notes.

## Invoices, receipts, and exports

- `send-invoice` sends existing invoices by email or WhatsApp. If an invoice has
  no signed PDF URL yet, it invokes `invoice-generator`.
- Email requires `RESEND_API_KEY`; WhatsApp requires enabled OpenWA settings and
  `OPENWA_API_MASTER_KEY`.
- `generate-payment-receipt` authorizes admin, owning customer, or collecting
  officer access, renders receipt HTML, stores it in the private `exports`
  bucket as `receipt_<payment_number>.html`, and returns a signed URL.
- `export-payments` is admin-only. It keyset-paginates the `payments` table in
  stable `(created_at, id)` order, caps exports at 100,000 rows, writes XLSX to
  the `exports` bucket, and returns a signed URL. `format: "pdf"` currently
  returns an HTML report instead of a binary PDF.

## Troubleshooting checklist

### Checkout cannot start

1. Confirm there is an active default row in `payment_gateways`.
2. Check whether the client amount differs from the server-derived amount by
   more than INR 1.
3. For custom payments, confirm the amount is in the INR 1-50,000 range.
4. If a `dev_razorpay_` order id appears outside local/dev testing, gateway
   credentials are incomplete.

### Payment stuck in `initiated`

1. Search by `payments.gateway_order_id`.
2. Confirm the gateway webhook URL includes `?gateway=<slug>`.
3. For Razorpay, run or schedule `resolve-stale-payments` to poll captured
   payments older than 15 minutes.
4. If a matching confirmed payment exists for the same billing period, expect
   open initiated/pending rows to be cancelled by verification.

### Officer cannot collect from a customer

1. Check `users.assigned_officer_id`, `claimed_by_officer_id`, and
   `collection_status`.
2. Open-pool customers must be unassigned/unclaimed, `collection_status = open`,
   not suspended, and have positive resolved collection amount or overdue
   status.
3. For direct cash/netbanking collection, the officer must be assigned, claimed,
   or the customer must still be unassigned/unclaimed.

### Receipts or exports fail

1. Confirm the caller is admin, the owning customer, or the collecting officer.
2. Confirm the `exports` storage bucket exists and accepts the content type.
3. For receipts, only `confirmed` payments generate receipt URLs.
4. For exports, confirm the caller's JWT can run `is_admin_user`.
