# Prime Fibernet — Customer App Codebase Audit

**Audit date:** 2026-07-04  
**Scope:** Customer role screens, RTK Query slices, navigation, payment gateway integration  
**Purpose:** Pre-implementation inventory before bug fixes and feature upgrades

---

## 1. Customer Home Screen

| Field | Value |
|-------|-------|
| **File path** | `apps/unified-app/src/screens/customer/dashboard/DashboardScreen.tsx` |
| **Re-export** | `apps/unified-app/src/screens/customer/CustomerDashboardScreen.tsx` → re-exports `DashboardScreen` |
| **Status** | **Working** (loads data, renders UI) with **known bugs** (see § Bugs below) |

### Data fetched

| Hook / Query | API slice | Tables / RPC |
|--------------|-----------|--------------|
| `useGetCustomerProfileQuery()` | `authApi.getCustomerProfile` | RPC `get_customer_profile` |
| `useGetCustomerDashboardQuery(userId)` | `customerDashboardApi.getCustomerDashboard` | `users`, `subscriptions` (+ join `plans`), `payments`, `tickets`, `portal_notifications` |

### Dashboard payload shape (`CustomerDashboard`)

- **Profile:** `id`, `name`, `email`, `phone`, `customerId` (from `users.customer_id`)
- **Subscription:** active row from `subscriptions` where `status = 'active'`, joined plan speed/data
- **Outstanding:** `users.outstanding_amount`
- **Recent payments:** last 3 from `payments`
- **Open tickets count:** `tickets` not in `Resolved`/`Closed`
- **Unread notifications:** `portal_notifications` for auth user

### UI components used

- `CustomerTopBar`, `CustomerInfoHeader`, `SpeedGauge`, `DashboardPlanCard`, `QuickActionsGrid`
- Realtime: `useRealtimeCustomer()` subscribed at tab level (`CustomerNavigator.tsx`)

### Known issues on Home

- **Bug 4:** Account ID uses fallback `ACC-${userId.slice(0,8)}` when `customerId` is null (`DashboardScreen.tsx:76`)
- **Bug 5:** `SpeedGauge` always shows `sub?.speedMbps ?? 100` even when status is Inactive (`DashboardScreen.tsx:109`)
- **Bug 8:** `SpeedGauge` uses full `Circle` stroke-dasharray, not a 180° semicircle arc — renders partial/broken gauge
- Connection status card from spec **not implemented** — uses `DashboardPlanCard` + gauge hero row instead
- Quick actions grid **already exists** (`QuickActionsGrid`) as 2×2 but cells are ~120px not ~100px; no collapsed live-speed bar

### Legacy / unused hook

- `apps/unified-app/src/screens/customer/dashboard/hooks/useDashboard.ts` — older pattern using `store/api/endpoints`; **not used** by current `DashboardScreen`

---

## 2. Plans Screen

| Field | Value |
|-------|-------|
| **File path** | `apps/unified-app/src/screens/customer/plans/PlansScreen.tsx` |
| **Re-export** | `apps/unified-app/src/screens/customer/PlansScreen.tsx` |
| **Status** | **Working** (list loads, detail sheet, checkout WebView) — layout not yet compact per spec |

### Plan list query

| Hook | Endpoint | Query |
|------|----------|-------|
| `useGetPlansQuery()` | `plansApi.getPlans` | `plans.select('*').eq('is_active', true).order('price')` |

✅ Filters active plans only — matches Admin-published plans requirement.

### Active plan query

| Hook | Endpoint | Query |
|------|----------|-------|
| `useGetActiveSubscriptionQuery(userId)` | `subscriptionsApi.getActiveSubscription` | `subscriptions` + `plans!inner(*)`, `user_id = userId`, `end_at >= now`, latest row |

Returns `planId`, `planName`, `daysUntilExpiry`, etc.

### Supporting queries

- `useGetPublicCompanySettingsQuery()` — payment gateway label for header note
- `useCreatePaymentOrderMutation()` — new plan subscription checkout (legacy `paymentsApi`, calls `create-payment-order` edge function)
- `useVerifyPaymentMutation()` — post-checkout verification

### Plan change flow (separate screen)

- Navigation: `PlanChangeRequest` stack screen → `PlanChangeRequestScreen.tsx`
- Mutation: `customerPlansApi.submitPlanChangeRequest` → inserts into `plan_change_requests`
- **Status:** **Broken** at runtime (Bug 1 — user-reported "Could not submit request")

