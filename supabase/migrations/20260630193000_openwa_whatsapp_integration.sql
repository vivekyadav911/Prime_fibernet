create table if not exists public.whatsapp_settings (
  id uuid primary key default gen_random_uuid(),
  enabled boolean not null default false,
  gateway_url text not null default 'http://localhost:2785',
  gateway_session_id text not null default '',
  notify_payment boolean not null default true,
  notify_invoice boolean not null default true,
  notify_complaints boolean not null default false,
  notify_activations boolean not null default false,
  payment_receipt_template text not null default 'Dear {{customer_name}}, we received your payment of Rs {{amount}} on {{date}}. Receipt #{{receipt_number}}. Thank you! - Prime Fibernet',
  invoice_template text not null default 'Dear {{customer_name}}, your invoice #{{invoice_number}} of Rs {{amount}} is due on {{due_date}}. Please pay to avoid service interruption. - Prime Fibernet',
  complaint_update_template text not null default 'Dear {{customer_name}}, your complaint #{{complaint_id}} has been updated to *{{status}}*. {{message}} - Prime Fibernet',
  activation_template text not null default 'Dear {{customer_name}}, your Prime Fibernet connection has been activated! Plan: {{plan_name}}. Welcome aboard!',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists whatsapp_settings_singleton
  on public.whatsapp_settings ((true));

insert into public.whatsapp_settings (enabled)
values (false)
on conflict do nothing;

create table if not exists public.whatsapp_logs (
  id uuid primary key default gen_random_uuid(),
  recipient_phone text not null,
  recipient_name text,
  message_type text not null check (
    message_type in ('payment_receipt', 'invoice', 'complaint_update', 'activation', 'manual')
  ),
  reference_id uuid,
  reference_type text,
  status text not null default 'pending' check (
    status in ('pending', 'sent', 'failed', 'skipped')
  ),
  error_message text,
  wa_message_id text,
  sent_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_logs_ref_idx
  on public.whatsapp_logs (reference_type, reference_id);

create index if not exists whatsapp_logs_status_idx
  on public.whatsapp_logs (status, created_at desc);

create index if not exists whatsapp_logs_phone_idx
  on public.whatsapp_logs (recipient_phone, created_at desc);

alter table public.whatsapp_settings enable row level security;
alter table public.whatsapp_logs enable row level security;

drop policy if exists admin_rw_whatsapp_settings on public.whatsapp_settings;
create policy admin_rw_whatsapp_settings
  on public.whatsapp_settings
  for all
  to authenticated
  using (public.is_admin_user() or public.is_admin())
  with check (public.is_admin_user() or public.is_admin());

drop policy if exists staff_read_whatsapp_logs on public.whatsapp_logs;
create policy staff_read_whatsapp_logs
  on public.whatsapp_logs
  for select
  to authenticated
  using (
    public.is_admin_user()
    or public.is_admin()
    or exists (
      select 1
      from public.officers
      where officers.user_id = auth.uid()
         or officers.auth_user_id = auth.uid()
    )
  );

drop policy if exists service_insert_logs on public.whatsapp_logs;
create policy service_insert_logs
  on public.whatsapp_logs
  for insert
  to service_role
  with check (true);

drop policy if exists service_update_logs on public.whatsapp_logs;
create policy service_update_logs
  on public.whatsapp_logs
  for update
  to service_role
  using (true)
  with check (true);
