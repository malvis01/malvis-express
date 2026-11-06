create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  tracking_number text not null,
  sender_type text not null check (sender_type in ('receiver','admin')),
  message text not null check (char_length(message) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists support_messages_delivery_created_idx on public.support_messages (delivery_id, created_at);
alter table public.support_messages enable row level security;
revoke all on public.support_messages from anon, authenticated;
grant select, insert on public.support_messages to authenticated;
create policy "Admins can read shipment support messages" on public.support_messages for select to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin'));
create policy "Admins can reply to shipment support messages" on public.support_messages for insert to authenticated
with check (sender_type = 'admin' and exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin'));
