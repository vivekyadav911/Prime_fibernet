# Prime Fibernet — Frontend Specification Document

> **Version:** 2.0 | **Date:** June 2026 | **Next Review:** September 2026  
> **Framework:** React Native 0.73+ · Expo SDK 50+ · TypeScript 5.0+  
> **Platform:** iOS · Android · Web (Unified App)

---

## Table of Contents

1. [Design System](#1-design-system)
2. [Screen Specifications — Customer](#2-screen-specifications--customer)
3. [Screen Specifications — Officer](#3-screen-specifications--officer)
4. [Screen Specifications — Admin](#4-screen-specifications--admin)
5. [State Management](#5-state-management)
6. [Form Specifications](#6-form-specifications)
7. [Offline & Sync Strategy](#7-offline--sync-strategy)
8. [Accessibility & Performance](#8-accessibility--performance)

---

## 1. Design System

### 1.1 Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary-navy` | `#1B3A6B` | Navigation bars, primary CTAs, headings |
| `accent-teal` | `#0D7377` | Links, active states, progress indicators |
| `success-green` | `#1A6B3A` | Confirmed statuses, completed states |
| `warning-amber` | `#D4820A` | Pending states, shift alerts, low inventory |
| `error-red` | `#C0392B` | Form errors, blocked status, critical alerts |
| `background` | `#F5F7FA` | App background, card backgrounds |
| `surface-white` | `#FFFFFF` | Cards, modals, input backgrounds |
| `text-primary` | `#1A1A2E` | Body text, headings, labels |
| `text-secondary` | `#6B7280` | Subtitles, placeholder text, metadata |
| `border-default` | `#CCCCCC` | Input borders, dividers, card borders |

### 1.2 Typography

| Style | Size · Weight | Usage |
|-------|--------------|-------|
| Display / H1 | 32px · Bold | Screen titles, hero text |
| Heading / H2 | 24px · SemiBold | Section titles, card headers |
| Subheading / H3 | 18px · Medium | Sub-section labels, table headers |
| Body Large | 16px · Regular | Primary content, plan descriptions |
| Body Default | 14px · Regular | Secondary content, metadata |
| Caption | 12px · Regular | Timestamps, fine print, status chips |
| Label | 12px · SemiBold | Form labels, button text, badges |
| Monospace | 13px · Regular | Account IDs, transaction IDs, codes |

```typescript
// theme/typography.ts
export const typography = {
  display:     { fontSize: 32, fontWeight: '700', lineHeight: 40 },
  heading:     { fontSize: 24, fontWeight: '600', lineHeight: 32 },
  subheading:  { fontSize: 18, fontWeight: '500', lineHeight: 26 },
  bodyLarge:   { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  body:        { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  caption:     { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  label:       { fontSize: 12, fontWeight: '600', lineHeight: 16 },
  mono:        { fontSize: 13, fontFamily: 'Courier New', lineHeight: 18 },
};
```

### 1.3 Spacing System (4px base grid)

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Icon padding, tight list gaps |
| `sm` | 8px | Internal component padding |
| `md` | 16px | Card padding, section gaps (default) |
| `lg` | 24px | Between major sections |
| `xl` | 32px | Screen-level vertical rhythm |
| `xxl` | 48px | Hero / banner vertical padding |

### 1.4 Component Library

| Component | Variants |
|-----------|----------|
| `Button` | Primary, Secondary, Ghost, Destructive; loading state; disabled |
| `Input` | Text, Password (visibility toggle), Phone (+country code), OTP (6-box) |
| `Card` | Default, Elevated (shadow), Interactive (tap ripple); skeleton variant |
| `Modal` | Centered, Bottom Sheet; backdrop dismiss; accessibility focus trap |
| `Badge / Chip` | Status (Active, Expired, Pending), Priority (High, Medium, Low) |
| `Toast` | Success, Error, Info, Warning; auto-dismiss with manual close |
| `Loader` | Full-screen spinner, inline skeleton, progress bar for uploads |
| `DataTable` | Sortable columns, pagination, search, empty state, error state |

### 1.5 Status Chip Color Map

| Status | Background | Text | Usage |
|--------|-----------|------|-------|
| Active | `#EAF7EF` | `#1A6B3A` | Subscription, officer availability |
| Pending | `#FEF9E7` | `#B7860B` | Request awaiting assignment |
| In Progress | `#FEF3E2` | `#D4600A` | Request being worked on |
| Resolved | `#EBF5FB` | `#1B3A6B` | Completed request |
| Expired | `#F5F5F5` | `#374151` | Ended subscription |
| Blocked | `#FDEDEC` | `#C0392B` | Blocked user account |

---

## 2. Screen Specifications — Customer

### 2.1 Customer Dashboard

**Route:** `CustomerNavigator → Dashboard`  
**Data sources:** `userSlice`, `subscriptionsApi`, `requestsApi` (RTK Query)  
**Realtime:** Supabase channel on `subscriptions WHERE user_id = current`

**Components:**
- **Active Plan Card** — plan name, speed badge (Mbps), expiry date, days remaining countdown, status chip
- **Payment Due Banner** — shown 7 days before `end_at`; one-tap renewal CTA; amber background
- **Quick Action Row** — 4 icon buttons: Renew Plan, Raise Request, Pay Bill, Contact Support
- **Recent Requests List** — last 3 requests; status chip, time-ago, chevron to detail
- **Notification Bell** — badge count for unread; opens notification drawer on tap
- **New User Empty State** — illustration + "Browse Plans" CTA (shown when no subscription)

**UX notes:**
- Plan card uses a gradient background matching speed tier (Basic → teal, Premium → navy)
- Payment banner dismissed if user navigates to Plans screen
- Realtime subscription updates plan status chip without full page refresh

---

### 2.2 Plans Browser

**Route:** `CustomerNavigator → Plans`  
**Data sources:** `plansApi` (30-min RTK Query cache)

**Components:**
- **Plan Cards Grid** — 2-column scroll; each card: name, speed, price, validity, top 3 features
- **Filter Row** — horizontal scroll chips: All, Basic (≤25 Mbps), Standard (50–100), Premium (200+), Business
- **Sort Dropdown** — Price: Low→High, Speed: High→Low, Most Popular
- **Plan Detail Bottom Sheet** — full feature list, OTT addons, comparison vs current plan, Subscribe CTA
- **"Your Plan" Badge** — teal banner on currently active plan card

**States:**
- Loading: skeleton cards (2 rows of 2)
- Empty: "No plans available" illustration
- Error: retry button with error message

---

### 2.3 Payments Screen

**Route:** `CustomerNavigator → Payments`  
**Data sources:** `paymentsApi` (5-min RTK Query cache)

**Components:**
- **Pay Now Button** — primary CTA at top; opens plan selection if no active sub, else direct to gateway
- **Total Spent Card** — sum of all successful payments with period filter
- **Payment History List** — each row: date, amount, plan name, status chip, invoice download icon
- **Date Range Filter** — chips: 30d, 3m, 6m, Custom (calendar picker)
- **Invoice Download** — generates signed Supabase Storage URL on tap; opens PDF viewer

**Payment gateway flow:**
1. Client calls `paymentsApi.createOrder` → Edge Function → Razorpay order
2. `WebView` renders Razorpay checkout URL
3. On success/failure, `WebView` fires callback with payment result
4. Client updates local state; waits for Realtime confirmation from webhook

---

### 2.4 Service Requests Screen

**Route:** `CustomerNavigator → Requests`  
**Data sources:** `requestsApi` + Supabase Realtime channel

**Components:**
- **Raise Request FAB** — floating action button; opens request type bottom sheet
- **Request Type Selection** — 4 cards: Installation, Repair, Upgrade, Complaint
- **Request Form:**
  - Type (pre-selected from above)
  - Address (auto-filled from profile, editable)
  - Description (multiline, 500-char counter)
  - Photo Attachment (camera or gallery, max 3 images, 5MB each, shown as thumbnails)
- **Request List** — sorted by created_at desc; status chip, assigned officer name, priority badge
- **Request Detail Screen** — full timeline, officer name + contact, resolution ETA, activity feed
- **Cancel Button** — visible only when status = `Pending`; confirmation modal required

**Realtime:** Live status updates via Supabase channel subscription on `service_requests WHERE user_id = current`

---

### 2.5 Profile & Settings Screen

**Route:** `CustomerNavigator → Profile`

**Sections:**
- **Personal Info** — name, phone (editable); email (read-only label)
- **Address** — full address with edit capability
- **Profile Photo** — circular avatar with tap-to-edit; camera/gallery picker with crop
- **Notification Preferences** — toggle list: Payment Reminders, Request Updates, Promotions, SMS Alerts
- **Account Actions** — Change Password, Delete Account (destructive, confirmation required)
- **App Info** — version number, Terms of Service, Privacy Policy links

---

## 3. Screen Specifications — Officer

### 3.1 Officer Dashboard

**Route:** `OfficerNavigator → Dashboard`  
**Data sources:** `officersApi`, Supabase Realtime on `service_requests WHERE officer_id = current`

**Components:**
- **Shift Card** — current shift status; Clock In / Clock Out button; hours logged today
- **Request Summary Row** — 3 count chips: New (red), In Progress (amber), Completed (green)
- **Next Requests List** — 3 highest-priority pending requests; customer name, address, priority badge, distance
- **Weekly Performance Bar** — requests completed / weekly target (e.g., "12 / 15")
- **Leave Balance Row** — 3 chips: Casual Leave, Sick Leave, Earned Leave with day counts
- **Inventory Warning** — shown if any assigned item has `status = damaged` or low stock

---

### 3.2 Request Queue & Management

**Route:** `OfficerNavigator → Requests`  
**Data sources:** `requestsApi` (officer-scoped via RLS)

**Components:**
- **Priority-sorted List** — P0 (red border) → P1 → P2 → P3; then by `created_at`
- **Filter Tabs** — All, New, In Progress, Completed
- **Request Row** — customer name, address, request type icon, priority chip, time since created
- **Request Detail Screen:**
  - Customer info, issue description, photo attachments (gallery)
  - Map preview of customer address with "Navigate" button
  - Status update buttons (context-sensitive to current status)
  - Activity feed with officer notes and timestamps
- **Add Activity Note Sheet** — text input + optional photo; note required before Resolve

**Status flow:**
```
New → [Accept] → In Transit → [Arrived] → On Site → [Start] → Working → [Resolve] → Resolved
```

---

### 3.3 Map View

**Route:** `OfficerNavigator → Map`  
**Data sources:** `expo-location` (live GPS) + `requestsApi`

**Components:**
- **Google Maps** — officer's live location (blue dot with accuracy ring)
- **Request Pins** — colored markers: P0 red, P1 orange, P2 amber, P3 green
- **Pin Tap Card** — bottom sheet: customer name, request type, address, "Navigate" CTA
- **List / Map Toggle** — header right button switches view mode
- **My Location Button** — centers map on officer's current position

**Permissions:** `expo-location` foreground permission required; background location active while shift is clocked in

**Offline:** Map tiles cached for last-visited areas via react-native-maps tile caching

---

### 3.4 Shifts & Attendance

**Route:** `OfficerNavigator → Shifts`

**Components:**
- **Monthly Calendar** — days colored: Present (green), Absent (gray), Leave (amber), Holiday (blue)
- **Clock In / Out Widget** — large button; GPS captured on tap; location-verified badge if within 500m of region
- **Overtime Alert** — modal shown if officer has not clocked out 30 min after scheduled end
- **Shift Detail** — start/end time, GPS location, tasks completed, hours logged
- **Leave Request Form:**
  - Type dropdown: Casual, Sick, Earned, Comp Off
  - Date range picker
  - Reason text (required)
  - Document attachment (for sick leave)
- **Leave History List** — request date, type, status chip (Pending / Approved / Rejected)

---

### 3.5 Inventory View

**Route:** `OfficerNavigator → Inventory`  
**Data sources:** `inventory_assignments WHERE assigned_to_id = officer.id`

**Components:**
- **Assigned Items List** — item name, type, assigned date, status chip
- **Item Detail** — serial number, condition notes, assignment history
- **Mark as Returned / Damaged** — action buttons with required confirmation and notes field
- **Low Stock Badge** — shown on dashboard if any critical item has `status = damaged`

---

### 3.6 Payslip & Earnings

**Route:** `OfficerNavigator → Profile → Payslip`

**Components:**
- **Month Selector** — horizontal scroll of last 12 months
- **Payslip Card** — base salary, task bonuses, transport allowance, deductions, net pay
- **Earnings Chart** — 6-month bar chart (Victory Native on mobile, Recharts on web)
- **Download PDF Button** — generates signed Supabase Storage URL for payslip PDF

---

## 4. Screen Specifications — Admin

### 4.1 Admin Dashboard

**Route:** `AdminNavigator → Dashboard`  
**Layout:** Web-optimized with sidebar navigation and 12-column CSS grid

**Components:**
- **KPI Row** — 4 metric cards: Active Subscribers, MRR (₹), Open Requests, Officers Online
- **Revenue Trend Chart** — 30-day line chart; toggle: daily / weekly view
- **Request Pipeline Funnel** — horizontal bar: New → Assigned → In Progress → Resolved with counts
- **Expiring Subscriptions Table** — next 7 days; customer name, plan, expiry date, "Send Reminder" action
- **Recent Activity Feed** — last 20 audit log events; actor, action, target, time ago
- **Officer Status Map** — Google Maps with live dots for clocked-in officers

---

### 4.2 User Management

**Route:** `AdminNavigator → Users`

**Components:**
- **Search Bar** — real-time search by name, email, phone
- **Filter Panel** — role, subscription status, registration date, blocked status
- **Data Table** — columns: Name, Email, Phone, Plan, Sub Status, Account Status, Actions
- **Sort** — any column; default: registration date desc
- **Pagination** — 25 / 50 / 100 rows; server-side
- **User Detail Drawer** (right-side panel on web, full screen on mobile):
  - Profile info · Subscription history · Payment history · Request history
  - Actions: Block/Unblock, Edit Profile, Reset Password, Send Notification
- **Block Modal** — reason required (dropdown + text); logged to audit trail
- **Bulk Export** — selected rows or all filtered results → CSV download

---

### 4.3 Officer Management

**Route:** `AdminNavigator → Officers`

**Components:**
- **Officer List** — name, region chip, availability status, shift status, requests completed today
- **Invite Officer Modal:**
  - Name, Email, Phone (required)
  - Region assignment dropdown
  - Temp password auto-generated; sent via Resend email
- **Officer Profile Drawer:**
  - Full info · Salary config editor (JSONB fields: base, task_bonus, allowances)
  - Performance metrics: average TAT, completion rate, rating
  - Attendance history · Leave balance
  - Shift assignment calendar
- **Remove Officer** — soft-delete with confirmation; data preserved; login disabled

---

### 4.4 Plan Management

**Route:** `AdminNavigator → Plans`

**Components:**
- **Plan List Table** — name, speed, price, validity, subscriber count, active status toggle
- **Create / Edit Plan Form:**
  - Name (required), Speed Mbps (int), Price ₹ (decimal), Validity days (int)
  - Features (tag input, multi-value), OTT Addons (tag input)
  - Active toggle (default: true)
- **Deactivate Confirmation Modal** — warns that existing subscribers are not affected
- **Plan Preview Card** — shows how the plan will appear in the Customer plan browser

---

### 4.5 Request Oversight

**Route:** `AdminNavigator → Requests`

**Components:**
- **Full Request Table** — all users; columns: ID, Customer, Type, Priority, Status, Officer, Created, Updated
- **Filter Panel** — type, priority, status, officer, date range
- **Assign Officer Drawer** — dropdown of available officers filtered by region; immediate notification sent
- **Priority Override** — dropdown; change requires reason; audit logged
- **Bulk Assign** — select multiple requests → assign to one officer
- **Escalation Flag** — toggle with reason text; highlighted in officer's queue

---

### 4.6 Analytics & Reports

**Route:** `AdminNavigator → Analytics`

**Components:**
- **Revenue Report** — bar chart by day/week/month; total, plan-wise breakdown
- **Subscription Growth** — dual line chart: new subscribers vs churned per period
- **Request TAT Report** — average resolution time by request type and by officer
- **Officer Attendance Report** — presence rate, leaves, overtime per officer per month
- **Date Range Picker** — presets: 7d, 30d, 90d, YTD; custom date range
- **Export Buttons** — CSV (raw data) / PDF (formatted report) per section

---

### 4.7 Bulk Notifications

**Route:** `AdminNavigator → Notifications`

**Components:**
- **Audience Selector** — All Users, Active Subscribers, Specific Region (dropdown), Custom List
- **Message Composer** — title (60 char max), body (200 char max), optional deep-link target
- **Preview Card** — shows how notification will appear on iOS and Android
- **Delivery Report Table** — sent, delivered, opened counts; timestamp
- **Rate Limit Indicator** — shows remaining bulk sends for today (max 10/day)

---

### 4.8 Audit Log Viewer

**Route:** `AdminNavigator → Settings → Audit Logs`

**Components:**
- **Log Table** — timestamp, actor, action, target, status (read-only, no edit/delete)
- **Filter Panel** — actor name/email, action type enum, date range, status
- **Log Detail Drawer** — full entry with old_values / new_values JSON diff view
- **CSV Export** — filtered result set

---

## 5. State Management

### 5.1 RTK Query API Slices

| Slice | Endpoints | Cache TTL |
|-------|-----------|-----------|
| `usersApi` | getUser, updateProfile, blockUser, getAllUsers | 10 min |
| `plansApi` | getPlans, getPlanById, createPlan, updatePlan, toggleActive | 30 min |
| `subscriptionsApi` | getMySubscription, subscribe, getAll (admin) | 5 min |
| `paymentsApi` | createOrder, getHistory, getInvoice, refund (admin) | 5 min |
| `requestsApi` | createRequest, updateStatus, addNote, getAll, getAssigned | 2 min |
| `officersApi` | getOfficers, assignRegion, getShifts, clockIn, clockOut | 5 min |
| `analyticsApi` | getRevenue, getRequestMetrics, getOfficerPerformance | 60 min |

### 5.2 Realtime Subscriptions

```typescript
// Customer: listen for own subscription status changes
supabase.channel('subscription-updates')
  .on('postgres_changes', {
    event: 'UPDATE', schema: 'public',
    table: 'subscriptions', filter: `user_id=eq.${userId}`
  }, (payload) => dispatch(updateSubscription(payload.new)))
  .subscribe();

// Officer: listen for new request assignments
supabase.channel('officer-requests')
  .on('postgres_changes', {
    event: 'INSERT', schema: 'public',
    table: 'service_requests', filter: `officer_id=eq.${officerId}`
  }, (payload) => dispatch(addRequest(payload.new)))
  .subscribe();

// Admin: listen for real-time officer online status
supabase.channel('officer-shifts')
  .on('postgres_changes', {
    event: '*', schema: 'public', table: 'shifts'
  }, (payload) => dispatch(updateOfficerStatus(payload.new)))
  .subscribe();
```

---

## 6. Form Specifications

| Form | Required Fields | Validation | Submits To |
|------|----------------|-----------|------------|
| Login | email, password | Email format; min 8 chars (client) | `supabase.auth.signIn` |
| Register | name, email, phone, password, confirm | Password match; complexity; unique email | `supabase.auth.signUp` |
| Raise Request | type, address, description | Type enum; address min 10; desc max 500 | `requestsApi.create` |
| Create Plan | name, speed, price, validity | Int/decimal types; name unique | `plansApi.create` |
| Invite Officer | name, email, phone, region | Email unique; phone format | `officersApi.invite` |
| Profile Update | name, phone, address | Phone E.164 format | `usersApi.update` |
| Shift Clock-in | — | Auto GPS capture; biometric confirm | `officersApi.clockIn` |
| Leave Request | type, start_date, end_date, reason | Date range valid; reason required | `officersApi.submitLeave` |
| Block User | reason | Min 10 chars required | `usersApi.block` |

---

## 7. Offline & Sync Strategy

### 7.1 Offline Read Access

| Role | Cached Data |
|------|-------------|
| Customer | Plan catalog (30 min), subscription status, last 30 payment records |
| Officer | Assigned requests, customer addresses, activity feed |
| Admin | Not designed for offline use (web-primary) |

### 7.2 Offline Mutation Queue

```typescript
// syncManager.ts
const SyncManager = {
  queue: [] as PendingOperation[],

  // Add operation to queue when offline
  enqueue(operation: PendingOperation) {
    this.queue.push(operation);
    AsyncStorage.setItem('sync_queue', JSON.stringify(this.queue));
  },

  // Replay on reconnect
  async replayOnConnect() {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (state.isConnected && this.queue.length > 0) {
        for (const op of this.queue) {
          try {
            await op.execute();
            this.queue = this.queue.filter(q => q.id !== op.id);
          } catch (err) {
            console.error('Sync failed for operation:', op.id, err);
          }
        }
        AsyncStorage.setItem('sync_queue', JSON.stringify(this.queue));
      }
    });
    return unsubscribe;
  }
};
```

### 7.3 Conflict Resolution

| Field Type | Strategy |
|------------|----------|
| Status fields | Server authoritative — server version always wins |
| Notes / text | Last-write-wins |
| GPS coordinates | Server authoritative |
| User preferences | Client authoritative (merge on sync) |

---

## 8. Accessibility & Performance

### 8.1 Accessibility Standards

- Minimum touch target: **44×44pt** (iOS HIG / Android Material guidelines)
- All interactive elements have `accessibilityLabel` and `accessibilityRole`
- Color is **never** the sole indicator of state — icons and text labels accompany all status colors
- Dynamic font size support — all text uses `sp` (scale-independent pixels)
- Screen reader tested: **VoiceOver** (iOS) and **TalkBack** (Android) per release
- Minimum color contrast ratio: **4.5:1** (WCAG 2.1 AA)

### 8.2 Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| App cold start | < 3 seconds | From launch icon tap to interactive dashboard |
| Screen transition | < 300ms | Native-feel navigation animations |
| API response (cache hit) | < 50ms | RTK Query in-memory cache |
| API response (network) P95 | < 2 seconds | All endpoints |
| FlatList render (100 items) | < 16ms/frame | With windowing + memoization |
| Image load | < 1 second | WebP via CDN + lazy loading |
| Bundle size | < 50MB | Uncompressed |

### 8.3 Rendering Best Practices

```typescript
// Always memoize expensive list items
const RequestItem = React.memo(({ request }: Props) => {
  return <RequestCard request={request} />;
});

// FlatList configuration
<FlatList
  data={requests}
  renderItem={({ item }) => <RequestItem request={item} />}
  keyExtractor={item => item.id}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={5}
  initialNumToRender={8}
  getItemLayout={(_, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index
  })}
/>

// Avoid inline functions as props (causes re-renders)
// ❌ Bad:  onPress={() => handlePress(item.id)}
// ✅ Good: onPress={handlePress} with item.id in closure
```

---

> **Frontend Specification Version:** 2.0 | **Last Updated:** June 2026 | **Next Review:** September 2026
