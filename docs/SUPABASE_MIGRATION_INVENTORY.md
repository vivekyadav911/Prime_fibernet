# Supabase Migration Inventory

> **Source (production):** `oypkgopmneedyshuzmnh` — https://oypkgopmneedyshuzmnh.supabase.co  
> **Target (unified RN app):** `afsaadjdhqnvsgkmmupq` — https://afsaadjdhqnvsgkmmupq.supabase.co  
> **Audited:** 2026-06-07

## Summary

| Metric | Old project | New project (pre-migration) |
|--------|-------------|----------------------------|
| Public business tables | **69** | **15** |
| Edge Functions | **18 active** | **0 deployed** |
| Storage buckets | **5** | **0** |
| Auth users (est.) | **3,700+** | **0** |
| Largest tables | `users` (3,729), `notification_queue` (4,181), `officer_location_history` (7,493) | Seed `plans` (3) |

## Auth & identity

| Asset | Old | Rows | New gap |
|-------|-----|------|---------|
| `auth.users` | Login identities | ~3,700+ | Empty — migrate via Admin API |
| `public.users` | CRM customers | 3,729 | v2.0 slim schema — extend columns + import |
| `public.profiles` | Auth profile sync | 1 | Missing table |
| `public.admins` | Admin accounts | 3 | v2.0 uses `users.role` — bridge required |
| `public.admin_audit_log` | Admin audit | 0 | Different from `audit_logs` |

**Old `users` key columns:** `id`, `auth_user_id`, `email`, `name`, `phone`, `city`, `address`, `is_blocked`, legacy billing fields.  
**Old `officers`:** email-primary, `auth_user_id`, rich HR fields — not `user_id` FK.

## Customer / billing

| Table | Rows | Notes |
|-------|------|-------|
| `plans` | 29 | Old uses `speed` VARCHAR; new uses `speed_mbps` |
| `subscriptions` | 0 | |
| `user_payments` | 21 | |
| `invoices` | 0 | |
| `invoice_history` | 8 | |
| `invoice_settings` | 12 | |
| `payment_notifications` | 4 | |
| `upi_qr_codes` | 2 | |

## Service / CRM

| Table | Rows |
|-------|------|
| `service_requests` | 18 |
| `request_activities` | 90 |
| `ticket_sla_tracking` | 9 |
| `ticket_comments` | 0 |
| `ticket_attachments` | 0 |
| `ticket_ratings` | 0 |

## Officer / HR / payroll

| Table | Rows |
|-------|------|
| `officers` | 7 |
| `officer_onboarding` | 22 |
| `officer_attendance` | 38 |
| `officer_shifts` | 13 |
| `officer_shift_requests` | 26 |
| `attendance_approval_requests` | 18 |
| `officer_contracts` | 3 |
| `officer_payslips` | 1 |
| `officer_pay_runs` | 2 |
| `officer_payslip_adjustment_audit` | 35 |
| `officer_roles` | 4 |
| `officer_role_permissions` | 4 |
| `officer_location_history` | 7,493 |

## Inventory

| Table | Rows |
|-------|------|
| `inventory_categories` | 7 |
| `inventory_items` | 5 |
| `inventory_transactions` | 10 |
| `inventory_stock_update_requests` | 3 |

## Notifications

| Table | Rows |
|-------|------|
| `notification_queue` | 4,181 |
| `user_notification_audit_history` | 2,175 |
| `notification_sent_history` | 3 |
| `shift_notifications` | 3 |

## Chatbot / knowledge

| Table | Rows |
|-------|------|
| `company_knowledge` | 16 |
| `knowledge_base` | 10 |
| `knowledge_ingestion_logs` | 25 |
| `chatbot_conversations` | 0 |

## Company / settings

| Table | Rows |
|-------|------|
| `company_info` | 1 |
| `general_settings` | 1 |
| `faqs` | 8 |
| `testimonials` | 3 |
| `allowed_onboarding_emails` | 2 |
| `performance_rules` | 9 |

## Admin ops

| Table | Rows |
|-------|------|
| `admin_backup_files` | 1 |
| `admin_locations` | 2 |

## Storage buckets (old)

| Bucket | Public |
|--------|--------|
| `officer-documents` | yes |
| `user-profiles` | yes |
| `invoices` | no |
| `payslips` | yes |
| `admin-backups` | no |

## Edge Functions (old — 18 active)

`admin-backup-export`, `daily-backup-cron`, `create-payment-order`, `verify-payment`, `razorpay-webhook`, `easebuzz-*`, `send-payment-invoice`, `send-custom-gst-invoice`, `process-shift-checkin`, `process-shift-checkout`, `generate-payslip`, `gemini-rag-chatbot`, `ingest-company-knowledge`, `send-invitation-email`, test helpers.

## Tables on old but not in v2.0 base schema

`profiles`, `admins`, `admin_audit_log`, `admin_backup_files`, `admin_locations`, `invoices`, `invoice_history`, `invoice_settings`, `payment_notifications`, `upi_qr_codes`, `officer_onboarding`, `officer_contracts`, `officer_attendance`, `officer_shifts`, `officer_shift_requests`, `officer_leaves`, `officer_payslips`, `officer_pay_runs`, `officer_payslip_*`, `attendance_approval_requests`, `officer_roles`, `officer_role_permissions`, `inventory_*`, `shift_*`, `notification_*`, `user_notification_audit_history`, `ticket_*`, `company_*`, `faqs`, `testimonials`, `general_settings`, `allowed_onboarding_emails`, `performance_rules`, `officer_performance_wallet`, `knowledge_*`, `chatbot_*`, `user_action_logs`, `officer_action_logs`, `officer_location_history`, `notifications`, `owners`, `officer_documents`, `officer_salary_payments`, `chatbot_response_cache`.

## Migration mapping decisions

1. **Preserve legacy `users.id`** for FK integrity; add `auth_user_id` column on target.
2. **Admins:** import `admins` table + set `users.role = 'admin'` where email matches.
3. **Plans:** replace 3 seed rows with 29 production plans.
4. **`is_admin()`:** extend to check `admins.auth_user_id = auth.uid()` OR JWT role metadata.
5. **Auth passwords:** re-import auth users via Admin API; users without auth remain CRM-only.

## Migration results (2026-06-07)

| Table | Migrated rows | Status |
|-------|---------------|--------|
| `users` | 3,729+ | OK |
| `plans` | 29 | OK (replaced seed) |
| `faqs` | 8 | OK |
| `company_info` | 1 | OK |
| `general_settings` | 1 | OK |
| `notification_queue` | 4,181 | OK |
| `admins` | 3 | OK |
| Auth users | ~3,700 | OK (passwords require reset) |

**Partial / skipped:** Officer HR tables where legacy DB stored email/officer codes instead of UUID FKs (`officer_attendance`, `service_requests`, etc.). Re-run with officer ID mapping if full HR parity is required.

## Scripts

- [`scripts/migrate-legacy-data.mjs`](../scripts/migrate-legacy-data.mjs) — REST export/import with row-count validation
- [`scripts/validate-migration.mjs`](../scripts/validate-migration.mjs) — post-migration smoke counts
- [`scripts/migration-target-columns.mjs`](../scripts/migration-target-columns.mjs) — column filter map for REST upserts
- Migrations in [`supabase/migrations/`](../supabase/migrations/) — `20260607100000_*` enterprise legacy schema
