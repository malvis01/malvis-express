-- Consolidate permissive policies and index payment audit foreign keys
drop policy if exists "Admins can create deliveries" on public.deliveries;
drop policy if exists "Customers can submit shipment requests" on public.deliveries;
create policy "Admins and customers can create permitted deliveries"
on public.deliveries for insert to authenticated
with check (
  (select private.is_admin())
  or (customer_id=(select auth.uid()) and status='booking_created'
      and tracking_code_issued=false and tracking_code_issued_at is null
      and tracking_code_issued_by is null and quoted_total is null and delivered_at is null)
);
drop policy if exists "Admins can manage payment instructions" on public.payment_instructions;
drop policy if exists "Customers can read payment instructions for own deliveries" on public.payment_instructions;
create policy "Customers and admins can read payment instructions"
on public.payment_instructions for select to authenticated
using ((select private.is_admin()) or exists (
  select 1 from public.deliveries d where d.id=payment_instructions.delivery_id and d.customer_id=(select auth.uid())
));
create policy "Admins can insert payment instructions" on public.payment_instructions for insert to authenticated
with check ((select private.is_admin()));
create policy "Admins can update payment instructions" on public.payment_instructions for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins can delete payment instructions" on public.payment_instructions for delete to authenticated
using ((select private.is_admin()));
create index if not exists payment_instructions_created_by_idx on public.payment_instructions(created_by);
create index if not exists payment_proofs_reviewed_by_idx on public.payment_proofs(reviewed_by);
