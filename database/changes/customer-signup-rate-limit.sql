-- Private per-IP customer signup throttle; invoked only by the customer-register Edge Function using service_role.
create schema if not exists private;

create table if not exists private.customer_signup_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default pg_catalog.now()
);

create index if not exists customer_signup_attempts_ip_created_idx
  on private.customer_signup_attempts (ip_hash, created_at desc);

create or replace function public.check_customer_signup_rate_limit(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_count integer;
begin
  if p_ip_hash is null or length(p_ip_hash) < 32 then
    return false;
  end if;

  delete from private.customer_signup_attempts
   where created_at < pg_catalog.now() - interval '24 hours';

  select count(*)::integer
    into attempt_count
    from private.customer_signup_attempts
   where ip_hash = p_ip_hash
     and created_at >= pg_catalog.now() - interval '1 hour';

  if attempt_count >= 5 then
    return false;
  end if;

  insert into private.customer_signup_attempts (ip_hash) values (p_ip_hash);
  return true;
end;
$$;

revoke all on function public.check_customer_signup_rate_limit(text) from public, anon, authenticated;
grant execute on function public.check_customer_signup_rate_limit(text) to service_role;
