# Prime Fibernet — Technical Architecture Document

> **Version:** 2.0 | **Date:** June 2026 | **Next Review:** September 2026  
> **Platform:** iOS · Android · Web | **Runtime:** React Native 0.73+ / Expo SDK 50+

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Backend Architecture](#3-backend-architecture)
4. [Database Architecture](#4-database-architecture)
5. [Data Flow Architecture](#5-data-flow-architecture)
6. [Performance Optimization](#6-performance-optimization)
7. [Deployment Architecture](#7-deployment-architecture)
8. [Monitoring & Observability](#8-monitoring--observability)

---

## 1. System Overview

Prime Fibernet is an enterprise-grade ISP management platform built as a **React Native monorepo**. It serves three user roles — Customer, Officer, and Admin — within a single unified cross-platform application.

### 1.1 Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT LAYER (React Native)                                    │
│  Single Unified App (iOS, Android, Web)                         │
│  • Customer UI  • Officer UI  • Admin UI (Web-optimized)        │
├─────────────────────────────────────────────────────────────────┤
│  Tech: React Native 0.73+ · Expo SDK 50+ · TypeScript           │
│        Redux Toolkit + RTK Query · React Navigation 6.x         │
│        TailwindCSS (Nativewind)                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTPS / WebSocket
┌──────────────────────▼──────────────────────────────────────────┐
│  API GATEWAY LAYER                                              │
│  • Supabase Client SDK (@supabase/supabase-js)                  │
│  • Automatic retry logic & request debouncing                   │
│  • Request/Response interceptors                                │
│  • Rate limiting (client-side) · API versioning (v1, v2)        │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│  BACKEND SERVICES LAYER                                         │
│                                                                 │
│  Supabase (PostgreSQL + Auth)                                   │
│  ├── PostgreSQL Database (Primary)                              │
│  ├── Authentication & JWT                                       │
│  ├── Row Level Security (RLS)                                   │
│  ├── Real-time Subscriptions                                    │
│  └── Storage (S3-compatible)                                    │
│                                                                 │
│  Edge Functions (Serverless — Deno Runtime)                     │
│  ├── Payment gateway integration                                │
│  ├── Email notifications                                        │
│  ├── Invoice generation (PDFs)                                  │
│  ├── SMS/WhatsApp sending                                       │
│  └── AI chatbot orchestration                                   │
│                                                                 │
│  External Services                                              │
│  ├── Google Gemini API     ├── Razorpay / Easebuzz              │
│  ├── Resend (Email)        ├── Twilio (SMS/WhatsApp)            │
│  ├── Google Maps API       └── Firebase Cloud Messaging         │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Architecture Principles

- Single codebase, multi-platform delivery via Expo SDK
- Serverless-first backend using Supabase (PostgreSQL + Edge Functions)
- Real-time data synchronization via Supabase Realtime subscriptions
- Offline-capable mobile client with background sync queue
- Role-based access enforced at both client and database (RLS) levels
- Horizontal scalability with stateless Edge Functions (Deno runtime)

---

## 2. Frontend Architecture

### 2.1 Technology Stack

```json
{
  "core": {
    "react-native": "0.73+",
    "expo": "50+",
    "typescript": "5.0+"
  },
  "navigation": {
    "@react-navigation/native": "6.x",
    "@react-navigation/bottom-tabs": "6.x",
    "@react-navigation/drawer": "6.x"
  },
  "state-management": {
    "@reduxjs/toolkit": "2.0+",
    "react-redux": "8.0+",
    "rtk-query": "2.0+"
  },
  "ui": {
    "nativewind": "2.0+",
    "react-native-paper": "5.0+",
    "react-native-reanimated": "3.5+",
    "react-native-gesture-handler": "2.13+"
  },
  "forms": {
    "react-hook-form": "7.48+",
    "zod": "3.22+"
  },
  "api": {
    "@supabase/supabase-js": "2.38+"
  },
  "maps": {
    "react-native-maps": "1.14+"
  },
  "notifications": {
    "@react-native-firebase/messaging": "18.6+",
    "expo-notifications": "0.25+"
  },
  "utilities": {
    "date-fns": "2.30+",
    "lodash-es": "4.17+",
    "uuid": "9.0+"
  }
}
```

### 2.2 Project Structure

```
prime-fibernet-rn/
├── apps/
│   └── unified-app/
│       └── src/
│           ├── navigation/
│           │   ├── AppNavigator.tsx       # Root (auth check)
│           │   ├── AuthNavigator.tsx      # Login, signup, forgot password
│           │   └── MainNavigator.tsx      # Tab/drawer by role
│           │
│           ├── screens/
│           │   ├── auth/                  # Authentication screens
│           │   ├── customer/
│           │   │   ├── dashboard/
│           │   │   ├── plans/
│           │   │   ├── payments/
│           │   │   ├── requests/
│           │   │   └── profile/
│           │   ├── officer/
│           │   │   ├── dashboard/
│           │   │   ├── requests/
│           │   │   ├── map/
│           │   │   ├── shifts/
│           │   │   ├── inventory/
│           │   │   └── profile/
│           │   └── admin/
│           │       ├── dashboard/
│           │       ├── users/
│           │       ├── officers/
│           │       ├── plans/
│           │       ├── analytics/
│           │       └── settings/
│           │
│           ├── components/
│           │   ├── common/                # Button, Input, Card, Modal, Loader
│           │   ├── layouts/               # SafeAreaLayout, TabLayout, DrawerLayout
│           │   └── feature-specific/      # Feature components
│           │
│           ├── services/
│           │   ├── api/
│           │   │   ├── supabase.ts        # Supabase client init
│           │   │   ├── auth.ts
│           │   │   ├── users.ts
│           │   │   ├── plans.ts
│           │   │   ├── payments.ts
│           │   │   ├── requests.ts
│           │   │   ├── officers.ts
│           │   │   └── analytics.ts
│           │   ├── storage/
│           │   │   ├── localStorage.ts    # AsyncStorage
│           │   │   └── secureStorage.ts   # Keychain/Keystore
│           │   ├── notifications/
│           │   │   ├── push.ts            # Firebase FCM
│           │   │   └── local.ts
│           │   └── offline/
│           │       └── syncManager.ts     # Offline mutation queue
│           │
│           ├── store/
│           │   ├── slices/
│           │   │   ├── authSlice.ts
│           │   │   ├── userSlice.ts
│           │   │   ├── plansSlice.ts
│           │   │   ├── requestsSlice.ts
│           │   │   ├── paymentsSlice.ts
│           │   │   ├── uiSlice.ts
│           │   │   └── officeSlice.ts
│           │   ├── hooks.ts               # Typed Redux hooks
│           │   └── store.ts               # Store configuration
│           │
│           ├── hooks/
│           │   ├── useAuth.ts
│           │   ├── usePlans.ts
│           │   ├── usePayments.ts
│           │   ├── useRequests.ts
│           │   ├── useLocation.ts
│           │   └── useNotifications.ts
│           │
│           ├── types/
│           │   ├── index.ts               # Consolidated exports
│           │   ├── user.ts
│           │   ├── plan.ts
│           │   ├── payment.ts
│           │   ├── request.ts
│           │   └── officer.ts
│           │
│           ├── utils/
│           │   ├── validators.ts
│           │   ├── formatters.ts
│           │   ├── helpers.ts
│           │   ├── constants.ts
│           │   └── errors.ts
│           │
│           └── theme/
│               ├── colors.ts
│               ├── typography.ts
│               ├── spacing.ts
│               └── theme.ts
│
├── backend/
│   └── functions/
│       ├── payment-webhook/
│       ├── invoice-generator/
│       ├── email-service/
│       ├── sms-service/
│       ├── chatbot-service/
│       └── scheduled-jobs/
│
└── migrations/
    ├── 001_initial_schema.sql
    ├── 002_add_rls_policies.sql
    └── ...
```

### 2.3 Navigation Architecture

| Navigator | Responsibility |
|-----------|---------------|
| `AppNavigator` | Root — checks auth state, routes to Auth or Main |
| `AuthNavigator` | Unauthenticated stack: Login → Signup → Forgot Password |
| `MainNavigator` | Role-gated: Customer tabs / Officer drawer / Admin drawer |
| `CustomerNavigator` | Bottom tabs: Home, Plans, Payments, Requests, Profile |
| `OfficerNavigator` | Drawer: Dashboard, Requests, Map, Shifts, Inventory |
| `AdminNavigator` | Drawer: Dashboard, Users, Officers, Plans, Analytics, Settings |

### 2.4 Redux Store Structure

| Slice | Key State | Notes |
|-------|-----------|-------|
| `authSlice` | user object, isAuthenticated, isLoading | Persisted to secure storage |
| `userSlice` | profile data, subscription, preferences | Refreshed on app foreground |
| `plansSlice` | plan list, selected plan, filter state | RTK Query cached (30 min TTL) |
| `requestsSlice` | request list, active detail, upload queue | Real-time via Supabase |
| `paymentsSlice` | payment history, pending payment state | RTK Query cached (5 min TTL) |
| `officeSlice` | officer requests, shift, inventory, location | Real-time + GPS updates |
| `uiSlice` | toast queue, modal state, theme, network | Not persisted |

---

## 3. Backend Architecture

### 3.1 Supabase Core Services

| Service | Function |
|---------|----------|
| PostgreSQL (Primary DB) | Relational data for all entities |
| Supabase Auth | JWT-based authentication with refresh token rotation |
| Row Level Security | Database-enforced per-role access policies |
| Realtime Subscriptions | WebSocket-based live updates |
| Storage (S3-compat) | Profile photos, invoice PDFs, attachments |
| Edge Functions (Deno) | Serverless compute for webhooks, AI, email/SMS |

### 3.2 Edge Functions

| Function | Responsibility |
|----------|---------------|
| `payment-webhook` | Verify Razorpay HMAC signature, update subscription, trigger invoice |
| `invoice-generator` | Generate PDF invoices, store to Supabase Storage |
| `email-service` | Transactional emails via Resend (welcome, invoice, reset) |
| `sms-service` | SMS and WhatsApp delivery via Twilio |
| `chatbot-service` | Orchestrate Google Gemini AI for customer support |
| `scheduled-jobs` | Daily expiry checks, shift reminders, analytics aggregation |

### 3.3 External Service Integrations

| Service | Category | Usage |
|---------|----------|-------|
| Google Gemini API | AI | Customer support chatbot |
| Razorpay / Easebuzz | Payments | Plan subscriptions & renewals |
| Resend | Email delivery | Transactional & marketing emails |
| Twilio | SMS / WhatsApp | Alerts, OTPs, notifications |
| Google Maps API | Mapping | Officer location, service area |
| Firebase FCM | Push notifications | Real-time alerts to mobile |

---

## 4. Database Architecture

### 4.1 Core Schema

```sql
-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  phone VARCHAR,
  name VARCHAR NOT NULL,
  role VARCHAR CHECK (role IN ('customer', 'officer', 'admin')),
  is_blocked BOOLEAN DEFAULT false,
  notification_prefs JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Officers Table
CREATE TABLE officers (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  region VARCHAR,
  availability_status VARCHAR,
  last_active_at TIMESTAMPTZ,
  salary_config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plans Table
CREATE TABLE plans (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  speed_mbps INTEGER,
  price DECIMAL,
  validity_days INTEGER,
  features TEXT[],
  is_active BOOLEAN DEFAULT true
);

-- Subscriptions Table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  plan_id UUID REFERENCES plans(id),
  start_at DATE,
  end_at DATE,
  status VARCHAR CHECK (status IN ('active', 'expired', 'cancelled'))
);

-- Service Requests Table
CREATE TABLE service_requests (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  officer_id UUID REFERENCES officers(id),
  request_type VARCHAR CHECK (request_type IN ('installation', 'repair', 'upgrade', 'complaint')),
  status VARCHAR,
  priority VARCHAR CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
  address TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Request Activities Table
CREATE TABLE request_activities (
  id UUID PRIMARY KEY,
  request_id UUID REFERENCES service_requests(id),
  officer_id UUID REFERENCES officers(id),
  note TEXT,
  photo_urls TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments Table
CREATE TABLE user_payments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  amount DECIMAL,
  payment_method VARCHAR,
  payment_status VARCHAR CHECK (payment_status IN ('success', 'failed', 'refunded')),
  transaction_id TEXT UNIQUE,
  refund_amount DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shifts Table
CREATE TABLE shifts (
  id UUID PRIMARY KEY,
  officer_id UUID REFERENCES officers(id),
  shift_date DATE,
  start_time TIME,
  end_time TIME,
  status VARCHAR,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  location GEOGRAPHY(POINT, 4326)
);

-- Inventory Assignments Table
CREATE TABLE inventory_assignments (
  id UUID PRIMARY KEY,
  item_id UUID,
  assigned_to_id UUID,
  assigned_to_type VARCHAR,
  status VARCHAR CHECK (status IN ('assigned', 'returned', 'damaged')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log Table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  actor_id UUID REFERENCES users(id),
  actor_role VARCHAR,
  action VARCHAR NOT NULL,
  target_entity VARCHAR,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  status VARCHAR CHECK (status IN ('SUCCESS', 'FAILURE'))
);
```

### 4.2 Row Level Security Policies

```sql
-- Customers see only their own data
CREATE POLICY users_can_view_self ON users
  FOR SELECT USING (auth.uid() = id);

-- Officers see only their assigned requests
CREATE POLICY officers_view_requests ON service_requests
  FOR SELECT USING (
    auth.uid() = officer_id
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins have full access
CREATE POLICY admin_access ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Customers see only their own payments
CREATE POLICY customers_own_payments ON user_payments
  FOR SELECT USING (auth.uid() = user_id);

-- Officers see only their own shifts
CREATE POLICY officer_own_shifts ON shifts
  FOR SELECT USING (
    auth.uid() = officer_id
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

## 5. Data Flow Architecture

### 5.1 Authentication Flow

```
User enters credentials
        │
        ▼
Client validates format (Zod)
Rate limit check (5 attempts / 15 min)
        │
        ▼
Supabase Auth — bcrypt verify
Check account blocked / email confirmed
        │
        ▼ (Admin only)
Generate 6-digit OTP → send via email
Verify OTP (5 min expiry, 5 attempt limit)
        │
        ▼
Issue JWT (30 min) + Refresh Token (7 days)
payload: { sub, email, role, iat, exp }
        │
        ▼
Client: Store JWT → Keychain (iOS) / Keystore (Android)
Dispatch to authSlice → Navigate to MainNavigator
```

### 5.2 Payment Processing Flow

```
Customer taps Pay
        │
        ▼
Client calls Edge Function → POST /payments/create
Edge Function creates Razorpay order → returns order_id
        │
        ▼
Client opens Razorpay WebView with order_id
Customer completes payment
        │
        ▼
Razorpay fires webhook → Edge Function
Verify HMAC signature
Idempotency check (transaction_id unique constraint)
        │
        ▼
Update subscription record
Generate invoice PDF → Supabase Storage
Send confirmation email via Resend
Fire Supabase Realtime event
        │
        ▼
Client receives Realtime update
Show success modal + invoice download button
```

### 5.3 Realtime Subscription Pattern

```typescript
// Subscribe to own request updates
const channel = supabase
  .channel('request-updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'service_requests',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      dispatch(updateRequest(payload.new));
    }
  )
  .subscribe();
```

---

## 6. Performance Optimization

### 6.1 Bundle Size

- Target: **< 50MB** uncompressed
- Code splitting and tree-shaking via Metro bundler
- Lazy loading for non-critical screens (admin analytics, officer maps)
- Dynamic imports for heavy libraries (charts, maps)

### 6.2 API & Cache Strategy

| Strategy | Implementation |
|----------|---------------|
| RTK Query | Auto deduplication, configurable TTL cache |
| Supabase Realtime | WebSocket subscriptions for live data |
| Offline Queue | SyncManager queues mutations, replays on reconnect |
| Image Optimization | WebP format (web), JPEG compressed (mobile), lazy-loaded |
| CDN Delivery | Static assets via Supabase Storage CDN edge nodes |

### 6.3 Rendering Optimization

```typescript
// Always memoize list items
const RequestItem = React.memo(({ request }: { request: Request }) => {
  return <Card>{/* ... */}</Card>;
});

// FlatList configuration for long lists
<FlatList
  data={requests}
  renderItem={renderRequestItem}
  keyExtractor={(item) => item.id}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={5}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index
  })}
/>
```

### 6.4 Performance Targets

| Metric | Target |
|--------|--------|
| App cold start | < 3 seconds |
| Screen transition | < 300ms |
| API response (cache hit) | < 50ms |
| API response (network) P95 | < 2 seconds |
| List render (100 items) | < 16ms per frame |
| Image load | < 1 second |

---

## 7. Deployment Architecture

### 7.1 Build & Release Pipeline

| Environment | Platform | Notes |
|-------------|----------|-------|
| Development | Expo Go | Hot reload, local Supabase optional |
| Staging | EAS Build + TestFlight / Play Internal | QA and stakeholder preview |
| Production iOS | EAS Submit → App Store | Apple review process |
| Production Android | EAS Submit → Play Store | Google review process |
| Web | Vercel / Netlify | Admin-optimized PWA |
| OTA Updates | EAS Update | JS-only changes, no store review |

### 7.2 EAS Configuration

```json
// eas.json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "staging": {
      "distribution": "internal",
      "env": { "APP_ENV": "staging" }
    },
    "production": {
      "distribution": "store",
      "env": { "APP_ENV": "production" }
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "your@apple.id" },
      "android": { "serviceAccountKeyPath": "./google-service-account.json" }
    }
  }
}
```

### 7.3 Environment Variables

```bash
# .env.staging / .env.production
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_key
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxx
EXPO_PUBLIC_APP_ENV=production
SENTRY_DSN=https://xxxx@sentry.io/xxxx
```

---

## 8. Monitoring & Observability

### 8.1 Error Tracking — Sentry

```typescript
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.EXPO_PUBLIC_APP_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Redact sensitive data
    if (event.request?.headers?.authorization) {
      event.request.headers.authorization = '[REDACTED]';
    }
    return event;
  }
});
```

### 8.2 Monitoring Stack

| Tool | Purpose |
|------|---------|
| Sentry | Crash reporting, performance monitoring (RN + Edge Functions) |
| Supabase Dashboard | Query performance, connection pool, storage metrics |
| Firebase Analytics | User behavior, funnel conversion, feature adoption |
| Audit log table | All critical admin and financial actions |

### 8.3 Key Metrics to Track

- API response times by endpoint
- App startup time (cold and warm)
- Redux store memory usage
- Push notification delivery rate
- Payment success / failure rate
- Request resolution time (TAT)

---

> **Architecture Version:** 2.0 | **Last Updated:** June 2026 | **Next Review:** September 2026