### UI notes

- `PlanCard` ~220px+ tall (not 160–180px compact spec)
- Detail: `PlanDetailSheet` (bottom sheet), not full-screen `PlanDetailsScreen` (stack screen exists but Plans tab uses sheet)
- `PlanDetailsScreen.tsx` available on stack for deep links

---

## 3. Payments Screen

| Field | Value |
|-------|-------|
| **Tab screen (active)** | `apps/unified-app/src/screens/customer/payments/CustomerBillScreen.tsx` |
| **Legacy alternate** | `apps/unified-app/src/screens/customer/payments/PaymentsScreen.tsx` — uses `user_payments` via `usePayments` hook; **not wired to tab bar** |
| **Re-export** | `apps/unified-app/src/screens/customer/PaymentsScreen.tsx` → legacy screen |
| **Status** | **Partially working** — bill + history load; online pay flow incomplete; placeholder banner visible |

### Outstanding balance query

| Hook | Endpoint | Source |
|------|----------|--------|
| `useGetCustomerBillQuery(authId)` | `paymentCollectionApi.getCustomerBill` | `users` (outstanding, due dates), `subscriptions` + `plans` for plan name/amount; computes GST + late fee |

### Payment history query

| Hook | Endpoint | Source |
|------|----------|--------|
| `useGetCustomerPaymentHistoryV2Query(authId)` | `paymentCollectionApi.getCustomerPaymentHistoryV2` | `payments` table, `customer_id`, last 50 |

### Payment initiation

| Flow | Entry | Mutation / Function |
|------|-------|---------------------|
| Tab "Pay Now" | `CustomerBillScreen` → `PaymentMethod` modal | `GatewayWebViewScreen` → `createPaymentOrderV2` → edge fn `create-payment-order` |
| Legacy | `PaymentsScreen` | `paymentsApi.createPaymentOrder` → same `create-payment-order` |
| Orphaned | `paymentsApi.initiateEasebuzzPayment` | Invokes **`easebuzz-initiate-payment`** — **function does not exist in repo** |

### Gateway config query

- `useGetActivePaymentGatewayQuery()` → RPC `get_active_payment_gateway`
- When `null`, shows **"Online checkout coming soon"** banner (Bug 7)

### Known issues

- **Bug 3:** Quick-method icons in `CustomerBillScreen` hardcode `name="receipt"` for all methods (lines 140–147) — shows wrong/broken icons for Auto-Pay/Card
- **Bug 7:** Placeholder banner at bottom when no active gateway configured
- **Missing:** "Next Due Date" card (spec Feature 3.1)
- **Missing:** `PaymentProvider` abstraction layer (spec Feature 3.4)
- **Missing:** GST invoice request flow / `gst_invoice_requests` table
- `PaymentCheckoutWebView` is basic — manual "Complete payment" button, no postMessage handling from gateway

---

## 4. Support / Tickets Screen

| Field | Value |
|-------|-------|
| **Support tab** | `apps/unified-app/src/screens/customer/support/CustomerSupportHubScreen.tsx` |
| **Ticket list** | `apps/unified-app/src/screens/customer/tickets/CustomerTicketListScreen.tsx` (stack) |
| **Create ticket** | `apps/unified-app/src/screens/customer/tickets/CreateCustomerTicketScreen.tsx` (stack) |
| **Ticket detail** | `apps/unified-app/src/screens/customer/tickets/CustomerTicketDetailScreen.tsx` (stack) |
| **Status** | Hub **working**; ticket creation **broken** (Bug 2); list/detail **working** if tickets exist |

### Ticket creation mutation

| Hook | Endpoint | Implementation |
|------|----------|----------------|
| `useCreateCustomerTicketMutation()` | `customerTicketsApi.createCustomerTicket` | Edge function `create-support-ticket` (service-role insert into `tickets`) |

Input: `{ category, subject, description, priority, attachments? }`

Edge function requirements:
- Auth header required
- RPC `get_customer_id` must resolve customer
- Inserts into `tickets` with `complaint_type`, `customer_id`, SLA deadlines
- Notifies admins via `notify_collection_admins`

### Ticket list query

