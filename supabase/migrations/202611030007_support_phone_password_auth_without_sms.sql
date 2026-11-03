-- Store the phone number supplied by the phone-only UI when Auth uses an internal email identifier.
create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, phone_e164)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'phone_e164', ''), nullif(new.phone, ''))
  )
  on conflict (id) do update
    set display_name = coalesce(excluded.display_name, public.profiles.display_name),
        phone_e164 = coalesce(excluded.phone_e164, public.profiles.phone_e164),
        updated_at = now();
  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;
