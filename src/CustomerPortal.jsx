import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, LogOut, Package, Phone, RefreshCw, ShieldCheck, UserRound } from 'lucide-react'
import { supabase } from './lib/supabase'

const statusLabels = {
  booking_created: 'Shipment request received',
  awaiting_payment: 'Awaiting payment',
  payment_confirmed: 'Payment confirmed',
  rider_assigned: 'Courier assigned',
  package_picked_up: 'Package picked up',
  at_sorting_facility: 'At sorting facility',
  in_transit: 'In transit',
  customs_clearance: 'Customs clearance',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  failed_delivery: 'Delivery attempt unsuccessful',
  returned: 'Returned',
  delayed: 'Delayed',
  held_for_inspection: 'Held for inspection',
}

const emptyBooking = {
  delivery_type: 'parcel',
  service_scope: 'domestic',
  pickup_location_label: '',
  dropoff_location_label: '',
  pickup_contact_name: '',
  pickup_contact_phone: '',
  dropoff_contact_name: '',
  dropoff_contact_phone: '',
  customer_note: '',
}

function normalisePhone(value) {
  return value.trim().replace(/[\s()-]/g, '')
}

function loginEmailForPhone(value) {
  return `${value.replace(/\D/g, '')}@phone.malvis-express.invalid`
}

function dateLabel(value) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Update time unavailable'
}

