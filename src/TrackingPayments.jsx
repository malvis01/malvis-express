import { useState } from 'react'
import { CheckCircle2, Copy, CreditCard, FileUp, Upload } from 'lucide-react'
import { supabase } from './lib/supabase'

function formatMoney(amount, currency) {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'NGN' }).format(Number(amount)) }
  catch { return (currency || 'NGN') + ' ' + Number(amount).toLocaleString() }
}

export default function TrackingPayments({ trackingNumber, phoneLast4, instructions, initialProofs = [] }) {
  const [proofs, setProofs] = useState(initialProofs)
  const [file, setFile] = useState(null)
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function submit(event) {
    event.preventDefault()
    if (!file) { setError('Choose your transfer receipt first.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('The receipt must be smaller than 5 MB.'); return }
    setBusy(true); setError(''); setNotice('')
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      let binary = ''
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
      const { data, error: invokeError } = await supabase.functions.invoke('submit-shipment-payment-proof', {
        body: {
          tracking_number: trackingNumber,
          phone_last4: phoneLast4,
          file_name: file.name,
          mime_type: file.type,
          file_base64: btoa(binary),
          transaction_reference: reference,
          customer_note: note,
        },
      })
      if (invokeError || data?.error) throw new Error(data?.error || invokeError?.message || 'Receipt could not be submitted.')
      setProofs((current) => [data.proof, ...current])
      setFile(null); setReference(''); setNote('')
      const input = document.getElementById('tracking-payment-proof-file')
      if (input) input.value = ''
      setNotice('Your payment proof has been sent to the admin for review.')
    } catch (err) {
      setError(err.message || 'Receipt upload failed. Please try again.')
    } finally { setBusy(false) }
  }

  if (!instructions && !proofs.length) return null
  return <section className="tracking-payment-card">
    <div className="tracking-payment-heading"><span><CreditCard size={19}/> Delivery fee payment</span><small>Payment details for this shipment</small></div>
    {instructions ? <>
      <div className="tracking-payment-amount"><small>AMOUNT TO PAY</small><strong>{formatMoney(instructions.amount, instructions.currency_code)}</strong></div>
      <div className="tracking-bank-grid">
        <div><small>Bank name</small><b>{instructions.bank_name}</b></div>
        <div><small>Account name</small><b>{instructions.account_name}</b></div>
        <div><small>Account number</small><b>{instructions.account_number}</b><button type="button" className="tracking-copy-account" onClick={() => navigator.clipboard?.writeText(instructions.account_number)}><Copy size={13}/> Copy account number</button></div>
        {instructions.payment_reference && <div><small>Payment reference</small><b>{instructions.payment_reference}</b></div>}
      </div>
      {instructions.customer_message && <p className="tracking-payment-message">{instructions.customer_message}</p>}
      <p className="tracking-payment-instruction">After making the transfer, upload your receipt below. Your payment will only be confirmed after the admin verifies it.</p>
      {proofs.some((proof) => proof.status === 'submitted') ? <p className="tracking-payment-pending">Your receipt has been received and is awaiting admin review.</p> : <form className="tracking-proof-form" onSubmit={submit}>
        <label>Upload payment receipt (JPG, PNG, WebP or PDF, max 5 MB)<input id="tracking-payment-proof-file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} required /></label>
        <label>Transaction reference (optional)<input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={160} placeholder="Bank transfer reference"/></label>
        <label>Note to admin (optional)<textarea value={note} onChange={(e) => setNote(e.target.value)} rows="2" maxLength={1000} placeholder="Any additional information"/></label>
        <button className="button" type="submit" disabled={busy || !file}><Upload size={16}/>{busy ? 'Uploading receipt…' : 'Send payment proof to admin'}</button>
      </form>}
    </> : <p>Payment instructions have not been added for this shipment yet.</p>}
    {proofs.length > 0 && <div className="tracking-proof-history"><strong>Payment proof status</strong>{proofs.map((proof) => <div key={proof.id}><span className={'tracking-proof-status status-' + proof.status}>{proof.status === 'confirmed' ? 'Payment confirmed' : proof.status === 'rejected' ? 'Receipt needs attention' : 'Awaiting admin review'}</span><small>{new Date(proof.created_at).toLocaleString()}</small>{proof.admin_note && <p>{proof.admin_note}</p>}</div>)}</div>}
    {error && <p className="tracking-feedback error">{error}</p>}{notice && <p className="tracking-feedback"><CheckCircle2 size={15}/> {notice}</p>}
  </section>
}
