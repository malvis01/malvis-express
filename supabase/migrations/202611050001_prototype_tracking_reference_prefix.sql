-- Keep internal shipment references consistent with the public tracking endpoint.
-- The MX-REQ prefix identifies Malvis Express-managed shipment records; it does not imply a carrier-issued tracking number.
create or replace function private.assign_tracking_number()
returns trigger language plpgsql set search_path = ''
as $$ begin
  if new.tracking_number is null or btrim(new.tracking_number) = '' then
    new.tracking_number := 'MX-REQ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  end if;
  return new;
end; $$;
