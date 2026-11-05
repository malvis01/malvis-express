-- Combine customer/admin read access to avoid redundant permissive RLS policies.
drop policy if exists "Admins can read deliveries" on public.deliveries;
drop policy if exists "Customers can read their own deliveries" on public.deliveries;
create policy "Users can read permitted deliveries"
on public.deliveries for select to authenticated
using ((select private.is_admin()) or customer_id = (select auth.uid()));

drop policy if exists "Admins can read shipment events" on public.shipment_events;
drop policy if exists "Customers can read events for their deliveries" on public.shipment_events;
create policy "Users can read permitted shipment events"
on public.shipment_events for select to authenticated
using (
  (select private.is_admin())
  or exists (
    select 1 from public.deliveries d
    where d.id = shipment_events.delivery_id
      and d.customer_id = (select auth.uid())
  )
);
