-- Atomic admin-only shipment status and location updates.
-- Applied to Supabase project pgkkojkcbjvhbtcqccmu on 2026-11-04.
create or replace function public.admin_update_shipment_progress(
  p_delivery_id uuid,
  p_status text,
  p_location_label text default null,
  p_description text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise insufficient_privilege using message = 'Administrator access required.';
  end if;

  if p_status not in (
    'booking_created', 'awaiting_payment', 'payment_confirmed', 'rider_assigned',
    'package_picked_up', 'at_sorting_facility', 'in_transit', 'customs_clearance',
    'out_for_delivery', 'delivered', 'cancelled', 'failed_delivery', 'returned',
    'delayed', 'held_for_inspection'
  ) then
    raise exception 'Unsupported shipment status.';
  end if;

  update public.deliveries
     set status = p_status,
         delivered_at = case when p_status = 'delivered' then pg_catalog.now() else null end
   where id = p_delivery_id;

  if not found then
    raise no_data_found using message = 'Shipment was not found.';
  end if;

  insert into public.shipment_events (
    delivery_id, status, location_label, description, recorded_by
  ) values (
    p_delivery_id,
    p_status,
    nullif(pg_catalog.btrim(p_location_label), ''),
    nullif(pg_catalog.btrim(p_description), ''),
    (select auth.uid())
  );
end;
$$;

revoke all on function public.admin_update_shipment_progress(uuid, text, text, text) from public, anon;
grant execute on function public.admin_update_shipment_progress(uuid, text, text, text) to authenticated;
