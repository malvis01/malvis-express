-- Performance and function hardening for the initial schema.
create index if not exists user_roles_assigned_by_idx on public.user_roles(assigned_by);
create index if not exists deliveries_tracking_code_issued_by_idx on public.deliveries(tracking_code_issued_by);
create index if not exists shipment_events_recorded_by_idx on public.shipment_events(recorded_by);
create index if not exists audit_logs_actor_id_idx on public.audit_logs(actor_id);

-- Some Supabase projects may already contain this setup helper; only harden it if present.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;
