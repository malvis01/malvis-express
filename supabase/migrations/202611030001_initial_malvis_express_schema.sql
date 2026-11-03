-- Initial Malvis Express schema
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone_e164 text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  tracking_number text not null unique,
  customer_id uuid references public.profiles(id) on delete set null,
  delivery_type text not null default 'parcel' check (delivery_type in ('food','groceries','document','parcel','business','cargo','other')),
  service_scope text not null default 'domestic' check (service_scope in ('local','domestic','international')),
  status text not null default 'booking_created' check (status in ('booking_created','awaiting_payment','payment_confirmed','rider_assigned','package_picked_up','at_sorting_facility','in_transit','customs_clearance','out_for_delivery','delivered','cancelled','failed_delivery','returned','delayed','held_for_inspection')),
  pickup_location_label text not null,
  dropoff_location_label text not null,
  pickup_contact_name text not null,
  pickup_contact_phone text not null,
  dropoff_contact_name text not null,
  dropoff_contact_phone text not null,
  customer_note text,
  quoted_total numeric(14,2) check (quoted_total is null or quoted_total >= 0),
  currency_code text not null default 'NGN' check (char_length(currency_code) = 3),
  tracking_code_issued boolean not null default false,
  tracking_code_issued_at timestamptz,
  tracking_code_issued_by uuid references auth.users(id) on delete set null,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  status text not null check (status in ('booking_created','awaiting_payment','payment_confirmed','rider_assigned','package_picked_up','at_sorting_facility','in_transit','customs_clearance','out_for_delivery','delivered','cancelled','failed_delivery','returned','delayed','held_for_inspection')),
  location_label text,
  description text,
  occurred_at timestamptz not null default now(),
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  table_name text not null,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index deliveries_customer_id_idx on public.deliveries(customer_id);
create index deliveries_created_at_idx on public.deliveries(created_at desc);
create index deliveries_status_idx on public.deliveries(status);
create index shipment_events_delivery_occurred_idx on public.shipment_events(delivery_id, occurred_at desc);
create index profiles_phone_e164_idx on public.profiles(phone_e164);

create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at = now(); return new; end; $$;

create or replace function private.assign_tracking_number()
returns trigger language plpgsql set search_path = ''
as $$ begin
  if new.tracking_number is null or btrim(new.tracking_number) = '' then
    new.tracking_number := 'MX-REQ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  end if;
  return new;
end; $$;

create or replace function private.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = ''
as $$ begin
  insert into public.profiles (id, display_name, phone_e164)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''), nullif(new.phone, ''))
  on conflict (id) do update set phone_e164 = excluded.phone_e164, updated_at = now();
  return new;
end; $$;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (
  select 1 from public.user_roles ur
  where ur.user_id = (select auth.uid()) and ur.role = 'admin'
); $$;

create or replace function private.write_audit_log()
returns trigger language plpgsql security definer set search_path = ''
as $$ begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs(actor_id, action, table_name, record_id, new_data)
    values ((select auth.uid()), tg_op, tg_table_name, new.id::text, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs(actor_id, action, table_name, record_id, old_data, new_data)
    values ((select auth.uid()), tg_op, tg_table_name, new.id::text, to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into public.audit_logs(actor_id, action, table_name, record_id, old_data)
    values ((select auth.uid()), tg_op, tg_table_name, old.id::text, to_jsonb(old));
    return old;
  end if;
end; $$;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.assign_tracking_number() from public, anon, authenticated;
revoke all on function private.handle_new_auth_user() from public, anon, authenticated;
revoke all on function private.is_admin() from public, anon;
revoke all on function private.write_audit_log() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger deliveries_set_updated_at before update on public.deliveries for each row execute function private.set_updated_at();
create trigger deliveries_assign_tracking_number before insert on public.deliveries for each row execute function private.assign_tracking_number();
create trigger auth_user_profile_created after insert on auth.users for each row execute function private.handle_new_auth_user();
create trigger deliveries_audit after insert or update or delete on public.deliveries for each row execute function private.write_audit_log();
create trigger shipment_events_audit after insert on public.shipment_events for each row execute function private.write_audit_log();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.deliveries enable row level security;
alter table public.shipment_events enable row level security;
alter table public.audit_logs enable row level security;

create policy "Users can read own profile and admins can read all" on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select private.is_admin()));
create policy "Users can update own profile" on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "Users can read own role" on public.user_roles for select to authenticated
using (user_id = (select auth.uid()));
create policy "Admins can read deliveries" on public.deliveries for select to authenticated
using ((select private.is_admin()));
create policy "Customers can read their own deliveries" on public.deliveries for select to authenticated
using (customer_id = (select auth.uid()));
create policy "Admins can create deliveries" on public.deliveries for insert to authenticated
with check ((select private.is_admin()));
create policy "Admins can update deliveries" on public.deliveries for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins can delete deliveries" on public.deliveries for delete to authenticated
using ((select private.is_admin()));
create policy "Admins can read shipment events" on public.shipment_events for select to authenticated
using ((select private.is_admin()));
create policy "Customers can read events for their deliveries" on public.shipment_events for select to authenticated
using (exists (select 1 from public.deliveries d where d.id = shipment_events.delivery_id and d.customer_id = (select auth.uid())));
create policy "Admins can add shipment events" on public.shipment_events for insert to authenticated
with check ((select private.is_admin()));
create policy "Admins can read audit logs" on public.audit_logs for select to authenticated
using ((select private.is_admin()));

grant select, update on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select, insert, update, delete on public.deliveries to authenticated;
grant select, insert on public.shipment_events to authenticated;
grant select on public.audit_logs to authenticated;

comment on table public.deliveries is 'Shipment bookings and current operational status. Tracking numbers are generated by the database.';
comment on table public.shipment_events is 'Append-only shipment journey timeline entries.';
comment on table public.user_roles is 'Privileged roles assigned by the project owner; users cannot grant themselves roles.';
comment on table public.audit_logs is 'Admin-only audit history for shipment and timeline changes.';
