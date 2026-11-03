import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, LogOut, Package, RefreshCw, Search, Plus, CheckCircle2, AlertCircle, Truck, Clock3 } from 'lucide-react'
import { supabase } from './lib/supabase'
import AdminPayments from './AdminPayments.jsx'

// The administrator email is an internal sign-in identifier; the page only asks for a password.
const ADMIN_AUTH_EMAIL = 'malvisdabz@gmail.com'

const statuses = [
  ['booking_created', 'Shipment request created'],
  ['awaiting_payment', 'Awaiting payment'],
  ['payment_confirmed', 'Payment confirmed'],
  ['rider_assigned', 'Courier assigned'],
  ['package_picked_up', 'Package picked up'],
  ['at_sorting_facility', 'At sorting facility'],
  ['in_transit', 'In transit'],
  ['customs_clearance', 'Customs clearance'],
  ['out_for_delivery', 'Out for delivery'],
  ['delivered', 'Delivered'],
  ['cancelled', 'Cancelled'],
  ['failed_delivery', 'Delivery attempt unsuccessful'],
  ['returned', 'Returned'],
  ['delayed', 'Delayed'],
  ['held_for_inspection', 'Held for inspection'],
]
const types = ['food', 'groceries', 'document', 'parcel', 'business', 'cargo', 'other']
const scopes = ['local', 'domestic', 'international']
const blankShipment = {
  customer_id: '', delivery_type: 'parcel', service_scope: 'domestic',
  pickup_location_label: '', dropoff_location_label: '',
  pickup_contact_name: '', pickup_contact_phone: '',
  dropoff_contact_name: '', dropoff_contact_phone: '',
  customer_note: '',
}

function dateLabel(value) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
}

