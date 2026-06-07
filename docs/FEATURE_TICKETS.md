# Prime Fibernet — Feature Ticket List

> **Version:** 2.0 | **Date:** June 2026 | **Total Tickets:** 42  
> **Sprint Tool:** Use with GitHub Issues, Linear, or Jira

---

## Legend

| Priority | Meaning |
|----------|---------|
| 🔴 P0 | Critical — blocks launch |
| 🟠 P1 | High — required for MVP |
| 🟡 P2 | Medium — important, not blocking |
| 🔵 P3 | Low — nice to have |

| Status | Meaning |
|--------|---------|
| 🟥 Backlog | Not started, not scheduled |
| 🟦 Todo | Scheduled for current sprint |
| 🟧 In Progress | Actively being built |
| 🟩 Done | Completed and merged |
| ⬛ Blocked | Waiting on dependency |

**Estimate column** = Story Points (1 SP ≈ half a day of focused work)

---

## Epic Summary

| Epic | Tickets | Story Points |
|------|---------|-------------|
| [AUTH](#epic-auth) | 7 | 34 SP |
| [CUSTOMER](#epic-customer) | 8 | 47 SP |
| [OFFICER](#epic-officer) | 7 | 38 SP |
| [ADMIN](#epic-admin) | 9 | 53 SP |
| [PAYMENTS](#epic-payments) | 5 | 28 SP |
| [INFRA](#epic-infra) | 6 | 29 SP |
| **Total** | **42** | **229 SP** |

---

## Recommended Sprint Order

| Sprint | Tickets | Rationale |
|--------|---------|-----------|
| 1 | INFRA-004, INFRA-005, INFRA-006 | DB + RLS + FCM — everything else depends on these |
| 2 | AUTH-001 → AUTH-007 | Nothing works without authentication |
| 3 | CUST-001, CUST-002, PYMT-001, PYMT-002, PYMT-003 | Core customer loop |
| 4 | OFF-001 → OFF-004, INFRA-001, INFRA-002 | Officer field ops + CI/CD |
| 5 | ADM-001 → ADM-005 | Admin oversight and management |
| 6 | Remaining backlog | AI chatbot, analytics, exports, offline queue |

---

## EPIC: AUTH

> Authentication, JWT management, 2FA, password flows

---

### AUTH-001 · User Sign-Up with Email Verification
**Priority:** 🔴 P0 | **Status:** 🟦 Todo | **Estimate:** 5 SP

**Acceptance Criteria:**
- [ ] User can register with valid email, phone, and password meeting complexity requirements
- [ ] Verification email sent within 30 seconds of registration via Resend
- [ ] Account is locked (unconfirmed) until email link is clicked
- [ ] Duplicate email shows a clear, generic error message (no user enumeration)
- [ ] Password strength meter shown in real time during input

**Technical Notes:**
> `supabase.auth.signUp` with custom email template via Resend Edge Function. Zod schema validation on client (`LoginSchema`) and server. `bcrypt` cost factor 12 for password hashing via Supabase Auth internals.

---

### AUTH-002 · Login with JWT Token Issuance
**Priority:** 🔴 P0 | **Status:** 🟦 Todo | **Estimate:** 5 SP

**Acceptance Criteria:**
- [ ] User can log in with verified email and password
- [ ] Failed login shows generic error message (no enumeration of which field is wrong)
- [ ] Account locked after 5 failed attempts for 15 minutes
- [ ] JWT stored in iOS Keychain / Android Keystore via `expo-secure-store`
- [ ] Redux `authSlice` updated; navigate to role-appropriate `MainNavigator`

**Technical Notes:**
> `supabase.auth.signInWithPassword`. RTK Query `baseQuery` wrapper reads JWT from secure storage and injects `Authorization` header. Dispatch `authSlice.setCredentials` on success.

---

### AUTH-003 · Admin Two-Factor Authentication (TOTP)
**Priority:** 🔴 P0 | **Status:** 🟦 Todo | **Estimate:** 8 SP

**Acceptance Criteria:**
- [ ] Admin users must complete TOTP 2FA after password login
- [ ] QR code displayed for authenticator app enrollment (Google Authenticator, Authy)
- [ ] 6-digit code entry with 5-minute expiry and 5-attempt limit
- [ ] Backup codes generated at enrollment (single-use, AES-256 encrypted in DB)
- [ ] 2FA disable triggers full session invalidation and security notification email

**Technical Notes:**
> `speakeasy` library for TOTP generation/verification. `qrcode` library for enrollment QR. 2FA secret stored encrypted via `pgcrypto` extension in Supabase. Backup codes hashed before storage.

---

### AUTH-004 · JWT Refresh Token Rotation
**Priority:** 🟠 P1 | **Status:** 🟦 Todo | **Estimate:** 5 SP

**Acceptance Criteria:**
- [ ] Silent JWT refresh fires when access token is within 5 minutes of expiry
- [ ] New refresh token issued on each rotation; old token blacklisted in DB
- [ ] On refresh failure (expired/revoked), user is logged out with informative toast
- [ ] All in-flight API requests are queued and replayed after successful refresh

**Technical Notes:**
> RTK Query `baseQuery` wrapper with `mutex` (e.g., `async-mutex` library) to prevent concurrent refresh races. Blacklist table in Supabase with daily cleanup via scheduled Edge Function.

---

### AUTH-005 · Forgot Password Flow
**Priority:** 🟠 P1 | **Status:** 🟦 Todo | **Estimate:** 3 SP

**Acceptance Criteria:**
- [ ] User receives password reset email within 60 seconds
- [ ] Reset link expires after 1 hour (single-use token)
- [ ] New password must meet complexity requirements and cannot match last 5 passwords
- [ ] All existing sessions invalidated on password change
- [ ] Confirmation email sent after successful reset

**Technical Notes:**
> `supabase.auth.resetPasswordForEmail`. Edge Function sends branded email via Resend with custom template. Session invalidation via Supabase admin `auth.admin.signOut(userId)`.

---

### AUTH-006 · Biometric Login (Face ID / Fingerprint)
**Priority:** 🟡 P2 | **Status:** 🟥 Backlog | **Estimate:** 5 SP

**Acceptance Criteria:**
- [ ] User can enable biometric login after first successful password login
- [ ] Biometric prompt shown on subsequent app opens
- [ ] Falls back to password on 3 biometric failures
- [ ] Biometric preference stored in secure storage only (never synced to server)

**Technical Notes:**
> `expo-local-authentication` for `authenticateAsync`. On success, retrieve JWT from Keychain and dispatch to Redux — no re-authentication with server. Preference flag in `AsyncStorage`.

---

### AUTH-007 · Role-Based Navigation Guard
**Priority:** 🔴 P0 | **Status:** 🟦 Todo | **Estimate:** 3 SP

**Acceptance Criteria:**
- [ ] Customer users can only reach `CustomerNavigator` routes
- [ ] Officer users can only reach `OfficerNavigator` routes
- [ ] Admin users reach `AdminNavigator` with web-optimized layout
- [ ] Deep links validated against user role before navigation permitted

**Technical Notes:**
> `AppNavigator.tsx` reads `role` from `authSlice`. Conditional rendering of navigator trees — unauthorized routes are never mounted. Deep link handler checks role before `navigation.navigate`.

---

## EPIC: CUSTOMER

> Customer-facing features: dashboard, plans, requests, chatbot, profile

---

### CUST-001 · Customer Dashboard Screen
**Priority:** 🔴 P0 | **Status:** 🟦 Todo | **Estimate:** 8 SP

**Acceptance Criteria:**
- [ ] Active plan card shows name, speed, expiry date, and status badge
- [ ] Payment due banner appears 7 days before expiry with one-tap renewal CTA
- [ ] Last 3 service requests shown with real-time status chips
- [ ] Quick action row renders: Renew, Raise Request, Pay Bill, Support
- [ ] Realtime subscription updates plan status chip without full page refresh
- [ ] Empty state shown for new users with "Browse Plans" CTA

**Technical Notes:**
> RTK Query for initial data load (5-min cache). Supabase Realtime channel on `subscriptions` table filtered by `user_id`. Plan card gradient determined by speed tier enum. `authSlice.user` provides role check.

---

### CUST-002 · Plan Browser & Subscription
**Priority:** 🔴 P0 | **Status:** 🟦 Todo | **Estimate:** 8 SP

**Acceptance Criteria:**
- [ ] Plans displayed as cards with speed, price, validity, and top features
- [ ] Filter chips: All, Basic, Standard, Premium, Business
- [ ] Sort options: Price Low→High, Speed High→Low, Most Popular
- [ ] Plan detail bottom sheet with full feature comparison vs current plan
- [ ] Current plan highlighted with "Your Plan" badge
- [ ] Subscribe CTA triggers payment flow (→ PYMT-001)

**Technical Notes:**
> `plansApi` RTK Query with 30-min cache TTL. `plans` table filtered `WHERE is_active = true`. Bottom sheet via `@gorhom/bottom-sheet`. Sort and filter applied client-side on cached data.

---

### CUST-003 · Service Request Creation
**Priority:** 🔴 P0 | **Status:** 🟦 Todo | **Estimate:** 8 SP

**Acceptance Criteria:**
- [ ] User can raise: Installation, Repair, Upgrade, or Complaint
- [ ] Address auto-filled from profile; user can override inline
- [ ] Description field with 500-character limit and live counter
- [ ] Optional photo attachment: camera or gallery, max 3 photos, 5MB each
- [ ] Submitted request appears immediately in list with "Pending" status chip

**Technical Notes:**
> Photos uploaded to Supabase Storage (`requests/` bucket) before form submit. Request record created with `photo_urls` array. `requestsApi.create` Edge Function. Optimistic update in RTK Query cache.

---

### CUST-004 · Request Tracking with Realtime Updates
**Priority:** 🟠 P1 | **Status:** 🟦 Todo | **Estimate:** 5 SP

**Acceptance Criteria:**
- [ ] Request list shows all user requests with status chips and timestamps
- [ ] Status transitions update live: Pending → Assigned → In Progress → Resolved
- [ ] Request detail shows full activity timeline and officer name (when assigned)
- [ ] Push notification sent on each status change via FCM

**Technical Notes:**
> Supabase Realtime channel on `service_requests WHERE user_id = current`. FCM push sent from `status-change` Edge Function triggered by Postgres trigger on `service_requests.status` update.

---

### CUST-005 · Payment History & Invoice Download
**Priority:** 🟠 P1 | **Status:** 🟦 Todo | **Estimate:** 5 SP

**Acceptance Criteria:**
- [ ] Payment history list: date, amount, plan name, status chip
- [ ] Filter by date range: 30d, 3m, 6m, custom calendar picker
- [ ] Each successful payment has a PDF invoice download button
- [ ] Failed payments show a "Retry" option that re-initiates the payment flow
- [ ] Total spent summary card at top of screen

**Technical Notes:**
> `paymentsApi` RTK Query (5-min cache). Invoice PDFs stored in Supabase Storage. Signed URL generated on-demand via Edge Function (valid 7 days). `expo-sharing` for native share sheet on mobile.

---

### CUST-006 · AI Chatbot Support
**Priority:** 🟡 P2 | **Status:** 🟥 Backlog | **Estimate:** 8 SP

**Acceptance Criteria:**
- [ ] Chatbot accessible from Support tab and dashboard quick action
- [ ] Answers: plan queries, request status, outage status, billing questions
- [ ] Escalates to "Request Human Support" if confidence threshold not met
- [ ] Conversation history persisted within session (30-min inactivity timeout)
- [ ] Typing indicator shown while Gemini response streams in

**Technical Notes:**
> Edge Function calls Google Gemini API with system prompt including user subscription context from DB. Conversation history passed as `messages` array per call. Streaming response via `ReadableStream`. No conversation persisted server-side by default.

---

### CUST-007 · Profile Management
**Priority:** 🟡 P2 | **Status:** 🟦 Todo | **Estimate:** 3 SP

**Acceptance Criteria:**
- [ ] User can update name, phone, and address
- [ ] Email is read-only after initial verification
- [ ] Profile photo upload with crop tool (square crop, circular display)
- [ ] Delete account option with confirmation modal and 90-day retention notice

**Technical Notes:**
> `usersApi.update` PATCH. Profile photo: `expo-image-picker` → `expo-image-manipulator` for crop → Supabase Storage `avatars/` bucket. Account deletion: soft-delete `is_deleted` flag; background cleanup job after 90 days.

---

### CUST-008 · Push Notification Preferences
**Priority:** 🔵 P3 | **Status:** 🟥 Backlog | **Estimate:** 3 SP

**Acceptance Criteria:**
- [ ] User can toggle: Payment Reminders, Request Updates, Promotions, SMS Alerts
- [ ] Preferences saved to `users.notification_prefs` JSONB column
- [ ] System permission request shown on first login (not on every open)
- [ ] FCM topic subscriptions updated to match preferences

**Technical Notes:**
> `expo-notifications` for permission request. FCM topic management via Firebase Admin SDK in Edge Function on preference update. Preferences stored as `{ payment_reminders: true, request_updates: true, promotions: false }`.

---

## EPIC: OFFICER

> Officer field operations: requests, shifts, map, inventory, payslip

---

### OFF-001 · Officer Dashboard & Daily Overview
**Priority:** 🔴 P0 | **Status:** 🟦 Todo | **Estimate:** 5 SP

**Acceptance Criteria:**
- [ ] Today's shift status shown with Clock In / Clock Out button
- [ ] Assigned request counts by status (New, In Progress, Completed)
- [ ] Next 3 pending requests with priority badge and distance from current location
- [ ] Performance metric: requests completed this week vs weekly target
- [ ] Leave balance chips for Casual, Sick, and Earned leave

**Technical Notes:**
> `officersApi` RTK Query for shift and request data. `expo-location` `getCurrentPositionAsync` for distance calculation to request `latitude/longitude`. Distance formatted in km using Haversine formula utility.

---

### OFF-002 · Request Queue & Status Management
**Priority:** 🔴 P0 | **Status:** 🟦 Todo | **Estimate:** 8 SP

**Acceptance Criteria:**
- [ ] Request list sorted by priority (P0 first) then by `created_at`
- [ ] Status update flow: Accept → In Transit → On Site → Working → Resolved
- [ ] Activity note with optional photo required before "Resolve" action
- [ ] Officer cannot view or act on requests not assigned to them (RLS enforced)
- [ ] One-tap navigation to customer address via Google Maps or Apple Maps

**Technical Notes:**
> `requestsApi.updateStatus` with RLS policy `officers_view_requests`. Activity notes stored in `request_activities` table. Photos uploaded to `activities/` Supabase Storage bucket. `Linking.openURL` with maps deeplink for navigation.

---

### OFF-003 · Map View with Request Pins
**Priority:** 🟠 P1 | **Status:** 🟦 Todo | **Estimate:** 8 SP

**Acceptance Criteria:**
- [ ] Google Maps showing officer's real-time location (blue dot with accuracy ring)
- [ ] Request pins colored by priority: P0 red, P1 orange, P2 amber, P3 green
- [ ] Tap on pin opens bottom sheet with customer name, request type, "Navigate" CTA
- [ ] List / Map toggle in navigation header
- [ ] Offline map tiles cached for last-known service areas

**Technical Notes:**
> `react-native-maps` with `PROVIDER_GOOGLE`. `expo-location` `watchPositionAsync` for live tracking. Map pins rendered as `MapMarker` with custom colored SVG. Tile caching via react-native-maps `cacheEnabled` prop.

---

### OFF-004 · Shift Clock-In / Clock-Out
**Priority:** 🔴 P0 | **Status:** 🟦 Todo | **Estimate:** 5 SP

**Acceptance Criteria:**
- [ ] Officer can clock in; GPS coordinates recorded at check-in
- [ ] Clock-out records end time and final GPS location
- [ ] Overtime alert modal shown if officer has not clocked out 30 min after shift end
- [ ] Cannot clock in to overlapping shift slots
- [ ] "Location Verified" badge shown if within 500m of assigned region centroid

**Technical Notes:**
> `officersApi.clockIn/Out` Edge Function. `shifts` table updated with `check_in_time`, `check_out_time`, and `location` as `GEOGRAPHY(POINT, 4326)`. Geofence check: PostGIS `ST_Distance` query. Background location via `expo-task-manager` while shift is active.

---

### OFF-005 · Inventory Assignment View
**Priority:** 🟡 P2 | **Status:** 🟥 Backlog | **Estimate:** 3 SP

**Acceptance Criteria:**
- [ ] Officer sees all equipment assigned to them with status chip
- [ ] Can mark items as "Returned" or "Damaged" with required notes
- [ ] Low-stock / damaged item warning badge shown on dashboard
- [ ] Assignment history visible per item

**Technical Notes:**
> `inventory_assignments WHERE assigned_to_id = officer.id AND assigned_to_type = 'officer'`. Status update via `officersApi.updateInventoryItem`. Dashboard badge count from `COUNT WHERE status = 'damaged'`.

---

### OFF-006 · Leave Request Submission
**Priority:** 🟡 P2 | **Status:** 🟥 Backlog | **Estimate:** 3 SP

**Acceptance Criteria:**
- [ ] Officer can submit leave: type, date range, reason, optional document upload
- [ ] Leave balance deducted on admin approval
- [ ] Push notification sent on approval or rejection
- [ ] Cannot submit leave for dates with existing approved shifts

**Technical Notes:**
> New `leave_requests` table. Document upload to Supabase Storage `leave-docs/` bucket. Admin approval via `adminApi.approveLeave`. FCM notification on `leave_requests.status` change via Postgres trigger.

---

### OFF-007 · Payslip & Earnings View
**Priority:** 🟡 P2 | **Status:** 🟥 Backlog | **Estimate:** 3 SP

**Acceptance Criteria:**
- [ ] Officer can view monthly payslip: base, bonuses, deductions, net pay
- [ ] Download payslip as PDF
- [ ] 6-month earnings bar chart
- [ ] 12-month history accessible via month selector

**Technical Notes:**
> `payslips` table populated by scheduled Edge Function on 1st of each month. PDF generated by `invoice-generator` function and stored in `payslips/` Supabase Storage bucket. `expo-sharing` for native PDF share/download.

---

## EPIC: ADMIN

> Admin management: users, officers, plans, requests, analytics, notifications, settings

---

### ADM-001 · Admin Dashboard with KPIs
**Priority:** 🔴 P0 | **Status:** 🟦 Todo | **Estimate:** 8 SP

**Acceptance Criteria:**
- [ ] KPI cards: Active Subscribers, MRR (₹), Open Requests, Officers Online
- [ ] 30-day revenue trend line chart with daily/weekly toggle
- [ ] Request pipeline funnel: New → Assigned → In Progress → Resolved with counts
- [ ] Expiring subscriptions table for next 7 days with "Send Reminder" action
- [ ] Recent admin activity feed (last 20 audit log events)
- [ ] Google Maps with live dots for clocked-in officers

**Technical Notes:**
> `analyticsApi` RTK Query (60-min cache). Recharts on web, Victory Native on mobile. KPI counts from Supabase DB views (pre-aggregated). Real-time officer count via Supabase Realtime on `shifts WHERE status = 'active'`.

---

### ADM-002 · User Management Table
**Priority:** 🔴 P0 | **Status:** 🟦 Todo | **Estimate:** 8 SP

**Acceptance Criteria:**
- [ ] Searchable, sortable table: name, email, phone, plan, sub status, account status
- [ ] Filter: role, sub status, registration date, blocked status
- [ ] User detail drawer: full profile, sub history, payment history, request history
- [ ] Block/Unblock requires reason (min 10 chars); action logged to audit trail
- [ ] Bulk CSV export for filtered result set

**Technical Notes:**
> `usersApi.getAllUsers` admin endpoint (admin RLS). Server-side pagination (25/50/100 rows). Block action: sets `is_blocked = true`, calls `supabase.auth.admin.signOut(userId)` to invalidate all sessions. Audit log insert via DB trigger.

---

### ADM-003 · Officer Onboarding & Management
**Priority:** 🟠 P1 | **Status:** 🟦 Todo | **Estimate:** 8 SP

**Acceptance Criteria:**
- [ ] Admin can invite officer via email; temp password auto-generated and sent
- [ ] Officer profile: region, salary config (JSONB editor), performance metrics
- [ ] Shift assignment via calendar interface (click day → assign officer → save)
- [ ] View officer attendance history and leave balance
- [ ] Soft-delete: officer login disabled, historical data preserved

**Technical Notes:**
> `officersApi.invite` Edge Function sends onboarding email via Resend with temp credentials. `officers.salary_config` JSONB schema: `{ base: number, task_bonus: number, transport: number }`. Soft-delete sets `users.is_blocked = true` + `officers.status = 'inactive'`.

---

### ADM-004 · Plan CRUD Management
**Priority:** 🟠 P1 | **Status:** 🟦 Todo | **Estimate:** 5 SP

**Acceptance Criteria:**
- [ ] Admin can create, edit, and deactivate plans
- [ ] Fields: name, speed (Mbps), price (₹), validity (days), features (tags), active toggle
- [ ] Deactivating a plan does not cancel existing active subscriptions
- [ ] Plan preview card shows customer-facing appearance before save

**Technical Notes:**
> `plansApi` CRUD. `is_active = false` for soft-deactivation (no hard deletes). Cache invalidation: RTK Query tag `{ type: 'Plans', id: 'LIST' }` invalidated on create/update. Preview component reuses `PlanCard` from customer screens.

---

### ADM-005 · Request Assignment & Oversight
**Priority:** 🟠 P1 | **Status:** 🟦 Todo | **Estimate:** 5 SP

**Acceptance Criteria:**
- [ ] Admin can view all requests across all users (no RLS restriction for admin role)
- [ ] Manual assignment of any request to any available officer
- [ ] Priority override with required reason; logged to audit trail
- [ ] Bulk assign multiple requests to one officer in one action
- [ ] Escalation flag toggle with reason text; highlighted in officer's queue

**Technical Notes:**
> `requestsApi.adminUpdate` endpoint. Assignment triggers FCM notification to officer. Escalation flag stored as `service_requests.is_escalated BOOLEAN`. Audit log insert on priority change and manual assignment.

---

### ADM-006 · Analytics & Report Export
**Priority:** 🟡 P2 | **Status:** 🟥 Backlog | **Estimate:** 8 SP

**Acceptance Criteria:**
- [ ] Revenue report by period (daily/weekly/monthly/custom) with bar chart
- [ ] Subscription growth: new vs churned dual line chart
- [ ] Request TAT report by type and by officer (table + chart)
- [ ] Officer attendance and overtime summary report
- [ ] Export each section as CSV or formatted PDF

**Technical Notes:**
> `analyticsApi` Edge Functions run aggregations on DB views. CSV: client-side from RTK Query data using `Papa.unparse`. PDF: `invoice-generator` function with report template. Date range picker: `react-native-date-picker` or `@react-native-community/datetimepicker`.

---

### ADM-007 · Bulk Push Notification Sender
**Priority:** 🟡 P2 | **Status:** 🟥 Backlog | **Estimate:** 5 SP

**Acceptance Criteria:**
- [ ] Audience options: All Users, Active Subscribers, Specific Region, Custom List
- [ ] Title (max 60 chars) and body (max 200 chars) with live preview
- [ ] Notification preview shows iOS and Android rendering side-by-side
- [ ] Delivery report: sent, delivered, opened counts
- [ ] Rate limited: 10 bulk sends per day per admin

**Technical Notes:**
> Edge Function calls Firebase Admin SDK `messaging().sendToTopic` or `sendMulticast`. Delivery stats stored in `notification_log` table. Rate limit enforced via `notification_sends` count per `admin_id` per day.

---

### ADM-008 · Audit Log Viewer
**Priority:** 🟡 P2 | **Status:** 🟥 Backlog | **Estimate:** 3 SP

**Acceptance Criteria:**
- [ ] Audit log table: timestamp, actor, action, target entity, status (read-only)
- [ ] Filter: actor, action type, date range, status
- [ ] Detail drawer shows old/new values as JSON diff
- [ ] CSV export for filtered result set
- [ ] No edit or delete operations permitted on audit logs

**Technical Notes:**
> `audit_logs` table with admin-only SELECT RLS policy. No UPDATE/DELETE policy defined (table is append-only). JSON diff viewer: `react-diff-viewer` library on web. Server-side pagination with 50 rows default.

---

### ADM-009 · General Settings & Configuration
**Priority:** 🔵 P3 | **Status:** 🟥 Backlog | **Estimate:** 3 SP

**Acceptance Criteria:**
- [ ] Configure: company name, logo, support email/phone, notification templates
- [ ] Feature flags: chatbot enabled, new registrations open, maintenance mode
- [ ] API key viewer (obfuscated — show last 4 chars only)
- [ ] Settings changes require admin re-authentication confirmation

**Technical Notes:**
> `settings` table with key-value JSONB. Re-auth: prompt for password before save (`supabase.auth.signInWithPassword`). API keys stored AES-256 encrypted in DB; display via Edge Function that decrypts and masks.

---

## EPIC: PAYMENTS

> Payment processing, invoices, refunds, webhooks, auto-expiry

---

### PYMT-001 · Razorpay Payment Integration
**Priority:** 🔴 P0 | **Status:** 🟦 Todo | **Estimate:** 8 SP

**Acceptance Criteria:**
- [ ] Customer can initiate payment for any active plan
- [ ] Razorpay WebView opens with pre-filled order details
- [ ] On success: subscription created/extended, invoice generated, confirmation email sent
- [ ] On failure: clear error message with retry option
- [ ] Payment status reflects in customer dashboard within 10 seconds of gateway response

**Technical Notes:**
> Edge Function creates Razorpay order (`POST /v1/orders`). Client opens `WebView` with Razorpay checkout URL. Webhook handler (→ PYMT-002) does all DB updates — client only shows UI confirmation via Realtime. No card data touches Prime Fibernet servers at any point.

---

### PYMT-002 · Payment Webhook Handler
**Priority:** 🔴 P0 | **Status:** 🟦 Todo | **Estimate:** 5 SP

**Acceptance Criteria:**
- [ ] Webhook receives `payment.captured` and `payment.failed` events from Razorpay
- [ ] HMAC-SHA256 signature verified before any processing
- [ ] Idempotency check: duplicate webhook events do not create duplicate records
- [ ] On success: subscription created/extended, invoice generation triggered
- [ ] On failure: `user_payments` record marked failed; customer notified via FCM

**Technical Notes:**
> Edge Function with `crypto.subtle.verify` for HMAC. Idempotency via `transaction_id UNIQUE` constraint on `user_payments`. Invoice triggered as async job by calling `invoice-generator` Edge Function. All processing in a DB transaction for atomicity.

---

### PYMT-003 · Invoice PDF Generation & Storage
**Priority:** 🟠 P1 | **Status:** 🟦 Todo | **Estimate:** 5 SP

**Acceptance Criteria:**
- [ ] Invoice PDF generated for every successful payment within 60 seconds
- [ ] Invoice includes: invoice number, customer name, plan details, amount, GST breakdown, date
- [ ] Stored in Supabase Storage `invoices/` bucket with private access
- [ ] Customer can download at any time via freshly generated signed URL (7-day validity)

**Technical Notes:**
> `invoice-generator` Edge Function uses `pdf-lib` for PDF creation. Invoice number: `INV-{YYYY}-{MM}-{sequential_id}`. Supabase Storage signed URL generated via `storage.from('invoices').createSignedUrl`. Company logo injected as base64.

---

### PYMT-004 · Refund Processing (Admin)
**Priority:** 🟡 P2 | **Status:** 🟥 Backlog | **Estimate:** 5 SP

**Acceptance Criteria:**
- [ ] Admin can initiate full or partial refund for any successful payment
- [ ] Refund reason required (min 20 chars); logged to audit trail
- [ ] Razorpay refund API called; `user_payments` updated with refund status and amount
- [ ] Customer notified via email and push notification with refund amount
- [ ] Refunded amount shown in customer payment history with "Refunded" chip

**Technical Notes:**
> Edge Function calls Razorpay `POST /v1/payments/{id}/refund`. `user_payments` updated: `payment_status = 'refunded'`, `refund_amount`, `refund_reason`. Audit log insert required. FCM + Resend email notification to customer.

---

### PYMT-005 · Subscription Auto-Expiry & Renewal Reminders
**Priority:** 🟠 P1 | **Status:** 🟥 Backlog | **Estimate:** 5 SP

**Acceptance Criteria:**
- [ ] Subscription `status` set to `'expired'` automatically on `end_at` date
- [ ] Reminder push notification sent 7 days before expiry
- [ ] Reminder email sent 3 days before expiry via Resend
- [ ] Customer dashboard expiry banner visible from 7 days out
- [ ] Admin expiring subscriptions table updated in real time

**Technical Notes:**
> Scheduled Edge Function (cron: `0 0 * * *`). Queries `subscriptions WHERE end_at <= NOW() AND status = 'active'`, updates status. Reminder queries `WHERE end_at = NOW() + INTERVAL '7 days'` and `'3 days'`. FCM batch send via Firebase Admin SDK.

---

## EPIC: INFRA

> Infrastructure, CI/CD, monitoring, database, offline, FCM setup

---

### INFRA-001 · EAS Build & OTA Update Pipeline
**Priority:** 🔴 P0 | **Status:** 🟦 Todo | **Estimate:** 5 SP

**Acceptance Criteria:**
- [ ] EAS Build configured for iOS (TestFlight) and Android (Play Internal Testing)
- [ ] OTA updates via `EAS Update` for JavaScript-only changes
- [ ] Three build profiles: `development`, `staging`, `production` with env-specific configs
- [ ] GitHub Actions workflow triggers EAS build on merge to `main`
- [ ] Environment variables injected from GitHub Secrets (no secrets in codebase)

**Technical Notes:**
> `eas.json` with three build profiles. `app.config.js` dynamic config reads `process.env`. GitHub Actions: `expo/expo-github-action@v8` for EAS CLI. Staging build targets internal distribution; production targets store submission.

---

### INFRA-002 · Sentry Error Tracking & Performance Monitoring
**Priority:** 🟠 P1 | **Status:** 🟦 Todo | **Estimate:** 3 SP

**Acceptance Criteria:**
- [ ] Sentry initialized with `DSN`, `environment`, and `tracesSampleRate: 0.1`
- [ ] Crash reports include device info, app version, and breadcrumb trail
- [ ] PII fields (Authorization header, user email) redacted via `beforeSend` hook
- [ ] Performance transactions tracked for: login, payment initiation, request creation

**Technical Notes:**
> `@sentry/react-native` setup in `App.tsx`. `Sentry.wrap(App)` for automatic crash boundary. Manual `Sentry.startTransaction` spans in RTK Query `baseQuery`. `beforeSend` strips `event.request.headers.authorization`.

---

### INFRA-003 · Offline Queue & Sync Manager
**Priority:** 🟠 P1 | **Status:** 🟥 Backlog | **Estimate:** 8 SP

**Acceptance Criteria:**
- [ ] Mutations attempted offline are queued in `AsyncStorage`
- [ ] Queue replays automatically when `NetInfo` reports connectivity restored
- [ ] Conflicts resolved server-first for status fields; last-write-wins for notes
- [ ] Offline indicator banner shown with count of queued operations
- [ ] Queue survives app restart (persisted to `AsyncStorage`)

**Technical Notes:**
> `SyncManager` class with `NetInfo.addEventListener`. Queue stored as JSON array in `AsyncStorage` under key `sync_queue`. RTK Query offline mode (`serializeQueryArgs` + custom middleware). Conflict resolution logic in Edge Function via `updated_at` timestamp comparison.

---

### INFRA-004 · Row Level Security Policy Suite
**Priority:** 🔴 P0 | **Status:** 🟦 Todo | **Estimate:** 5 SP

**Acceptance Criteria:**
- [ ] RLS policies implemented for all tables: users, officers, subscriptions, service_requests, user_payments, shifts, inventory_assignments, audit_logs
- [ ] Customers cannot read other customers' records
- [ ] Officers cannot read non-assigned requests or other officers' data
- [ ] Admin role bypasses all row-level restrictions (via EXISTS subquery on `users.role`)
- [ ] All policies validated using Supabase policy tester and integration tests

**Technical Notes:**
> SQL migration `002_add_rls_policies.sql`. Test suite using `supabase test db` with assertions per role. Enable RLS on every table: `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY`. Test matrix: Customer, Officer, Admin × each table × SELECT/INSERT/UPDATE/DELETE.

---

### INFRA-005 · Database Migration & Seed Strategy
**Priority:** 🟠 P1 | **Status:** 🟦 Todo | **Estimate:** 3 SP

**Acceptance Criteria:**
- [ ] Migration files numbered sequentially (`001_`, `002_`, ...) and applied via Supabase CLI
- [ ] Seed script: 3 active plans, 1 admin, 2 officers, 5 customers, sample requests
- [ ] Rollback strategy documented per breaking migration
- [ ] CI runs `supabase db push` against staging on every PR merge

**Technical Notes:**
> `supabase/migrations/` folder. `supabase/seed.sql` for development data. GitHub Actions step: `supabase db push --linked` after EAS build. Staging project separate from production in Supabase dashboard.

---

### INFRA-006 · Firebase FCM Push Notification Setup
**Priority:** 🔴 P0 | **Status:** 🟦 Todo | **Estimate:** 5 SP

**Acceptance Criteria:**
- [ ] FCM configured for iOS (APNs certificate) and Android (google-services.json)
- [ ] Device FCM tokens stored in `user_fcm_tokens` table on every login
- [ ] Token refresh handled automatically; stale tokens cleaned up
- [ ] FCM topics created: `all-users`, `officers`, `admins`, `region-{name}`
- [ ] Foreground and background notification handlers implemented in `App.tsx`

**Technical Notes:**
> `@react-native-firebase/messaging` initialization. `onTokenRefresh` listener updates `user_fcm_tokens`. Topic subscription managed by Edge Function on user login/preference update. Firebase Admin SDK in Edge Functions for server-side sends. Background handler registered via `messaging().setBackgroundMessageHandler`.

---

## Appendix: Story Point Reference

| Story Points | Effort | Typical Complexity |
|-------------|--------|-------------------|
| 1–2 SP | < 1 day | Config change, minor UI tweak, single API endpoint |
| 3 SP | ~1 day | Simple CRUD screen, small feature with 1–2 components |
| 5 SP | ~2 days | Multi-step flow, moderate API integration, Realtime feature |
| 8 SP | ~3–4 days | Complex screen, new epic infrastructure, multi-service integration |
| 13 SP | > 4 days | Split this ticket — too large for a single sprint item |

---

> **Document Version:** 2.0 | **Last Updated:** June 2026 | **Next Review:** July 2026 (Post Sprint 1)  
> **Total Tickets:** 42 | **Total Story Points:** 229 SP | **Estimated Sprints:** 6 × 2-week sprints
