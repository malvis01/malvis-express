-- Align database-generated references with the public tracking endpoint.
-- Keep the MX-REQ prefix and use 16 hexadecimal characters after it.
create or replace function private.assign_tracking_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() or new.tracking_number is null or btrim(new.tracking_number) = '' then
    new.tracking_number := 'MX-REQ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
  end if;
  return new;
end;
$$;
