import { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, ExternalLink, Save } from 'lucide-react'
import { supabase } from './lib/supabase'

const field = { width: '100%', padding: 10, border: '1px solid #d8dce2', borderRadius: 7, marginTop: 5, boxSizing: 'border-box' }
export default function AdminPayments({ delivery, adminId, onUpdated }) {
  const [form, setForm] = useState({ amount: delivery.quoted_total || '', currency_code: delivery.currency_code || 'NGN', bank_name: '', account_name: '', account_number: '', payment_reference: delivery.tracking_number, customer_message: '' })
  const [proofs, setProofs] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    let active = true
    async function load() {
      const [{ data: instructions }, { data: submitted }] = await Promise.all([
        supabase.from('payment_instructions').select('*').eq('delivery_id', delivery.id).maybeSingle(),
        supabase.from('payment_proofs').select('*').eq('delivery_id', delivery.id).order('created_at', { ascending: false }),
      ])
      if (!active) return
      if (instructions) setForm({ amount: instructions.amount, currency_code: instructions.currency_code, bank_name: instructions.bank_name, account_name: instructions.account_name, account_number: instructions.account_number, payment_reference: instructions.payment_reference || '', customer_message: instructions.customer_message || '' })
      setProofs(submitted || [])
    }
    load()
    return () => { active = false }
  }, [delivery.id])
  async function saveInstructions(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    const amount = Number(form.amount)
    if (!(amount > 0) || !form.bank_name.trim() || !form.account_name.trim() || !form.account_number.trim()) {
      setError('Enter a valid amount and complete bank details.'); setBusy(false); return
    }
    const { error: saveError } = await supabase.from('payment_instructions').upsert({
      delivery_id: delivery.id, amount, currency_code: form.currency_code.toUpperCase(),
      bank_name: form.bank_name.trim(), account_name: form.account_name.trim(),
      account_number: form.account_number.trim(), payment_reference: form.payment_reference.trim() || null,
      customer_message: form.customer_message.trim() || null, created_by: adminId,
    }, { onConflict: 'delivery_id' })
    if (saveError) { setError(saveError.message); setBusy(false); return }
    const { error: updateError } = await supabase.from('deliveries').update({
      quoted_total: amount, currency_code: form.currency_code.toUpperCase(), status: 'awaiting_payment',
    }).eq('id', delivery.id)
    if (updateError) setError('Payment details saved but shipment status update failed: ' + updateError.message)
    else {
      await supabase.from('shipment_events').insert({ delivery_id: delivery.id, status: 'awaiting_payment', description: 'Delivery fee and bank-transfer instructions sent to customer account.', recorded_by: adminId })
      setNotice('Payment instructions are now visible in the customer portal.')
      onUpdated?.()
    }
    setBusy(false)
  }
  async function review(proof, status) {
    setBusy(true); setError(''); setNotice('')
    if (status === 'confirmed') {
      const { error: deliveryError } = await supabase.from('deliveries').update({
        status: 'payment_confirmed', tracking_code_issued: true,
        tracking_code_issued_at: new Date().toISOString(), tracking_code_issued_by: adminId,
      }).eq('id', delivery.id)
      if (deliveryError) { setError('Could not confirm payment or release tracking: ' + deliveryError.message); setBusy(false); return }
    }
    const { error: reviewError } = await supabase.from('payment_proofs').update({
      status, reviewed_by: adminId, reviewed_at: new Date().toISOString(),
      admin_note: status === 'confirmed' ? 'Transfer verified by Malvis Express.' : 'Please contact Malvis Express for assistance and submit valid evidence.',
    }).eq('id', proof.id)
    if (reviewError) {
      setError(status === 'confirmed'
        ? 'Shipment is marked paid and tracking is released, but the receipt review record could not be updated. Refresh and retry the review.'
        : reviewError.message)
      setBusy(false)
      onUpdated?.()
      return
    }
    if (status === 'confirmed') {
      const { error: eventError } = await supabase.from('shipment_events').insert({ delivery_id: delivery.id, status: 'payment_confirmed', description: 'Payment verified. Tracking number issued: ' + delivery.tracking_number, recorded_by: adminId })
      if (eventError) setError('Payment was confirmed, but the timeline event could not be saved: ' + eventError.message)
      else setNotice('Payment confirmed. Tracking number ' + delivery.tracking_number + ' is now issued.')
    } else setNotice('Payment evidence rejected. The customer can submit a new receipt.')
    const { data } = await supabase.from('payment_proofs').select('*').eq('delivery_id', delivery.id).order('created_at', { ascending: false })
    setProofs(data || []); onUpdated?.(); setBusy(false)
  }
  async function confirmGuestPayment() {
    if (!window.confirm('Confirm that you have independently verified this guest shipment payment and release its tracking number?')) return
    setBusy(true); setError(''); setNotice('')
    const { error: updateError } = await supabase.from('deliveries').update({
      status: 'payment_confirmed', tracking_code_issued: true,
      tracking_code_issued_at: new Date().toISOString(), tracking_code_issued_by: adminId,
    }).eq('id', delivery.id)
    if (updateError) { setError(updateError.message); setBusy(false); return }
    const { error: eventError } = await supabase.from('shipment_events').insert({
      delivery_id: delivery.id, status: 'payment_confirmed',
      description: 'Guest payment independently verified by an administrator. Tracking number issued.',
      recorded_by: adminId,
    })
    if (eventError) setError('Payment confirmed and tracking released, but the timeline event could not be saved: ' + eventError.message)
    else setNotice('Guest payment confirmed. Tracking number ' + delivery.tracking_number + ' is now issued.')
    onUpdated?.()
    setBusy(false)
  }
  async function openReceipt(path) {
    const { data, error: linkError } = await supabase.storage.from('payment-proofs').createSignedUrl(path, 300)
    if (linkError) setError(linkError.message)
    else window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }
  return <section className="admin-form-card" style={{ marginTop: 12 }}>
    <div className="admin-form-title"><div><h2>Quote and payment</h2><p>{delivery.tracking_number} · Add transfer details visible to this customer only.</p></div></div>
    {error && <div className="admin-error"><AlertCircle size={16}/> {error}</div>}
    {notice && <div className="admin-notice"><CheckCircle2 size={16}/> {notice}</div>}
    <form onSubmit={saveInstructions}><div className="admin-form-grid">
      <label>Delivery fee<input style={field} type="number" min="1" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} required/></label>
      <label>Currency<input style={field} maxLength="3" value={form.currency_code} onChange={e=>setForm({...form,currency_code:e.target.value})} required/></label>
      <label>Bank name<input style={field} value={form.bank_name} onChange={e=>setForm({...form,bank_name:e.target.value})} required/></label>
      <label>Account name<input style={field} value={form.account_name} onChange={e=>setForm({...form,account_name:e.target.value})} required/></label>
      <label>Account number<input style={field} value={form.account_number} onChange={e=>setForm({...form,account_number:e.target.value})} required/></label>
      <label>Payment reference<input style={field} value={form.payment_reference} onChange={e=>setForm({...form,payment_reference:e.target.value})}/></label>
      <label className="admin-full">Message to customer<textarea style={field} rows="2" value={form.customer_message} onChange={e=>setForm({...form,customer_message:e.target.value})}/></label>
    </div><button className="button" disabled={busy}><Save size={16}/> {busy ? 'Saving…' : 'Save and send payment instructions'}</button></form>
    {!delivery.customer_id && !delivery.tracking_code_issued && <div style={{ marginTop: 18, padding: 14, border: '1px solid #e3e7ed', borderRadius: 8 }}>
      <strong>Guest shipment payment</strong>
      <p style={{ fontSize: 12, color: '#667085' }}>After independently checking the transfer outside the platform, an administrator can record the payment and release the tracking number here.</p>
      <button type="button" className="button" disabled={busy || !delivery.quoted_total} onClick={confirmGuestPayment}>Confirm verified guest payment and issue tracking</button>
    </div>}
    <div style={{ marginTop: 22 }}><h3>Submitted payment evidence</h3>
      {!proofs.length ? <p>No receipt submitted yet.</p> : proofs.map(proof=><div key={proof.id} style={{ padding: 12, border: '1px solid #e3e7ed', borderRadius: 8, marginTop: 10 }}>
        <strong>{proof.status.toUpperCase()}</strong><p>{proof.transaction_reference || 'No transaction reference'} · {new Date(proof.created_at).toLocaleString()}</p>
        <button type="button" className="admin-plain-button" onClick={()=>openReceipt(proof.storage_path)}><ExternalLink size={15}/> View receipt</button>
        {proof.status === 'submitted' && <div style={{ display: 'flex', gap: 10, marginTop: 12 }}><button type="button" className="button" disabled={busy} onClick={()=>review(proof,'confirmed')}>Confirm payment</button><button type="button" className="admin-plain-button" disabled={busy} onClick={()=>review(proof,'rejected')}>Reject receipt</button></div>}
      </div>)}
    </div>
  </section>
}
