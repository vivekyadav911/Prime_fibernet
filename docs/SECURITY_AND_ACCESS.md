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

### 1.1 Sign-Up Process

| Step | Detail |
|------|--------|
| Email Validation | Format check, MX record verification, disposable email rejection |
| Password Strength | Min 12 chars; must include upper, lower, digit, special character |
| Terms Acceptance | Explicit checkbox required — pre-ticked boxes are prohibited |
| Email Verification | 24-hour expiry link; account locked until confirmed |
| Welcome Sequence | User created → default role assigned → welcome email dispatched |

### 1.2 Login Flow

| Step | Detail |
|------|--------|
| 1. Client Validation | Format check; 5 failed attempts locks account for 15 minutes |
| 2. Server Verification | bcrypt hash comparison (cost factor 12); blocked/suspended check |
| 3. 2FA Check (Admin) | 6-digit OTP sent via email; 5-minute expiry; 5 attempt limit |
| 4. JWT Generation | Payload: `sub`, `email`, `role`, `iat`, `exp` (30 min); signed HS256 |
| 5. Secure Storage | JWT → iOS Keychain / Android Keystore; refresh token encrypted |
| 6. Session Init | Redux auth state updated; navigate to role-appropriate MainNavigator |

### 1.3 JWT Token Management

```
JWT Access Token
├── Duration:  30 minutes
├── Storage:   iOS Keychain / Android Keystore
├── Usage:     Authorization header on every API request
└── Refresh:   Automatic — silent refresh when within 5 min of expiry

Refresh Token
├── Duration:  7 days
├── Storage:   Encrypted secure storage
├── Rotation:  New token issued on each use; old token blacklisted
└── Invalidation triggers: logout, password change, 2FA disable, account block
```

**Token refresh flow:**
```
JWT expires
     │
     ▼
Send refresh token → POST /auth/refresh
Verify: signature + expiry + blacklist
     │
     ▼ Valid
Issue new JWT + new refresh token
Old refresh token → blacklisted in DB
     │
     ▼
Replay queued in-flight requests with new JWT
```

### 1.4 Two-Factor Authentication (Admin Only)

**Implementation:** TOTP (Time-based One-Time Password) via `speakeasy` library

```typescript
// Enable 2FA — generate secret and QR code
const enable2FA = async (userId: string) => {
  const secret = speakeasy.generateSecret({
    name: 'Prime Fibernet',
    issuer: 'Prime Fibernet',
    length: 32
  });
  const qrCode = await QRCode.toDataURL(secret.otpauth_url);
  // Store secret AES-256 encrypted in DB
  // User scans QR code with authenticator app (Google Authenticator, Authy)
  // User enters 6-digit code to confirm enrollment
  return { qrCode, backupCodes };
};

// Verify TOTP during login
const verify2FA = (secret: string, token: string): boolean => {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2  // ±2 period tolerance for clock skew
  });
};
```

- Backup codes generated at enrollment (single-use, AES-256 encrypted in DB)
- 2FA disable triggers full session invalidation and security notification email

---

## 2. Authorization & RBAC

### 2.1 Role Hierarchy & Permissions

#### CUSTOMER
| Permission | Scope |
|------------|-------|
| Browse and subscribe to plans | Own records only |
| Create and track service requests | Own requests only |
| Make payments and view invoices | Own payments only |
| Update profile and preferences | Own profile only |
| Use AI chatbot support | — |

#### OFFICER
| Permission | Scope |
|------------|-------|
| View and update service requests | Assigned requests only |
| Add activity notes and attachments | Assigned requests only |
| Clock in/out for shifts | Own shifts only |
| View assigned inventory | Own assignments only |
| View payslip and performance metrics | Own data only |
| Submit leave requests | Own requests only |

