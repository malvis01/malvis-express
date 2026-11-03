-- Performance and function hardening for the initial schema.
create index if not exists user_roles_assigned_by_idx on public.user_roles(assigned_by);
create index if not exists deliveries_tracking_code_issued_by_idx on public.deliveries(tracking_code_issued_by);
create index if not exists shipment_events_recorded_by_idx on public.shipment_events(recorded_by);
create index if not exists audit_logs_actor_id_idx on public.audit_logs(actor_id);

-- This pre-existing helper was created by project setup and is not part of the app.
-- It must not be callable by public API roles.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