| Hook | Endpoint | Query |
|------|----------|-------|
| `useGetMyTicketsQuery()` | `customerTicketsApi.getMyTickets` | `tickets` where `customer_id = userRow.id` |

**Gap:** No join to `complaint_updates` / timeline — spec timeline UI **not implemented**.

### Realtime

- `useRealtimeCustomer` listens to `tickets` UPDATE on `customer_id` — invalidates `CustomerTickets` tag
- No subscription on `complaint_updates` table (table may not exist — tickets use `ticket_customer_messages` instead)

### Validation (create screen)

- Zod: subject min 3, description min 20 — **present**
- Category defaults to `'technical'` — **not enforced as required selection error**
- No character counter on description
- No auto-generated subject from category

---

## 5. Profile Screen

| Field | Value |
|-------|-------|
| **File path** | `apps/unified-app/src/screens/customer/profile/ProfileScreen.tsx` |
| **Re-export** | `apps/unified-app/src/screens/customer/ProfileScreen.tsx` |
| **Status** | **Partially working** — form loads, save works; address + account ID bugs |

### Profile read query

| Hook | Endpoint | Source |
|------|----------|--------|
| `useGetUserByIdQuery(userId)` | `authApi.getUserById` | `users.select('*')` — includes `address`, `profile_picture_url`, `notification_prefs` |

Note: `getCustomerProfile` RPC does **not** return address — profile screen correctly uses `getUserById`.

### Profile save mutation

| Hook | Endpoint | Updates |
|------|----------|---------|
| `useUpdateProfileMutation()` (= `updateUserProfile`) | `authApi.updateUserProfile` | `users` row: `name`, `phone`, `address`, `profile_picture_url`, `notification_prefs` |

Form: React Hook Form + Zod in `ProfileForm.tsx`; `reset(defaultValues)` on profile load — **includes `address`**.

### Photo upload

- `useProfile.pickAndUploadPhoto()` → `useCamera().pickFromGallery()` → `uploadProfilePhoto()` → `updateUserProfile({ profilePictureUrl })`
- **Status:** **Implemented** (wiring exists; depends on storage bucket `avatars` and camera permissions)

### Known issues

- **Bug 4:** Account ID hardcoded as `PFN-${authUser.id.slice(0,8).toUpperCase()}` in `ProfileScreen.tsx:142` — ignores `users.customer_id`
- **Bug 6:** Address field maps `dbUser?.address` — if DB row has null/empty `address`, placeholder shows. Column is `users.address` (not `installation_address`). Likely **data not populated** for dev customer rather than query omission; verify seed data.

---

## 6. Plan Change Screen

| Field | Value |
|-------|-------|
| **File path** | `apps/unified-app/src/screens/customer/plans/PlanChangeRequestScreen.tsx` |
| **Hook** | `apps/unified-app/src/hooks/usePlanChangeRequest.ts` |
| **Status** | **Broken** — generic error on submit (Bug 1) |

### Mutation

| Hook | Endpoint | Insert |
|------|----------|--------|
| `useSubmitPlanChangeRequestMutation()` | `customerPlansApi.submitPlanChangeRequest` | `plan_change_requests` |

Payload:
```ts
{
  customer_id: userRow.id,        // from users lookup by auth
  current_plan_id: input.currentPlanId,
  requested_plan_id: input.requestedPlanId,  // UUID from route param planId
  requested_cycle, reason, status: 'pending'
}
```

### RLS

- INSERT policy: `customer_id = public.get_customer_id()` (`get_customer_id()` → `current_customer_user_id()`)
- **Likely failure modes:**
  1. `get_customer_id()` returns null (auth/profile mismatch)
  2. `requested_plan_id` invalid UUID (if slug passed instead of ID — screen uses `planId` from navigation which should be UUID)
  3. `notify_collection_admins` RPC fails after insert
  4. FK violation if `current_plan_id` / `requested_plan_id` don't exist in `plans`

### Display bug in UI

- Screen shows `plan?.name ?? planId` for requested plan — if plan query fails, shows raw UUID (user screenshot showed `100mbps_UL` suggesting possible slug/name mismatch in display)

### Missing per spec

- Confirmation bottom sheet before submit
- Surfacing actual Supabase error message (only generic Alert)

---

## 7. Live Speed Component

