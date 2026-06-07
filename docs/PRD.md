# Prime Fibernet — Product Requirements Document

> **Version:** 2.0 | **Date:** June 2026 | **Status:** Active Development  
> **Platform:** iOS · Android · Web (Unified React Native App)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Goals & Success Metrics](#goals--success-metrics)
3. [User Roles & Personas](#user-roles--personas)
4. [Feature Requirements](#feature-requirements)
   - [Authentication](#authentication)
   - [Customer Features](#customer-features)
   - [Officer Features](#officer-features)
   - [Admin Features](#admin-features)
5. [Non-Functional Requirements](#non-functional-requirements)
6. [Out of Scope](#out-of-scope)

---

## Executive Summary

Prime Fibernet is an enterprise ISP management platform built as a single unified React Native application serving three user roles — **Customer**, **Officer (Field Technician)**, and **Admin**. The platform handles the full lifecycle of internet service: plan discovery, subscription, payment, field service requests, officer dispatch, and business analytics.

The system replaces fragmented legacy tools with a single codebase that delivers native iOS and Android apps plus a web-optimized Admin panel — all from one monorepo.

---

## Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| Customer self-service | % payments made via app | > 80% |
| Reduce support load | Tickets resolved via chatbot | > 40% |
| Officer efficiency | Average request resolution time | < 4 hours |
| Subscription growth | Month-over-month active subscriber growth | +10% MoM |
| Uptime | Platform availability | 99.9% |
| App performance | App cold start time | < 3 seconds |

---

## User Roles & Personas

### Customer (End User)
A residential or business internet subscriber. Primary device: smartphone (Android or iOS). Key needs: check plan status, renew subscription, raise service complaints, pay bills without calling support.

### Officer (Field Technician)
An on-ground technician assigned to installation, repair, or upgrade jobs. Primary device: Android smartphone. Key needs: see today's jobs, navigate to customer location, update job status, log attendance, track assigned equipment.

### Admin (Management)
Internal operations staff managing the business. Primary device: desktop/laptop web browser. Key needs: manage users and officers, monitor revenue, configure plans, view analytics, handle escalations.

---

## Feature Requirements

### Authentication

| ID | Feature | Priority | Notes |
|----|---------|----------|-------|
| A-01 | Email/password sign-up with verification | P0 | 24-hour verification link |
| A-02 | Login with JWT + refresh token rotation | P0 | 30-min JWT, 7-day refresh |
| A-03 | Admin TOTP two-factor authentication | P0 | speakeasy library |
| A-04 | Forgot password with email reset | P1 | 1-hour token expiry |
| A-05 | Biometric login (Face ID / Fingerprint) | P2 | After first password login |
| A-06 | Role-based navigation guard | P0 | Customer / Officer / Admin routes |
| A-07 | Account lockout after 5 failed attempts | P0 | 15-minute lockout window |

---

### Customer Features

#### Dashboard
- Active plan card with speed, expiry date, and status badge
- Payment due banner shown 7 days before expiry with one-tap renewal
- Last 3 service requests with real-time status chips
- Quick action row: Renew, Raise Request, Pay Bill, Support
- New user empty state with plan browsing CTA

#### Plan Management
- Browsable plan catalog with speed, price, validity, and features
- Filter by speed tier (Basic / Standard / Premium / Business)
- Sort by price or speed
- Plan detail bottom sheet with feature comparison vs current plan
- Subscribe CTA that triggers payment flow

#### Payments
- Razorpay / Easebuzz payment gateway integration
- Payment history with date, amount, plan name, and status
- PDF invoice download per successful transaction
- Filter by date range (30d / 3m / 6m / custom)
- Failed payment retry option

#### Service Requests
- Raise requests: Installation, Repair, Upgrade, Complaint
- Address auto-fill from profile (overridable)
- Description field (500-character limit)
- Optional photo attachment (max 3, 5MB each)
- Real-time status tracking via Supabase Realtime
- Cancel option for Pending status requests

#### Profile & Settings
- Edit name, phone, and address
- Email read-only after verification
- Profile photo upload with crop
- Push notification preferences (payment reminders, request updates, promotions)
- Delete account with 90-day data retention notice

#### AI Chatbot Support
- Answers plan queries, request status, outage FAQs
- Escalates to human agent on low confidence
- 30-minute session inactivity timeout
- Powered by Google Gemini API via Edge Function

---

### Officer Features

#### Dashboard
- Today's shift card with clock-in button and hours logged
- Assigned request counts by status (New / In Progress / Done)
- Next 3 pending requests with priority and distance
- Weekly performance: completed vs target
- Leave balance chips

#### Request Management
- Request queue sorted by priority (P0 first) then creation date
- Status update flow: Accept → In Transit → On Site → Working → Resolved
- Activity note required before resolving
- Optional photo attachment at each step
- One-tap navigation to customer address (Google Maps / Apple Maps)

#### Map View
- Google Maps with live officer location
- Request pins colored by priority (red / amber / green)
- Request card on pin tap with navigation CTA
- Offline map tile caching for last-known service areas
- List/map toggle

#### Shifts & Attendance
- Clock-in / clock-out with GPS coordinates
- Overtime alert if not clocked out 30 min after scheduled end
- Monthly attendance calendar
- Leave request submission with document attachment
- Leave balance display

#### Inventory & Payslip
- View assigned equipment (routers, cables, tools)
- Mark items returned or damaged with notes
- Monthly payslip with base, bonuses, deductions
- PDF payslip download
- 12-month earnings history

---

### Admin Features

#### Dashboard
- KPI cards: Active Subscribers, MRR, Open Requests, Officers Online
- Revenue trend chart (last 30 days)
- Request pipeline funnel
- Expiring subscriptions table (next 7 days)
- Recent admin activity feed (last 20 events)
- Officer online status map

#### User Management
- Searchable, sortable user table
- Filter by role, subscription status, registration date, blocked status
- User detail drawer: profile, subscription, payment, request history
- Block / Unblock with required reason (audit logged)
- Bulk CSV export

#### Officer Management
- Officer list with region, availability, and shift status
- Email invitation with auto-generated temp password
- Region assignment dropdown
- Shift assignment calendar
- Salary configuration (base, task bonus, allowances)
- Performance metrics and attendance history
- Soft-delete (historical data preserved)

#### Plan Management
- Create, edit, and deactivate plans
- Fields: name, speed, price, validity, features array, active status
- Deactivating a plan does not cancel existing subscriptions
- Plan preview before publish

#### Request Oversight
- View all requests across all users
- Manual officer assignment
- Priority override
- Bulk assignment to one officer
- Escalation flag for critical requests

#### Analytics & Reports
- Revenue by period with CSV / PDF export
- Subscription growth (new vs churned)
- Request TAT by type and officer
- Officer attendance and overtime report
- Date range picker with presets

#### Bulk Notifications
- Send push to: All Users, Active Subscribers, Specific Region
- Message preview before send
- Delivery report (sent / delivered / opened)
- Rate limited: 10 bulk sends/day

#### Audit & Settings
- Audit log viewer (read-only, filterable, exportable)
- Company settings: name, logo, support contact, notification templates
- Feature flags: chatbot, new registrations
- API key management (obfuscated display)

---

## Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | App cold start < 3s; API P95 response < 2s |
| Availability | 99.9% uptime SLA |
| Security | TLS 1.3, AES-256 at rest, bcrypt (cost 12), JWT 30-min expiry |
| Compliance | GDPR, ISO 27001, SOC 2, PCI DSS Level 1 |
| Offline | Core read access and mutation queue for Customer and Officer |
| Accessibility | WCAG 2.1 AA; VoiceOver and TalkBack tested per release |
| Bundle size | < 50MB uncompressed |
| Scalability | Supabase auto-scales; Edge Functions stateless and horizontally scalable |

---

## Out of Scope (v2.0)

- Multi-tenant / white-label support
- Native desktop (macOS / Windows) apps
- Self-hosted Supabase deployment
- Third-party integrations beyond the defined external services
- Custom SMS gateway (Twilio only in v2)

---

> **Document Version:** 2.0 | **Last Updated:** June 2026 | **Next Review:** September 2026