export default function CustomerPortal({ onExit, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode)
  const [authState, setAuthState] = useState('checking')
  const [user, setUser] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [notice, setNotice] = useState('')
  const [shipments, setShipments] = useState([])
  const [latestEvents, setLatestEvents] = useState({})
  const [booking, setBooking] = useState(emptyBooking)
  const [showBooking, setShowBooking] = useState(false)
  const [busy, setBusy] = useState(false)

  const loadShipments = useCallback(async (customer) => {
    if (!supabase || !customer) return
    setBusy(true)
    const { data, error } = await supabase.from('deliveries')
      .select('id,tracking_number,delivery_type,service_scope,status,pickup_location_label,dropoff_location_label,created_at,tracking_code_issued')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
    if (error) {
      setAuthError('Could not load your shipments: ' + error.message)
      setBusy(false)
      return
    }
    const rows = data || []
    setShipments(rows)
    if (rows.length) {
      const result = await supabase.from('shipment_events')
        .select('id,delivery_id,status,location_label,occurred_at')
        .in('delivery_id', rows.map((item) => item.id))
        .order('occurred_at', { ascending: false })
      if (!result.error) {
        const latest = {}
        for (const event of (result.data || [])) if (!latest[event.delivery_id]) latest[event.delivery_id] = event
        setLatestEvents(latest)
      }
    } else setLatestEvents({})
    setBusy(false)
  }, [])

  const acceptCustomerSession = useCallback(async (candidate) => {
    if (!candidate || !supabase) return
    const { data: role } = await supabase.from('user_roles').select('role')
      .eq('user_id', candidate.id).eq('role', 'admin').maybeSingle()
    if (role) {
      await supabase.auth.signOut()
      setAuthState('login')
      setAuthError('This is an administrator account. Please use Admin Login.')
      return
    }
    setUser(candidate)
    setDisplayName(candidate.user_metadata?.display_name || '')
    setAuthState('ready')
    setAuthError('')
    await loadShipments(candidate)
  }, [loadShipments])

  useEffect(() => {
    let active = true
    if (!supabase) {
      setAuthState('error')
      setAuthError('The customer service is not configured. Please contact FedEx concept.')
      return () => { active = false }
    }
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session?.user) acceptCustomerSession(data.session.user)
      else if (active) setAuthState('login')
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      if (session?.user) {
        setUser(session.user)
        setDisplayName(session.user.user_metadata?.display_name || '')
        setAuthState('ready')
      } else {
        setUser(null)
        setShipments([])
        setAuthState('login')
      }
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [acceptCustomerSession])

  async function submitAuth(event) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)
    setAuthError('')
    setNotice('')
    const phoneNumber = normalisePhone(phone)
    if (!/^\+[1-9]\d{7,14}$/.test(phoneNumber)) {
      setAuthError('Enter your phone number with country code, for example +2348012345678.')
      setBusy(false)
      return
    }
    if (password.length < 8) {
      setAuthError('Use a password with at least 8 characters.')
      setBusy(false)
      return
    }
    if (mode === 'register') {
      if (!displayName.trim()) {
        setAuthError('Enter your full name.')
        setBusy(false)
        return
      }
      const { data: registration, error: registrationError } = await supabase.functions.invoke('customer-register', {
        body: { display_name: displayName.trim(), phone_e164: phoneNumber, password },
      })
      if (registrationError || registration?.error) {
        setAuthError(registration?.error || registrationError?.message || 'Account creation failed. Please try again.')
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: loginEmailForPhone(phoneNumber),
          password,
        })
        if (error || !data.user) {
          setAuthError('Your account was created, but automatic sign-in failed. Please switch to Sign in and try again.')
        } else {
          await acceptCustomerSession(data.user)
          setNotice('Your FedEx concept customer account has been created and you are signed in.')
        }
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmailForPhone(phoneNumber), password })
      if (error) setAuthError('Login failed. Check your phone number and password.')
      else if (data.user) await acceptCustomerSession(data.user)
    }
    setBusy(false)
  }

  async function createBooking(event) {
    event.preventDefault()
    if (!supabase || !user) return
    setBusy(true)
    setAuthError('')
    setNotice('')
    const insert = {
      ...booking,
      customer_id: user.id,
      status: 'booking_created',
      tracking_code_issued: false,
      tracking_code_issued_at: null,
      tracking_code_issued_by: null,
    }
    const { error } = await supabase.from('deliveries').insert(insert)
    if (error) setAuthError('Could not submit shipment request: ' + error.message)
    else {
      setNotice('Your shipment request has been sent. The FedEx concept team will review it and issue a tracking number when it is accepted.')
      setBooking(emptyBooking)
      setShowBooking(false)
      await loadShipments(user)
    }
    setBusy(false)
  }

  async function signOut() {
    await supabase?.auth.signOut()
    setUser(null)
    setShipments([])
    setPassword('')
    setAuthState('login')
    setMode('login')
  }

  if (authState === 'checking') return <div className="customer-shell"><div className="customer-loading">Checking your customer session…</div></div>

  if (authState !== 'ready') return <div className="customer-shell">
    <header className="customer-top"><a className="brand" href="#home" onClick={onExit}><span className="brand-mark"><Package size={22} /></span><span>Fed<span className="fedex-orange">Ex</span></span></a><a className="customer-back" href="#home" onClick={onExit}><ArrowLeft size={16} /> Back to website</a></header>
    <section className="customer-login-wrap">
      <form className="customer-login-card" onSubmit={submitAuth}>
        <span className="customer-lock"><UserRound size={25} /></span>
        <div className="eyebrow dark-eyebrow">CUSTOMER ACCOUNT</div>
        <h1>{mode === 'register' ? <>Create your<br /><em>account.</em></> : <>Welcome<br /><em>back.</em></>}</h1>
        <p>{mode === 'register' ? 'Create an account to submit shipment requests and follow your deliveries.' : 'Sign in to view your shipment requests and delivery progress.'}</p>
        {mode === 'register' && <label>Full name<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your full name" autoComplete="name" required /></label>}
        <label>Phone number<input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2348012345678" autoComplete="tel" required /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={8} required /></label>
        {authError && <div className="customer-error">{authError}</div>}
        {notice && <div className="customer-notice">{notice}</div>}
        <button className="button customer-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'register' ? 'Create customer account' : 'Sign in to customer portal'} <ArrowRight size={16} /></button>
        <button className="customer-switch" type="button" onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setAuthError(''); setNotice('') }}>{mode === 'register' ? 'Already have an account? Sign in' : 'New to FedEx concept? Create an account'}</button>
        <small>Phone number and password login. Use the full international phone format including country code. Phone numbers are used as login IDs and are not SMS-verified.</small>
      </form>
    </section>
  </div>

  return <div className="customer-shell">
    <header className="customer-top"><a className="brand" href="#home" onClick={onExit}><span className="brand-mark"><Package size={22} /></span><span>Fed<span className="fedex-orange">Ex</span></span></a><div className="customer-top-actions"><span>Customer account</span><button className="admin-plain-button" onClick={signOut}><LogOut size={16} /> Sign out</button></div></header>
    <main className="customer-main">
      <div className="customer-heading"><div><div className="eyebrow dark-eyebrow">YOUR DELIVERY SPACE</div><h1>Hello, <em>{displayName || user?.user_metadata?.display_name || 'customer'}.</em></h1><p>Manage your shipment requests and follow package progress.</p></div><button className="button" onClick={() => setShowBooking(!showBooking)}><Package size={17} /> New shipment request</button></div>
      {notice && <div className="customer-notice customer-wide-notice"><CheckCircle2 size={17} /> {notice}</div>}
      {authError && <div className="customer-error customer-wide-error">{authError}</div>}
      {showBooking && <section className="customer-booking-card"><div className="customer-card-head"><div><h2>Request a shipment</h2><p>Submit your shipment details. This is a request, not a confirmed booking.</p></div><button className="admin-plain-button" onClick={() => setShowBooking(false)}>Close</button></div>
        <form onSubmit={createBooking}><div className="customer-form-grid">
          <label>Delivery type<select value={booking.delivery_type} onChange={(e) => setBooking({ ...booking, delivery_type: e.target.value })}><option value="parcel">Parcel</option><option value="document">Document</option><option value="cargo">Cargo</option><option value="business">Business goods</option><option value="other">Other</option></select></label>
          <label>Shipping scope<select value={booking.service_scope} onChange={(e) => setBooking({ ...booking, service_scope: e.target.value })}><option value="local">Local</option><option value="domestic">Domestic</option><option value="international">International</option></select></label>
          <label>Pickup location<input value={booking.pickup_location_label} onChange={(e) => setBooking({ ...booking, pickup_location_label: e.target.value })} placeholder="City, area, country" required /></label>
          <label>Destination<input value={booking.dropoff_location_label} onChange={(e) => setBooking({ ...booking, dropoff_location_label: e.target.value })} placeholder="City, area, country" required /></label>
          <label>Sender name<input value={booking.pickup_contact_name} onChange={(e) => setBooking({ ...booking, pickup_contact_name: e.target.value })} required /></label>
          <label>Sender phone<input value={booking.pickup_contact_phone} onChange={(e) => setBooking({ ...booking, pickup_contact_phone: e.target.value })} required /></label>
          <label>Recipient name<input value={booking.dropoff_contact_name} onChange={(e) => setBooking({ ...booking, dropoff_contact_name: e.target.value })} required /></label>
          <label>Recipient phone<input value={booking.dropoff_contact_phone} onChange={(e) => setBooking({ ...booking, dropoff_contact_phone: e.target.value })} required /></label>
          <label className="customer-full">Package details<textarea rows="3" value={booking.customer_note} onChange={(e) => setBooking({ ...booking, customer_note: e.target.value })} placeholder="Describe the package, weight or handling instructions" /></label>
        </div><button className="button" type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit shipment request'} <ArrowRight size={16} /></button></form>
      </section>}
      <section className="customer-shipments-card"><div className="customer-card-head"><div><h2>Your shipments</h2><p>{shipments.length} shipment request{shipments.length === 1 ? '' : 's'}</p></div><button className="admin-plain-button" onClick={() => loadShipments(user)} disabled={busy}><RefreshCw size={15} /> Refresh</button></div>
        {busy && shipments.length === 0 ? <div className="customer-empty">Loading your shipments…</div> : shipments.length === 0 ? <div className="customer-empty"><Package size={26} /><strong>No shipment requests yet</strong><span>Your shipment requests and tracking details will appear here.</span></div> :
          <div className="customer-shipment-list">{shipments.map((item) => <article className="customer-shipment" key={item.id}>
            <div className="customer-shipment-top"><div><strong>{item.tracking_code_issued ? item.tracking_number : 'Tracking number pending'}</strong><small>{dateLabel(item.created_at)}</small></div><span>{statusLabels[item.status] || item.status}</span></div>
            <div className="customer-route"><span>{item.pickup_location_label}</span><ArrowRight size={15} /><span>{item.dropoff_location_label}</span></div>
            <div className="customer-current"><Clock3 size={15} /> Latest location: {latestEvents[item.id]?.location_label || 'Awaiting first location update'}</div>
            {item.tracking_code_issued && <p className="customer-tracking-hint">Your tracking number is ready. Use it on the public Track Shipment section with the recipient's last four phone digits.</p>}
          </article>)}</div>}
      </section>
    </main>
  </div>
}
