-- Attach the existing tracking-number generator and allow admins to issue a pending code.
drop trigger if exists deliveries_assign_tracking_number on public.deliveries;
create trigger deliveries_assign_tracking_number
before insert on public.deliveries
for each row execute function private.assign_tracking_number();

create or replace function public.admin_issue_tracking_code(p_delivery_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  issued_code text;
begin
  if not private.is_admin() then
    raise insufficient_privilege using message = 'Administrator access required.';
  end if;

  update public.deliveries
     set tracking_code_issued = true,
         tracking_code_issued_at = pg_catalog.now(),
         tracking_code_issued_by = (select auth.uid())
   where id = p_delivery_id
     and tracking_code_issued = false
  returning tracking_number into issued_code;

  if issued_code is null then
    raise no_data_found using message = 'Shipment was not found or its tracking code has already been issued.';
  end if;

  return issued_code;
end;
$$;

revoke all on function public.admin_issue_tracking_code(uuid) from public, anon;
grant execute on function public.admin_issue_tracking_code(uuid) to authenticated;