| Field | Value |
|-------|-------|
| **Definition** | `apps/unified-app/src/components/customer/dashboard/SpeedGauge.tsx` |
| **Export** | `apps/unified-app/src/components/customer/dashboard/index.ts` |
| **Used in** | `DashboardScreen.tsx` |
| **Status** | **Broken visually** (Bug 8); no real speed test |

### Data source

- **Not a live measurement** — displays `subscription.speedMbps` from dashboard/subscription query (plan provisioned speed)
- Fallback: **100 Mbps** when no subscription (`DashboardScreen.tsx:109`)
- No fast.com or custom speed-test API integration
- No expanded speed-test modal

### Implementation detail

- Uses `react-native-svg` `Circle` with `strokeDashoffset` on full 360° circle, `rotation={-90}`, progress factor `0.79`
- Does **not** implement 180° semicircle arc per spec
- No tap-to-expand behavior

---

## 8. Customer RTK Query API Slices & Endpoints

All slices extend `baseApi` (`apps/unified-app/src/services/api/baseApi.ts`). Re-exported via `@/services/api` and `@/store/api/endpoints`.

### Customer-dedicated slices

#### `customerDashboardApi.ts`
| Endpoint | Type | Tag |
|----------|------|-----|
| `getCustomerDashboard` | query | `CustomerDashboard` |

#### `customerPlansApi.ts`
| Endpoint | Type | Tag |
|----------|------|-----|
| `getMyPlanChangeRequests` | query | `PlanChangeRequests` |
| `submitPlanChangeRequest` | mutation | invalidates `PlanChangeRequests`, `PortalNotifications` |

#### `customerTicketsApi.ts`
| Endpoint | Type | Tag |
|----------|------|-----|
| `getMyTickets` | query | `CustomerTickets` |
| `getTicketMessages` | query | `CustomerTickets` |
| `createCustomerTicket` | mutation | invalidates `CustomerTickets`, `PortalNotifications`, `CustomerDashboard` |
| `sendTicketReply` | mutation | invalidates `CustomerTickets` |

### Shared slices used by customer screens

#### `authApi.ts` (customer-relevant)
| Endpoint | Type |
|----------|------|
| `getCustomerProfile` | query |
| `getUserById` | query |
| `updateUserProfile` / `useUpdateProfileMutation` | mutation |
| `changePassword` | mutation |
| `requestAccountDeletion` | mutation |
| `getUserNotifications` | query |
| `markNotificationRead` | mutation |

#### `plansApi.ts`
| Endpoint | Type |
|----------|------|
| `getPlans` | query |
| `getPlanById` | query |
| `getAllPlans` | query (admin) |
| `createPlan` / `updatePlan` / `deletePlan` | mutations (admin) |

#### `subscriptionsApi.ts`
| Endpoint | Type |
|----------|------|
| `getActiveSubscription` | query |

#### `paymentCollectionApi.ts` (customer-relevant)
| Endpoint | Type |
|----------|------|
| `getCustomerBill` | query |
| `getCustomerPaymentHistoryV2` | query |
| `getActivePaymentGateway` | query |
| `createPaymentOrderV2` | mutation |
| `getPaymentReceipt` | query |

#### `paymentsApi.ts` (legacy — some screens still use)
| Endpoint | Type |
|----------|------|
| `getPaymentHistory` | query (`user_payments`) |
| `getPendingPayments` | query |
| `createSelfPayment` | mutation |
| `createPaymentOrder` | mutation |
| `initiateEasebuzzPayment` | mutation (**orphaned function name**) |
| `verifyPayment` | mutation |
| `confirmPayment` | mutation |
| `getPaymentStatus` | query |
| `getInvoice` | query |
| `getAllPayments` | query |
| `getInvoiceUrl` | query |
| `processRefund` | mutation |

#### `requestsApi.ts` (legacy service requests — used by old `useDashboard`)
| Endpoint | Type |
|----------|------|
| `getMyRequests` | query (`service_requests`) |
| `createRequest` | mutation |

#### `portalNotificationsApi.ts`
| Endpoint | Type |
|----------|------|
| `getPortalNotifications` | query |
| `getPortalUnreadCount` | query |
| `markPortalNotificationRead` | mutation |
| `markAllPortalNotificationsRead` | mutation |

### RTK Query rule compliance

- ✅ Customer screens predominantly use RTK Query hooks
- ⚠️ `useDashboard.ts` (unused) and some checkout flows mix patterns
- ❌ No `customerApi` monolithic slice — endpoints spread across slices above

