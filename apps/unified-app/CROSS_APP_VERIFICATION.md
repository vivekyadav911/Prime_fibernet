# Cross-App Verification Checklist

Manual QA for customer ↔ admin ↔ officer flows after the customer portal upgrade.

## Prerequisites

- Customer test account linked via `users.auth_user_id`
- Admin account with `plans.edit` and ticket portal access
- Officer account assignable to tickets
- Easebuzz gateway enabled in admin settings (sandbox OK)
- Expo app running on device/simulator for push (optional)

---

## 1. Plans — active catalog only

| Step | Role | Action | Expected |
|------|------|--------|----------|
| 1.1 | Admin | Deactivate a plan in **Plans** | Plan shows inactive |
| 1.2 | Customer | Open **Plans** tab | Deactivated plan **not** listed |
| 1.3 | Customer | Pull to refresh | Still hidden (`plansApi` filters `is_active = true`) |

**Code:** `apps/unified-app/src/services/api/plansApi.ts` → `.eq('is_active', true)`

---

## 2. Plan change — customer submit → admin approve

| Step | Role | Action | Expected |
|------|------|--------|----------|
| 2.1 | Customer | Plans → select different plan → confirm change | Success toast; request `pending` |
| 2.2 | Admin | Plans → **Requests** | Request visible with customer name, from/to plans |
| 2.3 | Admin | **Approve** | Status `approved`; active `subscriptions` row updated |
| 2.4 | Customer | Plans / Home | New plan reflected after refresh |
| 2.5 | Customer | Notifications | Portal notification “Plan change approved” |

**Reject path:** Admin rejects → customer sees decline notification; subscription unchanged.

**Code paths:**
- Customer: `customerPlansApi.submitPlanChangeRequest` (RPC `current_customer_user_id`)
- Admin: `adminPlanChangesApi` → `PlanChangeRequestsScreen`

---

## 3. Tickets — create → admin portal → officer → customer timeline

| Step | Role | Action | Expected |
|------|------|--------|----------|
| 3.1 | Customer | Support → New ticket (category required) | Ticket created |
| 3.2 | Admin | Ticket Portal | Ticket in list |
| 3.3 | Admin | Assign officer | Officer sees request |
| 3.4 | Officer | Update status / add note | Activity recorded |
| 3.5 | Customer | Ticket detail | Timeline updates (realtime or refresh) |
| 3.6 | Customer | Notifications | In-app portal notification for updates |

**Code paths:**
- `customerTicketsApi` + `ticket_activity_events`
- Admin: `TicketPortalScreen` / `useTicketPortal`
- Officer: `OfficerRequestsScreen`
- Realtime: `useCustomerTicketRealtime`, `useRealtimeCustomer`

---

## 4. Payments — Easebuzz → confirmed → admin Finance

| Step | Role | Action | Expected |
|------|------|--------|----------|
| 4.1 | Customer | Bill & Pay → **Pay Now** | Easebuzz WebView opens |
| 4.2 | Customer | Complete sandbox payment | Redirect to `PaymentResult` |
| 4.3 | DB | `payments.status` | `confirmed` (not `paid`) |
| 4.4 | DB | `users.outstanding_amount` | Reduced by payment amount |
| 4.5 | Admin | Finance → Payments | Row shows gateway slug (e.g. `easebuzz`) |
| 4.6 | Customer | Bill screen | Lower outstanding / updated last paid |

**Trigger:** `on_payment_confirmed()` in `20260618100000_payment_collection_portal.sql` updates `users` when status becomes `confirmed`.

**Edge function:** `verify-payment` sets `status = 'confirmed'` and `paid_at`.

---

## 5. Account ID consistency

| Surface | Expected source |
|---------|-----------------|
| Profile | `formatCustomerAccountId(users.customer_id)` |
| Bill screen | Same via `getCustomerBill` |
| Admin plan requests | Same formatter on request cards |

No `ACC-` prefix unless `customer_id` column is empty (falls back to UUID).

---

## 6. Regression smoke

- [ ] Customer login / role routing
- [ ] Admin drawer: Plans, Ticket Portal, Finance load without error
- [ ] Officer attendance + assigned tickets load
- [ ] `npm test` — `customerAccount`, `crossAppConsistency` pass
- [ ] Typecheck clean in `apps/unified-app`

---

## Optional: push for ticket updates

Configure Supabase Database Webhook on `ticket_activity_events` INSERT → `notify-ticket-update` edge function for Expo push. In-app notifications work without this via DB trigger → `portal_notifications`.
