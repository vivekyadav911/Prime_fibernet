-- ifsc_code was varchar(11) which is too short for AES-GCM ciphertext.
-- Widen to text so encrypted values (encrypted:<base64>, ~80+ chars) fit.
ALTER TABLE public.officer_bank_details
  ALTER COLUMN ifsc_code TYPE text;
