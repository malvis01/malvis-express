-- Bind each uploaded payment receipt path to its authenticated owner and delivery.
drop policy if exists "Customers can submit proof for own unconfirmed delivery" on public.payment_proofs;
create policy "Customers can submit proof for own unconfirmed delivery"
on public.payment_proofs for insert to authenticated
with check (
  customer_id=(select auth.uid())
  and status='submitted'
  and reviewed_by is null
  and reviewed_at is null
  and storage_path like ((select auth.uid())::text || '/' || delivery_id::text || '/%')
  and exists (
    select 1 from public.deliveries d
    where d.id=payment_proofs.delivery_id
      and d.customer_id=(select auth.uid())
      and d.status='awaiting_payment'
      and d.tracking_code_issued=false
  )
);