---

## 9. Easebuzz / Payment Gateway Code (Customer App)

### Edge functions (repo)

| Function | Status | Used by customer? |
|----------|--------|-------------------|
| `create-payment-order` | ✅ Exists | **Yes** — `paymentCollectionApi.createPaymentOrderV2`, `paymentsApi.createPaymentOrder` |
| `verify-payment` | ✅ Exists | Yes — post-checkout |
| `payment-webhook` / `payment-webhook-handler` | ✅ Exists | Server-side |
| `process-payment` | ✅ Exists | Server-side |
| `easebuzz-initiate-payment` | ❌ **Not in repo** | Referenced only in `paymentsApi.initiateEasebuzzPayment` (unused by tab UI) |
| `easebuzz-initiate` | ❌ **Not in repo** | Mentioned in product spec only |

### Shared adapter

- `supabase/functions/_shared/payments/adapters/easebuzz.ts` — used by `create-payment-order` when default gateway slug is `easebuzz`
- Returns POST form to `pay.easebuzz.in/pay/secure` with hash params

### Client gateway abstraction

- `apps/unified-app/src/services/gatewayAdapters/index.ts` — `buildGatewayCheckoutSource()`, Razorpay HTML + Easebuzz POST form
- **No** `PaymentProvider.ts` interface per spec — **not implemented**

### Customer UI components

| File | Role | Status |
|------|------|--------|
| `components/PaymentCheckoutWebView.tsx` | Modal WebView + manual complete | Basic / placeholder |
| `payments/GatewayWebViewScreen.tsx` | Full-screen checkout via `createPaymentOrderV2` | **Working path** when gateway configured |
| `payments/PaymentMethodScreen.tsx` | Method picker bottom sheet | Working; correct MaterialCommunityIcons |
| `checkout/PaymentGatewayScreen.tsx` | Legacy checkout | Exists |
| `checkout/PaymentSuccessScreen.tsx` | Success screen | Exists |
| `payments/ReceiptScreen.tsx` | Receipt view | Exists |

### Gateway settings

- DB: `payment_gateways` table, RPC `get_active_payment_gateway`
- Admin configures via `GatewayConfigScreen`, `save-gateway-credentials` edge function
- `users.customer_id` / `payment_gateway_settings` — settings in `adminSettingsApi` / company settings

---

## 10. Navigation Structure

### Root: `CustomerNavigator.tsx`

```
CustomerNavigator
└── CustomerThemeProvider + CustomerFontProvider
    └── CustomerStackNavigator (Native Stack)
        ├── CustomerTabs (Bottom Tabs — custom CustomerTabBar)
        │   ├── Home      → DashboardScreen
        │   ├── Plans     → PlansScreen
        │   ├── Payments  → CustomerBillScreen
        │   ├── Support   → CustomerSupportHubScreen
        │   └── Profile   → ProfileScreen
        │
        └── Stack screens (pushed from tabs / links)
```

### Full stack screen list (`CustomerStackParamList`)

| Screen name | Component | Status |
|-------------|-----------|--------|
| `CustomerTabs` | Tab navigator | ✅ Active |
| `PlanDetails` | `PlanDetailsScreen` | ✅ Working |
| `PlanChangeRequest` | `PlanChangeRequestScreen` | ⚠️ Broken submit |
| `Checkout` | `CheckoutScreen` | ✅ Exists |
| `PaymentGateway` | `PaymentGatewayScreen` | ✅ Exists |
| `GatewayWebView` | `GatewayWebViewScreen` | ✅ Primary pay flow |
| `PaymentMethod` | `PaymentMethodScreen` | ✅ Modal picker |
| `CustomerBill` | `CustomerBillScreen` | ✅ Duplicate of tab |
| `Receipt` | `ReceiptScreen` | ✅ Working |
| `PaymentSuccess` | `PaymentSuccessScreen` | ✅ Working |
| `MakePayment` | `MakePaymentScreen` | 🚧 **Placeholder** ("migration pending") |
| `PaymentHistory` | `PaymentHistoryScreenV2` | ✅ Working |
| `MyBills` | `MyBillsScreen` | ✅ Exists |
| `Invoice` | `InvoiceScreen` (officer) | ✅ Reused |
| `Notifications` | `CustomerNotificationsScreen` | ✅ Working |
| `About` | `AboutScreen` | 🚧 **Placeholder** |
| `Terms` | `TermsScreen` | 🚧 **Placeholder** |
| `Privacy` | `PrivacyScreen` | 🚧 **Placeholder** |
| `Refund` | `RefundScreen` | 🚧 **Placeholder** |
| `CustomerLiveChat` | `CustomerLiveChatScreen` | ✅ Exists |
| `CustomerFaqList` | `CustomerFaqListScreen` | ✅ Exists |
| `CustomerFaqDetail` | `CustomerFaqDetailScreen` | ✅ Exists |
| `CustomerSupportHub` | `CustomerSupportHubScreen` | ✅ Duplicate of tab |
| `SupportScreen` | `ChatbotScreen` (Prima AI) | ✅ Working |
| `CustomerTicketList` | `CustomerTicketListScreen` | ✅ Working |
| `CustomerTicketDetail` | `CustomerTicketDetailScreen` | ✅ Working |
| `CreateCustomerTicket` | `CreateCustomerTicketScreen` | ⚠️ Broken create |

