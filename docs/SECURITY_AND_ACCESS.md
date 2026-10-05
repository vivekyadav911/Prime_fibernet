# Prime Fibernet — Security & Access Control Document

> **Version:** 2.0 | **Date:** June 2026 | **Classification:** CONFIDENTIAL — Internal Use Only  
> **Compliance:** GDPR · ISO 27001 · SOC 2 · PCI DSS Level 1

---

## Table of Contents

1. [Authentication System](#1-authentication-system)
2. [Authorization & RBAC](#2-authorization--rbac)
3. [Data Protection](#3-data-protection)
4. [API Security](#4-api-security)
5. [Audit Logging & Monitoring](#5-audit-logging--monitoring)
6. [Compliance & Standards](#6-compliance--standards)
7. [Incident Response Plan](#7-incident-response-plan)
8. [Security Testing Schedule](#8-security-testing-schedule)
9. [Security Compliance Checklist](#9-security-compliance-checklist)

---

## 1. Authentication System

### 1.1 Account Provisioning and First Login

Prime Fibernet uses Supabase Auth as the session and password authority. The app
does not maintain a separate password hash, JWT signer, or TOTP secret store.

| Flow                   | Current implementation                                                                                                                           | Source                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Customer/officer claim | User enters email or username, requests a 6-digit email OTP, verifies it, then creates a password if `password_set` is false.                    | `LoginScreen.tsx`, `OtpVerificationScreen.tsx`, `CreatePasswordScreen.tsx` |
| Password creation      | Inline client validation mirrors the Supabase project policy: minimum 8 characters, at least one lowercase letter, uppercase letter, and number. | `CreatePasswordScreen.tsx`                                                 |
| Admin sign-in          | Admins use password sign-in first, then must complete the Supabase MFA screen before the admin navigator is committed.                           | `LoginScreen.tsx`, `AdminMfaScreen.tsx`                                    |
| Dev quick sign-in      | Development builds may use seeded credentials, but still perform a real Supabase password sign-in.                                               | `useAuth.ts`                                                               |

### 1.2 Login Flow

| Step                        | Detail                                                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Portal selection         | User chooses Customer, Officer, or Admin on the landing screen.                                                                                               |
| 2. Identifier resolution    | Non-admins may enter email or username; `email_for_identifier` resolves usernames without exposing whether an account exists. Admins enter email.             |
| 3. Supabase verification    | Password logins call `supabase.auth.signInWithPassword`; first-login claims use the email OTP endpoints exposed through the RTK Query auth API.               |
| 4. Authoritative role check | `get_my_role` is read after authentication. If the DB role does not match the selected portal, the local session is signed out and a generic error is shown.  |
| 5. Admin MFA                | Admin password sign-in navigates to `AdminMfaScreen`; the session is not committed to Redux until a Supabase TOTP factor is enrolled/challenged and verified. |
| 6. Session window stamp     | Successful customer/officer login, OTP claim, and admin MFA call `touch_full_login` so restore logic can enforce role-specific session windows.               |
| 7. Navigation commit        | `commitAuthenticatedSession` stores the Supabase session and resolved DB role; `AppNavigator` mounts only the matching role navigator.                        |

### 1.3 Supabase Session Management

Supabase Auth owns access-token issuance, refresh-token rotation, secure session
storage through the Supabase client, and MFA assurance levels. The app adds a
role/session policy layer around that session:

| Contract                    | Purpose                                                                                                           | Current consumer                 |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `get_my_role()`             | Returns the user's authoritative role from application tables, not editable JWT/user metadata.                    | `fetchMyRole()`                  |
| `get_login_state()`         | Returns `{ role, password_set, last_full_login_at }` for cold-start restore decisions.                            | `fetchLoginState()`              |
| `get_admin_session_hours()` | Returns the admin session window; defaults to 24 hours in the app when the RPC fails or returns an invalid value. | `fetchAdminSessionHours()`       |
| `touch_full_login()`        | Records the time of a full login/claim/MFA completion.                                                            | `touchFullLogin` mutation        |
| `complete_password_setup()` | Marks first-login password setup complete after `auth.updateUser({ password })`.                                  | `completePasswordSetup` mutation |

Cold-start restore rules:

- Admin sessions restore only while `last_full_login_at` is within
  `get_admin_session_hours()`; `useAdminSessionTimeout` signs admins out when
  the absolute window expires.
- Customer and officer sessions restore only when `password_set` is true and
  `last_full_login_at` is within 30 days.
- Role-based navigation waits until `roleStatus === 'ready'`, preventing stale
  JWT metadata from briefly mounting the wrong navigator.

### 1.4 Two-Factor Authentication

**Implementation:** Native Supabase Auth TOTP MFA (`supabase.auth.mfa.*`) with QR
codes rendered by `react-native-qrcode-svg`.

```typescript
const { data } = await supabase.auth.mfa.enroll({
  factorType: 'totp',
  friendlyName: `Authenticator ${new Date().toISOString()}`,
});

const challenge = await supabase.auth.mfa.challenge({ factorId: data.id });
await supabase.auth.mfa.verify({
  factorId: data.id,
  challengeId: challenge.data.id,
  code,
});
```

- Admins must complete MFA during login. If no verified TOTP factor exists,
  stale unverified factors are removed and enrollment begins immediately.
- Officers and admins can also enroll from Settings via `MfaEnrollModal`; backing
  out before verification unenrolls the pending factor.
- `useMfaGate` reads Supabase authenticator assurance levels:
  `currentLevel === 'aal2'` means the current session is MFA-verified, and
  `nextLevel === 'aal2'` means a verified factor exists.
- App-owned backup codes and AES-encrypted TOTP secrets are not implemented;
  factor lifecycle is delegated to Supabase Auth.

---

## 2. Authorization & RBAC

### 2.1 Role Hierarchy & Permissions

#### CUSTOMER

| Permission                        | Scope             |
| --------------------------------- | ----------------- |
| Browse and subscribe to plans     | Own records only  |
| Create and track service requests | Own requests only |
| Make payments and view invoices   | Own payments only |
| Update profile and preferences    | Own profile only  |
| Use AI chatbot support            | —                 |

#### OFFICER

| Permission                           | Scope                  |
| ------------------------------------ | ---------------------- |
| View and update service requests     | Assigned requests only |
| Add activity notes and attachments   | Assigned requests only |
| Clock in/out for shifts              | Own shifts only        |
| View assigned inventory              | Own assignments only   |
| View payslip and performance metrics | Own data only          |
| Submit leave requests                | Own requests only      |

#### ADMIN

| Permission                        | Scope                |
| --------------------------------- | -------------------- |
| View and manage all users         | All records          |
| Block/unblock users with reason   | All users            |
| Create, invite, manage officers   | All officers         |
| Full CRUD on plans                | All plans            |
| View all service requests         | All requests         |
| Manual request assignment         | All requests         |
| Send bulk push notifications      | All / filtered users |
| View analytics and export reports | All data             |
| Manage payments and refunds       | All payments         |
| View audit logs                   | All logs (read-only) |
| Configure app settings            | System-wide          |
| Manage other admins               | Super admin tier     |

### 2.2 Row Level Security Implementation

```sql
-- Customers see only their own profile
CREATE POLICY users_can_view_self ON users
  FOR SELECT USING (auth.uid() = id);

-- Admins see all users
CREATE POLICY admin_view_all_users ON users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Officers see only their assigned requests
CREATE POLICY officers_view_requests ON service_requests
  FOR SELECT USING (
    auth.uid() = officer_id
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Officers see only their own shifts
CREATE POLICY officer_own_shifts ON shifts
  FOR SELECT USING (
    officer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Customers see only their own payments
CREATE POLICY customers_own_payments ON user_payments
  FOR SELECT USING (auth.uid() = user_id);
```

### 2.3 Client-Side Route Guard

```typescript
// AppNavigator.tsx — role-based navigator selection after DB role resolution
const AppNavigator = () => {
  const { isAuthenticated, user, roleStatus } = useAppSelector(state => state.auth);

  if (!isAuthenticated) return <AuthNavigator />;
  if (roleStatus !== 'ready') return <LoadingScreen />;

  switch (user.role) {
    case 'customer': return <CustomerNavigator />;
    case 'officer':  return <OfficerNavigator />;
    case 'admin':    return <AdminNavigator />;
    default:         return <AuthNavigator />;
  }
};
```

---

## 3. Data Protection

### 3.1 Encryption at Rest

| Field                | Algorithm             | Key Management               |
| -------------------- | --------------------- | ---------------------------- |
| Password hash        | Supabase Auth managed | Supabase Auth                |
| SSN / ID documents   | AES-256               | Managed KMS/Vault (planned)  |
| Bank account details | AES-256               | Managed KMS/Vault (planned)  |
| Payment tokens       | AES-256               | Managed KMS/Vault (planned)  |
| Auth refresh tokens  | Supabase Auth managed | Supabase Auth                |
| API keys / secrets   | AES-256               | Managed KMS/Vault (planned)  |
| Email address        | Plain text            | Indexed for lookup           |
| Phone number         | Plain text            | Required for Twilio delivery |

**Master Key Management:**

- Stored in: Managed KMS or Vault-backed secret storage
- Access: Application service account only
- Rotation: Every 90 days
- Audit: All access logged
- Backup: Encrypted off-site

### 3.2 Encryption in Transit

| Control             | Implementation                                 |
| ------------------- | ---------------------------------------------- |
| Protocol            | TLS 1.3 minimum; TLS 1.2 connections rejected  |
| Cipher Suites       | AEAD only (AES-GCM, ChaCha20-Poly1305)         |
| Certificate         | Let's Encrypt auto-renewing (90-day cycle)     |
| HSTS                | `max-age=31536000; includeSubDomains; preload` |
| Certificate Pinning | Planned for `/auth` and `/payments` endpoints  |

### 3.3 Password Security Policy

```
Requirements:
├── Minimum 8 characters
├── Must include: A-Z, a-z, 0-9
└── Enforced in CreatePasswordScreen before Supabase submission

Storage:
├── Password verification is delegated to Supabase Auth
├── Client validates the configured project policy before submission
├── First-login setup calls auth.updateUser({ password })
└── complete_password_setup() records that a claimed account now has a password

Reset Process:
├── resetPassword(email) calls supabase.auth.resetPasswordForEmail(email)
├── Supabase project configuration controls token expiry
├── New password must meet the same client-side complexity requirements
└── User returns through the app login flow after reset
```

---

## 4. API Security

### 4.1 Rate Limiting

The limits below are target controls for production hardening. Current client
auth flows rely on Supabase Auth and generic errors; explicit app-level lockout
and API throttling remain tracked in the checklist.

| Endpoint         | Target limit         | Target action on breach            |
| ---------------- | -------------------- | ---------------------------------- |
| Login            | 5 attempts / 15 min  | Account locked; admin alerted      |
| API endpoints    | 1,000 requests / min | Per authenticated user             |
| Payment creation | 10 requests / min    | Per user; replay attack protection |
| OTP verification | 5 attempts / 5 min   | Account locked                     |
| File upload      | 20 requests / hour   | Per user                           |

### 4.2 Input Validation

```typescript
// Zod schemas for all API inputs
const LoginSchema = z.object({
  identifier: z.string().min(1, 'Required'), // email or username for non-admins
  password: z.string().min(1, 'Required'),
});

const CreatePasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Use at least 8 characters')
    .regex(/[a-z]/, 'Include at least one lowercase letter')
    .regex(/[A-Z]/, 'Include at least one uppercase letter')
    .regex(/[0-9]/, 'Include at least one number'),
  confirm: z.string().min(1, 'Confirm your password'),
});

const CreateRequestSchema = z.object({
  requestType: z.enum(['installation', 'repair', 'upgrade', 'complaint']),
  address: z.string().min(10, 'Address too short'),
  description: z.string().max(500, 'Max 500 characters'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// Sanitize all string inputs
const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
};

// Always use parameterized queries — never raw SQL interpolation
const getUserByEmail = (email: string) => {
  return supabase.from('users').select('*').eq('email', email);
};
```

### 4.3 Security Headers

```typescript
// Content Security Policy
const cspHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' https://cdn.jsdelivr.net",
    "connect-src 'self' https://supabase.io https://api.google.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
};
```

### 4.4 CORS Configuration

```typescript
const corsOptions = {
  origin: [
    'https://primefibernet.com',
    'https://app.primefibernet.com',
    'https://admin.primefibernet.com',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
};
```

### 4.5 Request Signing for Critical Operations

```typescript
const signRequest = (payload: object, secret: string): string => {
  return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
};

const verifySignature = (payload: object, signature: string, secret: string): boolean => {
  const expected = signRequest(payload, secret);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
};
```

---

## 5. Audit Logging & Monitoring

### 5.1 Audit Log Schema

| Column          | Type        | Purpose                                             |
| --------------- | ----------- | --------------------------------------------------- |
| `timestamp`     | TIMESTAMPTZ | UTC timestamp of the action                         |
| `actor_id`      | UUID        | User who performed the action                       |
| `actor_role`    | VARCHAR     | Role at time of action                              |
| `action`        | VARCHAR     | Enum: LOGIN, BLOCK_USER, CREATE_PLAN, PAYMENT, etc. |
| `target_entity` | VARCHAR     | Table and ID of affected record                     |
| `old_values`    | JSONB       | State before change                                 |
| `new_values`    | JSONB       | State after change                                  |
| `ip_address`    | INET        | Client IP (last octet anonymized for GDPR)          |
| `status`        | VARCHAR     | SUCCESS or FAILURE                                  |

### 5.2 Logged Event Categories

| Category           | Events                                                          |
| ------------------ | --------------------------------------------------------------- |
| Authentication     | Login success/failure, logout, password reset, 2FA changes      |
| User Management    | Block/unblock, profile edits, role changes, deletion            |
| Financial          | Payment processed, refund issued, invoice generated, dispute    |
| Officer Management | Invitation, onboarding, shift assignment, payroll updates       |
| Admin Actions      | Plan CRUD, settings changes, bulk notifications, report exports |
| System             | API errors, rate limit breaches, suspicious access patterns     |

### 5.3 Real-Time Alert Rules

```typescript
const alertRules = [
  {
    name: 'Unusual Login Activity',
    trigger: 'failed_login_attempts > 5 in 15 minutes',
    action: 'Lock account + alert admin immediately',
  },
  {
    name: 'Large Data Export',
    trigger: 'exported_records > 10,000',
    action: 'Require manual approval + log',
  },
  {
    name: 'API Rate Limit Breach',
    trigger: 'requests_per_minute > threshold',
    action: 'Temporary IP ban + security alert',
  },
  {
    name: 'Suspicious Payment',
    trigger: 'amount > ₹1,00,000 OR same card 3× in one day',
    action: 'Flag for manual review',
  },
  {
    name: 'Mass Account Block',
    trigger: 'blocked_users > 10 in 1 hour',
    action: 'Alert security team immediately',
  },
];
```

---

## 6. Compliance & Standards

### 6.1 GDPR Compliance

| Right                  | Mechanism         | Implementation                                |
| ---------------------- | ----------------- | --------------------------------------------- |
| Right to Access        | Data export       | Users download all personal data as JSON      |
| Right to Erasure       | Account deletion  | Hard delete + 90-day backup retention         |
| Right to Rectification | Profile edit      | All fields editable at any time               |
| Right to Portability   | Structured export | JSON / CSV standard format                    |
| Right to Object        | Opt-out           | Marketing and SMS opt-out in profile settings |

### 6.2 Data Retention Schedule

| Data Category     | Retention Period                 |
| ----------------- | -------------------------------- |
| Active user data  | Until account deletion request   |
| Deleted user data | 90 days (recovery window)        |
| Application logs  | 12 months rolling                |
| Payment records   | 7 years (statutory requirement)  |
| Audit logs        | 2 years                          |
| Backup snapshots  | 30 days daily, 12 months monthly |

### 6.3 ISO 27001 Controls

```
Access Control:    Supabase Auth sessions · MFA · RBAC · RLS · role-gated navigation
Cryptography:      Supabase Auth password storage · TLS 1.3 in transit · AES-256 at rest where configured
Incident Mgmt:     Detection (real-time) · Response < 1 hour P1 · RTO < 4 hours
Audit:             All critical actions logged · 2-year retention
Vulnerability Mgmt: Quarterly external pentest · Daily automated scanning
```

### 6.4 PCI DSS Approach

- Raw card data **never** stored, processed, or logged by Prime Fibernet systems
- Razorpay (PCI DSS Level 1 certified) handles all card tokenization
- Card data entered directly into Razorpay-hosted WebView
- Only payment tokens and transaction IDs stored server-side
- Quarterly vulnerability scanning + annual Attestation of Compliance (AOC)

---

## 7. Incident Response Plan

### 7.1 Severity Classification

| Severity      | Trigger Conditions                                    | Response SLA |
| ------------- | ----------------------------------------------------- | ------------ |
| P1 — Critical | Data breach, unauthorized admin access, payment fraud | < 1 hour     |
| P2 — High     | Multiple failed logins, API abuse, suspicious exports | < 4 hours    |
| P3 — Medium   | Single account compromise, rate limit breach          | < 24 hours   |
| P4 — Low      | Policy violations, audit anomalies                    | < 72 hours   |

### 7.2 Response Process

```
Incident Detected (automated alert or user report)
        │
        ▼ 0–5 minutes
DETECTION: Validate incident · Assess severity · Trigger response team
        │
        ▼ 5–15 minutes
CONTAINMENT: Isolate affected accounts · Disable compromised credentials
             Preserve logs · Notify affected users
        │
        ▼ 1–24 hours
INVESTIGATION: Analyze audit trail · Determine root cause
               Identify affected systems · Assess data impact scope
        │
        ▼ 24–72 hours
REMEDIATION: Patch vulnerabilities · Reset passwords
             Restore services · Strengthen controls
        │
        ▼ T+1 hour after fix
COMMUNICATION: Notify affected users · Publish status update
               Regulatory notification if required
        │
        ▼ 7 days post-incident
POST-MORTEM: Root cause analysis · Process improvements
             Documentation update · Team training
```

---

## 8. Security Testing Schedule

| Frequency | Activity                                           | Tool                     |
| --------- | -------------------------------------------------- | ------------------------ |
| Daily     | Automated vulnerability scanning                   | Snyk (dependency checks) |
| Weekly    | Automated penetration testing                      | OWASP ZAP                |
| Monthly   | Manual security audit of new features              | Internal team            |
| Quarterly | External penetration test                          | Burp Suite Professional  |
| Annually  | Full security audit + compliance certification     | External auditor         |
| Ad-hoc    | Triggered on suspicious activity or major releases | —                        |

---

## 9. Security Compliance Checklist

> All items required before production deployment.

### Authentication & Authorization

- [x] HTTPS enforced on all endpoints — no HTTP fallback
- [x] Supabase Auth issues and refreshes application sessions
- [x] Password minimum 8 characters with upper/lower/number complexity enforced at first-login setup
- [x] Password storage and verification delegated to Supabase Auth
- [x] Supabase TOTP MFA enforced for Admin login completion
- [ ] Account lockout after 5 failed login attempts (15-minute window)
- [x] Role-based navigation guard waits for authoritative DB role resolution
- [x] RLS policies active on all Supabase tables

### Data & Encryption

- [x] AES-256 encryption for all sensitive fields at rest
- [x] TLS 1.3 enforced for all data in transit
- [ ] Master encryption keys stored in managed KMS/Vault — not in codebase
- [ ] Certificate pinning on `/auth` and `/payments` endpoints

### API Security

- [ ] Rate limiting active on login (5/15 min) and API (1,000/min) endpoints
- [x] Zod input validation on all API inputs — client and server
- [x] Supabase parameterized queries — no raw SQL string interpolation
- [ ] Content Security Policy headers configured and tested
- [ ] CSRF tokens enabled for all state-changing operations
- [ ] CORS allowlist configured — no wildcard origins

### Monitoring & Compliance

- [x] Audit logging active for all critical financial and admin actions
- [x] Sensitive data (auth tokens, card data) redacted from application logs
- [x] Sentry error tracking with PII redaction configured
- [ ] Incident response plan documented and security team trained
- [ ] Automated vulnerability scanning in CI/CD pipeline
- [ ] Quarterly external penetration test scheduled
- [x] GDPR data subject rights implemented (access, delete, export)
- [x] PCI DSS — no card data stored; Razorpay Level 1 tokenization
- [ ] Annual compliance certification (ISO 27001 / SOC 2) scheduled

---

> **Document Version:** 2.0 | **Last Updated:** June 2026 | **Next Review:** September 2026  
> **Compliance:** GDPR · ISO 27001 · SOC 2 · PCI DSS Level 1