#### ADMIN
| Permission | Scope |
|------------|-------|
| View and manage all users | All records |
| Block/unblock users with reason | All users |
| Create, invite, manage officers | All officers |
| Full CRUD on plans | All plans |
| View all service requests | All requests |
| Manual request assignment | All requests |
| Send bulk push notifications | All / filtered users |
| View analytics and export reports | All data |
| Manage payments and refunds | All payments |
| View audit logs | All logs (read-only) |
| Configure app settings | System-wide |
| Manage other admins | Super admin tier |

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
// AppNavigator.tsx — role-based navigator selection
const AppNavigator = () => {
  const { isAuthenticated, user } = useAppSelector(state => state.auth);

  if (!isAuthenticated) return <AuthNavigator />;

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

| Field | Algorithm | Key Management |
|-------|-----------|---------------|
| Password hash | bcrypt (cost factor 12) | Auto-salted per user |
| SSN / ID documents | AES-256 | Master key via AWS KMS |
| Bank account details | AES-256 | Master key via AWS KMS |
| Payment tokens | AES-256 | Master key via AWS KMS |
| JWT refresh tokens | AES-256 | Master key via AWS KMS |
| API keys / secrets | AES-256 | Master key via AWS KMS |
| Email address | Plain text | Indexed for lookup |
| Phone number | Plain text | Required for Twilio delivery |

**Master Key Management:**
- Stored in: AWS KMS / HashiCorp Vault
- Access: Application service account only
- Rotation: Every 90 days
- Audit: All access logged
- Backup: Encrypted off-site

### 3.2 Encryption in Transit

| Control | Implementation |
|---------|---------------|
| Protocol | TLS 1.3 minimum; TLS 1.2 connections rejected |
| Cipher Suites | AEAD only (AES-GCM, ChaCha20-Poly1305) |
| Certificate | Let's Encrypt auto-renewing (90-day cycle) |
| HSTS | `max-age=31536000; includeSubDomains; preload` |
| Certificate Pinning | Enabled for `/auth` and `/payments` endpoints |

### 3.3 Password Security Policy

```
Requirements:
├── Minimum 12 characters
├── Must include: A-Z, a-z, 0-9, special characters (!@#$%^&*)
├── Cannot match username or email
├── Cannot contain common dictionary words
└── Cannot reuse any of the last 5 passwords

Storage:
├── Algorithm: bcrypt
├── Cost factor: 12 (4,096 iterations)
├── Salt: Auto-generated per user
└── Comparison: Constant-time to prevent timing attacks

Reset Process:
├── Email token sent (1-hour expiry, single-use)
├── New password must meet complexity requirements
├── All existing sessions invalidated on reset
└── Security notification sent to registered email
```

---

## 4. API Security

### 4.1 Rate Limiting

| Endpoint | Limit | Action on Breach |
|----------|-------|-----------------|
| Login | 5 attempts / 15 min | Account locked; admin alerted |
| API endpoints | 1,000 requests / min | Per authenticated user |
| Payment creation | 10 requests / min | Per user; replay attack protection |
| OTP verification | 5 attempts / 5 min | Account locked |
| File upload | 20 requests / hour | Per user |

### 4.2 Input Validation

```typescript
// Zod schemas for all API inputs
const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(12, 'Password too short'),
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
    ALLOWED_ATTR: []
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
    "form-action 'self'"
  ].join('; '),
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
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
  maxAge: 86400
};
```

### 4.5 Request Signing for Critical Operations

```typescript
const signRequest = (payload: object, secret: string): string => {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
};

const verifySignature = (payload: object, signature: string, secret: string): boolean => {
  const expected = signRequest(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
};
```

---

## 5. Audit Logging & Monitoring

### 5.1 Audit Log Schema

| Column | Type | Purpose |
|--------|------|---------|
| `timestamp` | TIMESTAMPTZ | UTC timestamp of the action |
| `actor_id` | UUID | User who performed the action |
| `actor_role` | VARCHAR | Role at time of action |
| `action` | VARCHAR | Enum: LOGIN, BLOCK_USER, CREATE_PLAN, PAYMENT, etc. |
| `target_entity` | VARCHAR | Table and ID of affected record |
| `old_values` | JSONB | State before change |
| `new_values` | JSONB | State after change |
| `ip_address` | INET | Client IP (last octet anonymized for GDPR) |
| `status` | VARCHAR | SUCCESS or FAILURE |

### 5.2 Logged Event Categories

| Category | Events |
|----------|--------|
| Authentication | Login success/failure, logout, password reset, 2FA changes |
| User Management | Block/unblock, profile edits, role changes, deletion |
| Financial | Payment processed, refund issued, invoice generated, dispute |
| Officer Management | Invitation, onboarding, shift assignment, payroll updates |
| Admin Actions | Plan CRUD, settings changes, bulk notifications, report exports |
| System | API errors, rate limit breaches, suspicious access patterns |

### 5.3 Real-Time Alert Rules

```typescript
const alertRules = [
  {
    name: 'Unusual Login Activity',
    trigger: 'failed_login_attempts > 5 in 15 minutes',
    action: 'Lock account + alert admin immediately'
  },
  {
    name: 'Large Data Export',
    trigger: 'exported_records > 10,000',
    action: 'Require manual approval + log'
  },
  {
    name: 'API Rate Limit Breach',
    trigger: 'requests_per_minute > threshold',
    action: 'Temporary IP ban + security alert'
  },
  {
    name: 'Suspicious Payment',
    trigger: 'amount > ₹1,00,000 OR same card 3× in one day',
    action: 'Flag for manual review'
  },
  {
    name: 'Mass Account Block',
    trigger: 'blocked_users > 10 in 1 hour',
    action: 'Alert security team immediately'
  }
];
```

---

## 6. Compliance & Standards

### 6.1 GDPR Compliance

| Right | Mechanism | Implementation |
|-------|-----------|---------------|
| Right to Access | Data export | Users download all personal data as JSON |
| Right to Erasure | Account deletion | Hard delete + 90-day backup retention |
| Right to Rectification | Profile edit | All fields editable at any time |
| Right to Portability | Structured export | JSON / CSV standard format |
| Right to Object | Opt-out | Marketing and SMS opt-out in profile settings |

### 6.2 Data Retention Schedule

| Data Category | Retention Period |
|---------------|-----------------|
| Active user data | Until account deletion request |
| Deleted user data | 90 days (recovery window) |
| Application logs | 12 months rolling |
| Payment records | 7 years (statutory requirement) |
| Audit logs | 2 years |
| Backup snapshots | 30 days daily, 12 months monthly |

### 6.3 ISO 27001 Controls

```
Access Control:    Authentication (JWT, 2FA, biometric) · RBAC · RLS · Account lockout
Cryptography:      AES-256 at rest · TLS 1.3 in transit · bcrypt passwords
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

| Severity | Trigger Conditions | Response SLA |
|----------|--------------------|-------------|
| P1 — Critical | Data breach, unauthorized admin access, payment fraud | < 1 hour |
| P2 — High | Multiple failed logins, API abuse, suspicious exports | < 4 hours |
| P3 — Medium | Single account compromise, rate limit breach | < 24 hours |
| P4 — Low | Policy violations, audit anomalies | < 72 hours |

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

| Frequency | Activity | Tool |
|-----------|----------|------|
| Daily | Automated vulnerability scanning | Snyk (dependency checks) |
| Weekly | Automated penetration testing | OWASP ZAP |
| Monthly | Manual security audit of new features | Internal team |
| Quarterly | External penetration test | Burp Suite Professional |
| Annually | Full security audit + compliance certification | External auditor |
| Ad-hoc | Triggered on suspicious activity or major releases | — |

---

## 9. Security Compliance Checklist

> All items required before production deployment.

### Authentication & Authorization
- [x] HTTPS enforced on all endpoints — no HTTP fallback
- [x] JWT access token expiry set to 30 minutes
- [x] Password minimum 12 characters with complexity requirements enforced
- [x] bcrypt cost factor 12+ for all password hashing
- [x] TOTP-based 2FA enforced for all Admin accounts
- [x] Account lockout after 5 failed login attempts (15-minute window)
- [x] Role-based navigation guard implemented client-side
- [x] RLS policies active on all Supabase tables

### Data & Encryption
- [x] AES-256 encryption for all sensitive fields at rest
- [x] TLS 1.3 enforced for all data in transit
- [x] Master encryption keys stored in AWS KMS — not in codebase
- [x] Certificate pinning on `/auth` and `/payments` endpoints

### API Security
- [x] Rate limiting active on login (5/15 min) and API (1,000/min) endpoints
- [x] Zod input validation on all API inputs — client and server
- [x] Supabase parameterized queries — no raw SQL string interpolation
- [x] Content Security Policy headers configured and tested
- [x] CSRF tokens enabled for all state-changing operations
- [x] CORS allowlist configured — no wildcard origins

### Monitoring & Compliance
- [x] Audit logging active for all critical financial and admin actions
- [x] Sensitive data (JWT, card data) redacted from application logs
- [x] Sentry error tracking with PII redaction configured
- [x] Incident response plan documented and security team trained
- [x] Automated vulnerability scanning in CI/CD pipeline
- [x] Quarterly external penetration test scheduled
- [x] GDPR data subject rights implemented (access, delete, export)
- [x] PCI DSS — no card data stored; Razorpay Level 1 tokenization
- [x] Annual compliance certification (ISO 27001 / SOC 2) scheduled

---

> **Document Version:** 2.0 | **Last Updated:** June 2026 | **Next Review:** September 2026  
> **Compliance:** GDPR · ISO 27001 · SOC 2 · PCI DSS Level 1
