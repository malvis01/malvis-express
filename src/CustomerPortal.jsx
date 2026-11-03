import { useEffect, useState } from 'react'
import { ArrowRight, LogOut, Package, RefreshCw, Upload, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from './lib/supabase'
import { normalizePhoneE164, phoneToAuthEmail } from './lib/phoneAuth'

const statusLabels = {
  booking_created: 'Request received', awaiting_payment: 'Awaiting payment',
  payment_confirmed: 'Payment confirmed', rider_assigned: 'Courier assigned',
  package_picked_up: 'Package picked up', at_sorting_facility: 'At sorting facility',
  in_transit: 'In transit', customs_clearance: 'Customs clearance',
  out_for_delivery: 'Out for delivery', delivered: 'Delivered',
  cancelled: 'Cancelled', failed_delivery: 'Delivery attempt unsuccessful',
  returned: 'Returned', delayed: 'Delayed', held_for_inspection: 'Held for inspection',
}
const blank = {
  delivery_type: 'parcel', service_scope: 'domestic',
  pickup_location_label: '', dropoff_location_label: '',
  pickup_contact_name: '', pickup_contact_phone: '',
  dropoff_contact_name: '', dropoff_contact_phone: '', customer_note: '',
}

const fieldStyle = { width: '100%', padding: '12px', border: '1px solid #d8dce2', borderRadius: '8px', marginTop: '6px', boxSizing: 'border-box' }
const labelStyle = { display: 'block', marginBottom: '14px', fontWeight: 600, color: '#263243' }

export default function CustomerPortal() {
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('signin')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [shipments, setShipments] = useState([])
  const [form, setForm] = useState(blank)
  const [proofFiles, setProofFiles] = useState({})

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null))
    return () => listener.subscription.unsubscribe()
  }, [])

  async function loadShipments() {
    if (!supabase || !user) return
    setBusy(true); setError('')
    const { data, error: loadError } = await supabase.from('deliveries')
      .select('id,tracking_number,delivery_type,service_scope,status,pickup_location_label,dropoff_location_label,created_at,quoted_total,currency_code,tracking_code_issued')
      .eq('customer_id', user.id).order('created_at', { ascending: false })
    if (loadError) setError(loadError.message)
    else setShipments(data || [])
    setBusy(false)
  }
  useEffect(() => { if (user) loadShipments() }, [user])

  async function authenticate(event) {
    event.preventDefault(); setAuthBusy(true); setError(''); setNotice('')
    let authEmail
    try {
      authEmail = phoneToAuthEmail(phone)
    } catch (validationError) {
      setAuthBusy(false)
      setError(validationError.message)
      return
    }
    const normalizedPhone = normalizePhoneE164(phone)
    const result = authMode === 'signup'
      ? await supabase.auth.signUp({
          email: authEmail,
          password,
          options: { data: { display_name: displayName.trim(), phone_e164: normalizedPhone } },
        })
      : await supabase.auth.signInWithPassword({ email: authEmail, password })
    setAuthBusy(false)
    if (result.error) { setError(result.error.message); return }
    if (result.data.user && !result.data.session) {
      setError('Your account was created, but Supabase is waiting for email confirmation. Turn off email confirmations for this phone-only login setup, then try again.')
      return
    }
    setUser(result.data.user || null)
    setNotice(authMode === 'signup' ? 'Your customer account is ready.' : 'Welcome back.')
  }

  async function submitRequest(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    const { data, error: insertError } = await supabase.from('deliveries').insert({
      ...form, customer_id: user.id, status: 'booking_created', tracking_code_issued: false,
    }).select('id').single()
    if (insertError) setError('Could not submit request: ' + insertError.message)
    else {
      setNotice('Your shipment request has been sent. The team will review it and send your delivery fee and bank-transfer details here.')
      setForm(blank)
      await loadShipments()
    }
    setBusy(false)
  }

  async function submitProof(delivery) {
    const file = proofFiles[delivery.id]
    if (!file) { setError('Choose a receipt image or PDF first.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('The receipt must be 5 MB or smaller.'); return }
    setBusy(true); setError(''); setNotice('')
    const ext = file.name.split('.').pop().toLowerCase()
    const path = user.id + '/' + delivery.id + '/' + Date.now() + '.' + ext
    const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(path, file, { contentType: file.type, upsert: false })
    if (uploadError) { setError('Receipt upload failed: ' + uploadError.message); setBusy(false); return }
    const { error: proofError } = await supabase.from('payment_proofs').insert({
      delivery_id: delivery.id, customer_id: user.id, storage_path: path,
    })
    if (proofError) {
      await supabase.storage.from('payment-proofs').remove([path])
      setError('Could not submit payment evidence: ' + proofError.message)
    } else {
      setNotice('Payment evidence submitted. The admin will verify the transfer.')
      setProofFiles((current) => ({ ...current, [delivery.id]: null }))
    }
    setBusy(false); await loadShipments()
  }

  if (!supabase) return <section className="portal-section"><div><strong>Customer portal unavailable</strong><p>Backend configuration is required.</p></div></section>

  if (!user) return <section className="portal-section" style={{ display: 'block', maxWidth: 680, margin: '40px auto', padding: 24 }}>
    <div className="eyebrow dark-eyebrow">CUSTOMER ACCOUNT</div><h2>{authMode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
    <p>Use your phone number and password to request deliveries and follow payment and shipment progress.</p>
    <form onSubmit={authenticate}>
      {authMode === 'signup' && <label style={labelStyle}>Full name<input style={fieldStyle} value={displayName} onChange={e => setDisplayName(e.target.value)} required /></label>}
      <label style={labelStyle}>Phone number<input style={fieldStyle} type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="080… or +234…" required /></label>
      <label style={labelStyle}>Password<input style={fieldStyle} type="password" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} minLength="8" value={password} onChange={e => setPassword(e.target.value)} required /></label>
      {error && <p className="admin-error"><AlertCircle size={16}/> {error}</p>}
      <button className="button" disabled={authBusy}>{authBusy ? 'Please wait…' : authMode === 'signup' ? 'Create customer account' : 'Sign in'} <ArrowRight size={16}/></button>
    </form>
    <p style={{ marginTop: 18 }}>{authMode === 'signup' ? 'Already registered?' : 'New to Malvis Express?'} <button type="button" className="admin-plain-button" onClick={() => { setAuthMode(authMode === 'signup' ? 'signin' : 'signup'); setError('') }}>{authMode === 'signup' ? 'Sign in' : 'Create an account'}</button></p>
    <small>Your phone number is used as your login ID. Use the full international format for numbers outside Nigeria. Phone ownership is not verified by SMS.</small>
  </section>

  return <section className="admin-main" style={{ maxWidth: 1000, margin: '32px auto', padding: '0 18px' }}>
    <div className="admin-heading"><div><div className="eyebrow dark-eyebrow">CUSTOMER PORTAL</div><h1>Your shipments.</h1><p>Request a delivery, view your quote and submit your transfer receipt.</p></div><button className="admin-plain-button" onClick={() => supabase.auth.signOut()}><LogOut size={16}/> Sign out</button></div>
    {notice && <div className="admin-notice"><CheckCircle2 size={17}/> {notice}</div>}
    {error && <div className="admin-error admin-wide"><AlertCircle size={16}/> {error}</div>}
    <section className="admin-form-card"><h2>Request a shipment</h2><p>Requests are reviewed by our team. A tracking code is issued after payment is confirmed.</p>
      <form onSubmit={submitRequest}><div className="admin-form-grid">
        <label>Delivery type<select style={fieldStyle} value={form.delivery_type} onChange={e => setForm({...form,delivery_type:e.target.value})}>{['parcel','document','food','groceries','business','cargo','other'].map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Shipping scope<select style={fieldStyle} value={form.service_scope} onChange={e => setForm({...form,service_scope:e.target.value})}>{['local','domestic','international'].map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Pickup location<input style={fieldStyle} value={form.pickup_location_label} onChange={e=>setForm({...form,pickup_location_label:e.target.value})} required placeholder="City, area, country"/></label>
        <label>Destination<input style={fieldStyle} value={form.dropoff_location_label} onChange={e=>setForm({...form,dropoff_location_label:e.target.value})} required placeholder="City, area, country"/></label>
        <label>Sender name<input style={fieldStyle} value={form.pickup_contact_name} onChange={e=>setForm({...form,pickup_contact_name:e.target.value})} required/></label>
        <label>Sender phone<input style={fieldStyle} value={form.pickup_contact_phone} onChange={e=>setForm({...form,pickup_contact_phone:e.target.value})} required/></label>
        <label>Recipient name<input style={fieldStyle} value={form.dropoff_contact_name} onChange={e=>setForm({...form,dropoff_contact_name:e.target.value})} required/></label>
        <label>Recipient phone<input style={fieldStyle} value={form.dropoff_contact_phone} onChange={e=>setForm({...form,dropoff_contact_phone:e.target.value})} required/></label>
        <label className="admin-full">Shipment description<textarea style={fieldStyle} rows="3" value={form.customer_note} onChange={e=>setForm({...form,customer_note:e.target.value})}/></label>
      </div><button className="button" disabled={busy}>{busy ? 'Submitting…' : 'Submit shipment request'} <ArrowRight size={16}/></button></form>
    </section>
    <section className="admin-list-card" style={{ marginTop: 22 }}><div className="admin-list-head"><div><h2>My shipments</h2><p>Requests, payment instructions and delivery progress</p></div><button className="admin-plain-button" onClick={loadShipments} disabled={busy}><RefreshCw size={15}/> Refresh</button></div>
      {busy && !shipments.length ? <div className="admin-empty">Loading…</div> : !shipments.length ? <div className="admin-empty"><Package size={24}/><strong>No shipment requests yet</strong></div> :
      shipments.map(item => <article className="admin-shipment" key={item.id}>
        <div className="shipment-row-top"><div><strong>{item.tracking_code_issued ? item.tracking_number : 'Awaiting approval'}</strong><small>{new Date(item.created_at).toLocaleString()}</small></div><span className="status-chip">{statusLabels[item.status] || item.status}</span></div>
        <div className="shipment-route"><span>{item.pickup_location_label}</span><ArrowRight size={15}/><span>{item.dropoff_location_label}</span></div>
        {item.quoted_total != null && <p><strong>Delivery fee: {item.currency_code} {Number(item.quoted_total).toLocaleString()}</strong></p>}
        <PaymentPanel delivery={item} user={user} file={proofFiles[item.id]} setFile={file=>setProofFiles(current=>({...current,[item.id]:file}))} onSubmit={()=>submitProof(item)} busy={busy}/>
      </article>)}
    </section>
  </section>
}

function PaymentPanel({ delivery, file, setFile, onSubmit, busy }) {
  const [instructions, setInstructions] = useState(null)
  const [proof, setProof] = useState(null)
  useEffect(() => {
    let active = true
    async function load() {
      const [{ data: instruction }, { data: submitted }] = await Promise.all([
        supabase.from('payment_instructions').select('*').eq('delivery_id', delivery.id).maybeSingle(),
        supabase.from('payment_proofs').select('status,admin_note,transaction_reference,created_at').eq('delivery_id', delivery.id).order('created_at',{ascending:false}).limit(1).maybeSingle(),
      ])
      if (active) { setInstructions(instruction); setProof(submitted) }
    }
    load()
    return () => { active = false }
  }, [delivery.id, delivery.status])
  if (!instructions) return <p style={{ color: '#667085' }}>The admin will review this request and add payment instructions here.</p>
  return <div style={{ marginTop: 14, padding: 16, borderRadius: 10, background: '#f6f8fb' }}>
    <h3>Bank transfer details</h3><p><strong>{instructions.bank_name}</strong><br/>{instructions.account_name}<br/><strong>{instructions.account_number}</strong></p>
    <p>Amount: <strong>{instructions.currency_code} {Number(instructions.amount).toLocaleString()}</strong></p>
    {instructions.payment_reference && <p>Reference: {instructions.payment_reference}</p>}
    {instructions.customer_message && <p>{instructions.customer_message}</p>}
    {proof && <p>Payment evidence: <strong>{proof.status === 'submitted' ? 'Awaiting admin review' : proof.status === 'confirmed' ? 'Confirmed' : 'Rejected'}</strong>{proof.admin_note ? ' — '+proof.admin_note : ''}</p>}
    {delivery.status === 'awaiting_payment' && (!proof || proof.status === 'rejected') && <div><label style={labelStyle}>Upload transfer receipt (image or PDF, max 5 MB)<input style={{ ...fieldStyle, background: '#fff' }} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={e=>setFile(e.target.files?.[0] || null)}/></label><button className="button" onClick={onSubmit} disabled={busy || !file}><Upload size={16}/> Submit payment evidence</button></div>}
  </div>
}