export default function AdminDashboard({ onExit }) {
  const [password, setPassword] = useState('')
  const [authState, setAuthState] = useState('checking')
  const [authError, setAuthError] = useState('')
  const [user, setUser] = useState(null)
  const [shipments, setShipments] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(blankShipment)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [paymentDeliveryId, setPaymentDeliveryId] = useState(null)
  const [eventForm, setEventForm] = useState({ status: 'in_transit', location_label: '', description: '' })

  const verifyAdmin = useCallback(async (candidate) => {
    if (!candidate || !supabase) return false
    const { data, error: roleError } = await supabase
      .from('user_roles').select('role').eq('user_id', candidate.id).eq('role', 'admin').maybeSingle()
    if (roleError || !data) return false
    setUser(candidate)
    setAuthState('ready')
    return true
  }, [])

  useEffect(() => {
    let active = true
    if (!supabase) {
      setAuthState('error')
      setAuthError('The Supabase connection is not configured.')
      return () => { active = false }
    }
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      const current = data.session?.user
      if (current) {
        const ok = await verifyAdmin(current)
        if (!ok && active) {
          await supabase.auth.signOut()
          setAuthState('login')
          setAuthError('This account does not have administrator access.')
        }
      } else {
        setAuthState('login')
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      if (!session?.user) {
        setUser(null)
        setAuthState('login')
      }
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [verifyAdmin])

  const loadData = useCallback(async () => {
    if (!supabase || !user) return
    setLoading(true)
    setError('')
    const [shipmentResult, customerResult] = await Promise.all([
      supabase.from('deliveries')
        .select('id,tracking_number,customer_id,delivery_type,service_scope,status,pickup_location_label,dropoff_location_label,pickup_contact_name,pickup_contact_phone,dropoff_contact_name,dropoff_contact_phone,customer_note,quoted_total,currency_code,created_at,updated_at,tracking_code_issued')
        .order('created_at', { ascending: false }).limit(100),
      supabase.from('profiles').select('id,display_name,phone_e164').order('created_at', { ascending: false }).limit(200),
    ])
    if (shipmentResult.error) setError(shipmentResult.error.message)
    else setShipments(shipmentResult.data || [])
    if (customerResult.error) setError((current) => current || customerResult.error.message)
    else setCustomers(customerResult.data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { if (authState === 'ready') loadData() }, [authState, loadData])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return shipments
    return shipments.filter((item) => [
      item.tracking_number, item.dropoff_contact_name, item.dropoff_contact_phone,
      item.pickup_location_label, item.dropoff_location_label, item.status,
    ].some((value) => String(value || '').toLowerCase().includes(term)))
  }, [shipments, search])

  async function signIn(event) {
    event.preventDefault()
    if (!supabase) return
    setAuthState('signing')
    setAuthError('')
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: ADMIN_AUTH_EMAIL, password,
    })
    if (loginError || !data.user) {
      setAuthState('login')
      setAuthError('Sign-in failed. Check the administrator password and try again.')
      return
    }
    const allowed = await verifyAdmin(data.user)
    if (!allowed) {
      await supabase.auth.signOut()
      setAuthState('login')
      setAuthError('This account is not assigned the administrator role.')
    }
  }

  async function signOut() {
    await supabase?.auth.signOut()
    setUser(null)
    setAuthState('login')
  }

  async function createShipment(event) {
    event.preventDefault()
    if (!supabase || !user) return
    const recipientPhone = form.dropoff_contact_phone.replace(/\s+/g, '')
    if (recipientPhone.replace(/\D/g, '').length < 4) {
      setError('Enter a valid recipient phone number so tracking verification can work.')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    const insert = {
      ...form,
      customer_id: form.customer_id || null,
      tracking_code_issued: false,
      tracking_code_issued_at: null,
      tracking_code_issued_by: null,
      status: 'booking_created',
    }
    delete insert.customer_id
    insert.customer_id = form.customer_id || null
    const { data, error: insertError } = await supabase.from('deliveries').insert(insert).select('id,tracking_number').single()
    if (insertError) {
      setError('Could not create shipment: ' + insertError.message)
      setSaving(false)
      return
    }
    const { error: eventError } = await supabase.from('shipment_events').insert({
      delivery_id: data.id,
      status: 'booking_created',
      description: 'Shipment record created.',
      location_label: form.pickup_location_label || null,
      recorded_by: user.id,
    })
    setNotice(eventError
      ? 'Shipment created as ' + data.tracking_number + ', but its first timeline event could not be saved. Please add an update.'
      : 'Shipment created. Tracking number: ' + data.tracking_number)
    setForm(blankShipment)
    setShowCreate(false)
    setSaving(false)
    await loadData()
  }

  async function updateShipment(event) {
    event.preventDefault()
    if (!supabase || !user || !editing) return
    setSaving(true)
    setError('')
    setNotice('')
    const update = { status: eventForm.status }
    if (eventForm.status === 'delivered') update.delivered_at = new Date().toISOString()
    const { error: updateError } = await supabase.from('deliveries').update(update).eq('id', editing.id)
    if (updateError) {
      setError('Could not update shipment: ' + updateError.message)
      setSaving(false)
      return
    }
    const { error: eventError } = await supabase.from('shipment_events').insert({
      delivery_id: editing.id,
      status: eventForm.status,
      description: eventForm.description.trim() || null,
      location_label: eventForm.location_label.trim() || null,
      recorded_by: user.id,
    })
    if (eventError) {
      setError('Shipment status changed, but the timeline update failed: ' + eventError.message)
    } else {
      setNotice('Shipment ' + editing.tracking_number + ' updated.')
    }
    setEditing(null)
    setSaving(false)
    await loadData()
  }

  if (authState === 'checking' || authState === 'signing') {
    return <div className="admin-shell"><div className="admin-loading"><Package size={28} /><p>{authState === 'signing' ? 'Signing in securely…' : 'Checking administrator session…'}</p></div></div>
  }

  if (authState !== 'ready') {
    return <div className="admin-shell">
      <header className="admin-top"><a className="brand" href="#home" onClick={onExit}><span className="brand-mark"><Package size={22} /></span><span>MALVIS<span className="brand-light"> EXPRESS</span></span></a><a className="admin-back" href="#home" onClick={onExit}><ArrowLeft size={16} /> Back to website</a></header>
      <section className="admin-login-wrap"><form className="admin-login-card" onSubmit={signIn}>
        <span className="admin-lock"><Package size={25} /></span><div className="eyebrow dark-eyebrow">SECURE OPERATIONS</div>
        <h1>Administrator<br /><em>sign in.</em></h1><p>Enter your administrator password to access Malvis Express operations.</p>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" autoComplete="current-password" required /></label>
        {authError && <div className="admin-error"><AlertCircle size={16} /> {authError}</div>}
        <button className="button admin-submit" type="submit">Sign in to dashboard <ArrowRight size={16} /></button>
        <small>Administrator access only. Accounts must be created and assigned the admin role by the project owner.</small>
      </form></section>
    </div>
  }

  return <div className="admin-shell">
    <header className="admin-top"><a className="brand" href="#home" onClick={onExit}><span className="brand-mark"><Package size={22} /></span><span>MALVIS<span className="brand-light"> EXPRESS</span></span></a><div className="admin-top-actions"><span className="admin-user-label">Administrator</span><button className="admin-plain-button" onClick={signOut}><LogOut size={16} /> Sign out</button></div></header>
    <main className="admin-main">
      <div className="admin-heading"><div><div className="eyebrow dark-eyebrow">OPERATIONS CONTROL</div><h1>Shipment <em>dashboard.</em></h1><p>Manage shipment records, issue tracking numbers and publish delivery progress.</p></div><button className="button" onClick={() => { setShowCreate(!showCreate); setEditing(null); setNotice(''); setError('') }}><Plus size={17} /> New shipment</button></div>
      <div className="admin-stats"><div><span><Package size={18} /></span><small>Total shipments</small><strong>{shipments.length}</strong></div><div><span><Truck size={18} /></span><small>In progress</small><strong>{shipments.filter((item) => !['delivered','cancelled','returned'].includes(item.status)).length}</strong></div><div><span><CheckCircle2 size={18} /></span><small>Delivered</small><strong>{shipments.filter((item) => item.status === 'delivered').length}</strong></div></div>
      {notice && <div className="admin-notice"><CheckCircle2 size={17} /> {notice}</div>}
      {error && <div className="admin-error admin-wide"><AlertCircle size={16} /> {error}</div>}
      {showCreate && <section className="admin-form-card"><div className="admin-form-title"><div><h2>Create shipment</h2><p>Guest shipments are supported. Select an existing customer account only when one is available.</p></div><button className="admin-plain-button" onClick={() => setShowCreate(false)}>Close</button></div>
        <form onSubmit={createShipment}>
          <div className="admin-form-grid">
            <label>Link customer account (optional)<select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}><option value="">Guest / no account</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.display_name || 'Customer'} · {customer.phone_e164 || customer.id.slice(0,8)}</option>)}</select></label>
            <label>Delivery type<select value={form.delivery_type} onChange={(e) => setForm({ ...form, delivery_type: e.target.value })}>{types.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
            <label>Shipping scope<select value={form.service_scope} onChange={(e) => setForm({ ...form, service_scope: e.target.value })}>{scopes.map((scope) => <option key={scope} value={scope}>{scope}</option>)}</select></label>
            <label>Pickup location<input value={form.pickup_location_label} onChange={(e) => setForm({ ...form, pickup_location_label: e.target.value })} placeholder="City, area, country" required /></label>
            <label>Destination<input value={form.dropoff_location_label} onChange={(e) => setForm({ ...form, dropoff_location_label: e.target.value })} placeholder="City, area, country" required /></label>
            <label>Sender name<input value={form.pickup_contact_name} onChange={(e) => setForm({ ...form, pickup_contact_name: e.target.value })} placeholder="Sender's full name" required /></label>
            <label>Sender phone<input value={form.pickup_contact_phone} onChange={(e) => setForm({ ...form, pickup_contact_phone: e.target.value })} placeholder="+234…" required /></label>
            <label>Recipient name<input value={form.dropoff_contact_name} onChange={(e) => setForm({ ...form, dropoff_contact_name: e.target.value })} placeholder="Recipient's full name" required /></label>
            <label>Recipient phone<input value={form.dropoff_contact_phone} onChange={(e) => setForm({ ...form, dropoff_contact_phone: e.target.value })} placeholder="+234…" required /></label>
            <label className="admin-full">Shipment description<textarea value={form.customer_note} onChange={(e) => setForm({ ...form, customer_note: e.target.value })} rows="3" placeholder="Package description, size, weight or handling notes" /></label>
          </div>
          <p className="admin-hint">A tracking number will be generated automatically but stays private until payment is confirmed. Linked customers can pay through their portal; guest payments must be verified by an administrator.</p>
          <button className="button" type="submit" disabled={saving}>{saving ? 'Creating shipment…' : 'Create shipment request'} <ArrowRight size={16} /></button>
        </form>
      </section>}
      {editing && <section className="admin-form-card"><div className="admin-form-title"><div><h2>Update {editing.tracking_number}</h2><p>Each update is saved to the shipment timeline.</p></div><button className="admin-plain-button" onClick={() => setEditing(null)}>Close</button></div>
        <form onSubmit={updateShipment}><div className="admin-form-grid">
          <label>New status<select value={eventForm.status} onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })}>{statuses.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Current location<input value={eventForm.location_label} onChange={(e) => setEventForm({ ...eventForm, location_label: e.target.value })} placeholder="e.g. Lagos sorting centre" /></label>
          <label className="admin-full">Update note<textarea rows="2" value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} placeholder="Optional progress note" /></label>
        </div><button className="button" type="submit" disabled={saving}>{saving ? 'Saving update…' : 'Save shipment update'} <CheckCircle2 size={16} /></button></form>
      </section>}
      <section className="admin-list-card"><div className="admin-list-head"><div><h2>Shipments</h2><p>Latest 100 shipment records</p></div><button className="admin-plain-button" onClick={loadData} disabled={loading}><RefreshCw size={15} /> Refresh</button></div>
        <div className="admin-search"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tracking number, recipient or route" /></div>
        {loading ? <div className="admin-empty">Loading shipments…</div> : filtered.length === 0 ? <div className="admin-empty"><Package size={25} /><strong>No shipments found</strong><span>Create your first shipment to get started.</span></div> :
          <div className="admin-shipment-list">{filtered.map((item) => <article className="admin-shipment" key={item.id}>
            <div className="shipment-row-top"><div><strong>{item.tracking_number}</strong><small>{dateLabel(item.created_at)}</small></div><span className={'status-chip status-' + item.status}>{statuses.find(([value]) => value === item.status)?.[1] || item.status}</span></div>
            <div className="shipment-route"><span>{item.pickup_location_label || 'Pickup not set'}</span><ArrowRight size={15} /><span>{item.dropoff_location_label || 'Destination not set'}</span></div>
            <div className="shipment-meta"><span>{item.delivery_type} · {item.service_scope}</span><span>To: {item.dropoff_contact_name || 'Recipient'} · {item.dropoff_contact_phone || 'No phone'}</span><span>{item.tracking_code_issued ? 'Tracking issued' : 'Tracking not issued'}</span></div>
            <div className="shipment-actions"><button className="admin-plain-button" onClick={() => { setEditing(item); setShowCreate(false); setEventForm({ status: item.status, location_label: '', description: '' }); setError(''); setNotice('') }}>Update status <ArrowRight size={14} /></button><button className="admin-plain-button" onClick={() => { setPaymentDeliveryId(paymentDeliveryId === item.id ? null : item.id); setEditing(null); setShowCreate(false); setError(''); setNotice('') }}>Quote / payments</button></div>
            {paymentDeliveryId === item.id && <AdminPayments delivery={item} adminId={user.id} onUpdated={loadData} />}
          </article>)}</div>}
      </section>
      <p className="admin-footnote"><Clock3 size={14} /> Admin changes are recorded in the database audit log. Bank transfers are confirmed manually; automatic payment gateways and carrier integrations are not enabled.</p>
    </main>
  </div>
}
