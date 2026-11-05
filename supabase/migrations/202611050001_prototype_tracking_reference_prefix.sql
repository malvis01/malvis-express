-- Use clearly identifiable internal demo references until the approved carrier API is connected.
create or replace function private.assign_tracking_number()
returns trigger language plpgsql set search_path = ''
as $$ begin
  if new.tracking_number is null or btrim(new.tracking_number) = '' then
    new.tracking_number := 'DEMO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  end if;
  return new;
end; $$;
