-- Guest tracking uses a verified public Edge Function to submit receipts.
-- The function validates the tracking code and receiver phone before using service-role access.
alter table public.payment_proofs alter column customer_id drop not null;
