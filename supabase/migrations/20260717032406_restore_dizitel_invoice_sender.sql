UPDATE public.general_settings
SET
  company_email = 'invoices@dizitel.in',
  company_website = 'https://dizitel.in',
  smtp_user = 'Prime Fibernet Billing <invoices@dizitel.in>',
  updated_at = NOW()
WHERE id IS NOT NULL;
