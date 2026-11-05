-- Keep internally generated shipment references consistent with the public tracking endpoint.
-- MX-REQ identifies Malvis Express-managed records; it is not a carrier-issued tracking number.
create or replace function private.assign_tracking_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() or new.tracking_number is null or btrim(new.tracking_number) = '' then
    new.tracking_number := 'MX-REQ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  end if;
  return new;
end;
$$;
