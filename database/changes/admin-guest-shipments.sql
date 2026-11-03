-- Applied to Supabase project bkmctunbzcusxhfaoglv on 2026-11-03.
-- Allows administrator-created guest shipments before customer registration is launched.
alter table public.deliveries alter column customer_id drop not null;
alter table public.deliveries add column if not exists pickup_location_label text;
alter table public.deliveries add column if not exists dropoff_location_label text;