### Deep links

- Payment return URLs parsed in `CustomerTabsWithDeepLinks` → navigates to `PaymentSuccess`

### Realtime at navigation level

- `useRealtimeCustomer()` mounted in `CustomerTabs` — notifications, tickets, payments, subscriptions

---

## Bug Summary (Cross-Reference)

| Bug | Description | Root cause (audit) | Severity |
|-----|-------------|-------------------|----------|
| **1** | Plan change fails | RLS/`get_customer_id` mismatch, RPC notify failure, or FK; generic error masking | Critical |
| **2** | Ticket creation fails | Edge fn `create-support-ticket` auth/`get_customer_id`/deploy; error not surfaced | Critical |
| **3** | Payment icons broken | `CustomerBillScreen` uses `name="receipt"` for all quick methods | Medium |
| **4** | Account ID prefix | Home: `ACC-` fallback; Profile: `PFN-` from auth id; DB has `users.customer_id` | Medium |
| **5** | Inactive + speed shown | No guard on `SpeedGauge` when `!isActive` | Medium |
| **6** | Address empty | `users.address` likely null in DB; query path is correct | Medium |
| **7** | "Coming soon" banner | Shown when `get_active_payment_gateway` returns null | Expected until Phase 4 |
| **8** | Speed gauge arc | Wrong SVG geometry (full circle dash, not 180° arc) | Medium |

---

## Feature Gap Summary (vs. Spec)

| Feature | Current state |
|---------|---------------|
| Home redesign (header, status card, collapsed speed) | Partial — grid exists; missing status card + speed modal |
| Plans compact cards + PlanDetailScreen | Large cards + bottom sheet |
| Easebuzz via `easebuzz-initiate` | Uses `create-payment-order` adapter instead; no `PaymentProvider` abstraction |
| Payment receipt + GST invoice request | Receipt partial; no `gst_invoice_requests` |
| Ticket timeline + realtime on updates | Flat list only; realtime on ticket UPDATE not insert/timeline |
| `notify-ticket-update` edge function | **Not in repo** |
| Profile photo upload | Implemented in hook |
| Cross-app plan sync | ✅ `is_active` filter present |

---

## Database Tables (Customer Data)

| Domain | Table | Notes |
|--------|-------|-------|
| Plans | `plans` | `is_active` flag |
| Subscription | `subscriptions` | `user_id`, not `customer_subscriptions` |
| Plan changes | `plan_change_requests` | FK to `plans`, RLS via `get_customer_id()` |
| Tickets | `tickets` | Not `complaints` |
| Ticket messages | `ticket_customer_messages` | Not `complaint_updates` |
| Payments (current) | `payments` | V2 collection portal |
| Payments (legacy) | `user_payments` | Still used by `PaymentsScreen` legacy |
| Users | `users` | `customer_id`, `address`, `outstanding_amount` |

---

## Implementation Order (from spec — pending)

```
Phase 1 — Fixes: Bugs 1,2,3,4,5,6,8
Phase 2 — Home redesign
Phase 3 — Plans screen
Phase 4 — Payments / Easebuzz wiring
Phase 5 — Support / Tickets upgrade
Phase 6 — Profile fixes
Phase 7 — Cross-app verification
```

---

AUDIT COMPLETE
