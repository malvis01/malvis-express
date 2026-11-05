-- Customer shipment requests and manual bank-transfer payments
alter table public.deliveries alter column tracking_number set default '';

create or replace function private.assign_tracking_number()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_admin() or new.tracking_number is null or btrim(new.tracking_number) = '' then
    new.tracking_number := 'MX-REQ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  end if;
  return new;
end;
$$;
revoke all on function private.assign_tracking_number() from public, anon, authenticated;

create table public.payment_instructions (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null unique references public.deliveries(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  currency_code text not null default 'NGN' check (char_length(currency_code) = 3),
  bank_name text not null,
  account_name text not null,
  account_number text not null,
  payment_reference text,
  customer_message text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  transaction_reference text,
  customer_note text,
  status text not null default 'submitted' check (status in ('submitted','confirmed','rejected')),
  admin_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index payment_proofs_delivery_id_idx on public.payment_proofs(delivery_id);
create index payment_proofs_customer_id_idx on public.payment_proofs(customer_id);
alter table public.payment_instructions enable row level security;
alter table public.payment_proofs enable row level security;

create policy "Customers can read payment instructions for own deliveries"
on public.payment_instructions for select to authenticated
using (exists (select 1 from public.deliveries d where d.id = payment_instructions.delivery_id and d.customer_id = (select auth.uid())));
create policy "Admins can manage payment instructions"
on public.payment_instructions for all to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Customers can read own payment proofs and admins can read all"
on public.payment_proofs for select to authenticated
using (customer_id = (select auth.uid()) or (select private.is_admin()));
create policy "Customers can submit proof for own unconfirmed delivery"
on public.payment_proofs for insert to authenticated
with check (
 customer_id = (select auth.uid()) and status = 'submitted' and reviewed_by is null and reviewed_at is null
 and exists (select 1 from public.deliveries d where d.id = payment_proofs.delivery_id and d.customer_id = (select auth.uid()) and d.status = 'awaiting_payment' and d.tracking_code_issued = false)
);
create policy "Admins can review payment proofs"
on public.payment_proofs for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "Customers can submit shipment requests"
on public.deliveries for insert to authenticated
with check (
 customer_id = (select auth.uid()) and status = 'booking_created' and tracking_code_issued = false
 and tracking_code_issued_at is null and tracking_code_issued_by is null and quoted_total is null and delivered_at is null
);
grant select, insert, update on public.payment_instructions to authenticated;
grant select, insert, update on public.payment_proofs to authenticated;
grant insert on public.deliveries to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs','payment-proofs',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp','application/pdf'];
create policy "Customers upload payment proof to own folder"
on storage.objects for insert to authenticated
with check (
 bucket_id='payment-proofs' and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists (select 1 from public.deliveries d where d.id::text=(storage.foldername(name))[2] and d.customer_id=(select auth.uid()) and d.status='awaiting_payment' and d.tracking_code_issued=false)
);
create policy "Customers read own payment proof files"
on storage.objects for select to authenticated
using (bucket_id='payment-proofs' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Admins read payment proof files"
on storage.objects for select to authenticated
using (bucket_id='payment-proofs' and (select private.is_admin()));
comment on table public.payment_instructions is 'Admin-issued bank transfer details and delivery quote for a shipment.';
comment on table public.payment_proofs is 'Customer-submitted transfer evidence; only administrators can confirm or reject.';
