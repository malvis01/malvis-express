import { useEffect, useState } from 'react'
import {
  ArrowRight, ArrowUpRight, Globe2, Package, MapPin, ShieldCheck,
  Clock3, Menu, X, Truck, Plane, Ship, CheckCircle2, Mail, Phone,
  Send, Compass, Boxes, FileText
} from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import AdminDashboard from './AdminDashboard.jsx'
import CustomerPortal from './CustomerPortal.jsx'

const services = [
  { icon: Package, title: 'Parcels & documents', text: 'For personal packages, important documents and everyday deliveries.' },
  { icon: Truck, title: 'Road freight', text: 'Road transportation for goods, business supplies and larger consignments.' },
  { icon: Plane, title: 'Air cargo', text: 'Air-freight enquiries for time-sensitive international shipments.' },
  { icon: Ship, title: 'Sea freight', text: 'Sea-freight enquiries for bulk cargo and larger international movements.' },
]

const initialForm = { name: '', email: '', phone: '', origin: '', destination: '', deliveryType: 'Parcel', message: '' }

function App() {
  const [adminMode, setAdminMode] = useState(window.location.hash === '#admin')
  useEffect(() => {
    const syncRoute = () => setAdminMode(window.location.hash === '#admin')
    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
  }, [])
  const [menuOpen, setMenuOpen] = useState(false)
  const [trackingCode, setTrackingCode] = useState('')
  const [trackingPhone, setTrackingPhone] = useState('')
  const [trackingState, setTrackingState] = useState('idle')
  const [trackingResult, setTrackingResult] = useState(null)
  const [trackingError, setTrackingError] = useState('')
  const [form, setForm] = useState(initialForm)
  const [formState, setFormState] = useState('idle')

  const closeMenu = () => setMenuOpen(false)
  const statusLabels = {
    booking_created: 'Shipment request created',
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
  const formatDate = (value) => value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : 'Update time unavailable'
  async function trackShipment(event) {
    event.preventDefault()
    setTrackingState('loading')
    setTrackingResult(null)
    setTrackingError('')
    if (!supabase) {
      setTrackingState('error')
      setTrackingError('Tracking service is not configured yet. Please try again later.')
      return
    }
    const { data, error } = await supabase.functions.invoke('public-shipment-tracking', {
      body: { tracking_number: trackingCode, phone_last4: trackingPhone },
    })
    if (error || data?.error) {
      setTrackingState('error')
      setTrackingError(data?.error || 'We could not complete the tracking lookup. Please try again.')
      return
    }
    setTrackingResult(data)
    setTrackingState('success')
  }
  const updateForm = (event) => setForm({ ...form, [event.target.name]: event.target.value })

  async function submitEnquiry(event) {
    event.preventDefault()
    setFormState('sending')
    const payload = new URLSearchParams({ 'form-name': 'shipment-enquiry', 'bot-field': '', ...form })
    try {
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload.toString(),
      })
      if (!response.ok) throw new Error('Enquiry could not be sent')
      setFormState('sent')
      setForm(initialForm)
    } catch {
      setFormState('error')
    }
  }

  if (adminMode) return <AdminDashboard onExit={() => { window.location.hash = '#home'; setAdminMode(false) }} />

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#home" aria-label="Shipping portal home">
          <img className="fedex-logo-img" src="/fedex-express-logo.jpg" alt="FedEx Express" />
        </a>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">
          {menuOpen ? <X /> : <Menu />}
        </button>
        <nav className={menuOpen ? 'nav open' : 'nav'}>
          <a href="#home" onClick={closeMenu}>Home</a>
          <a href="#tracking" onClick={closeMenu}>Track package</a>
          <a href="#services" onClick={closeMenu}>Services</a>
          <a href="#about" onClick={closeMenu}>About</a>
          <a href="#contact" onClick={closeMenu}>Contact</a>
        </nav>
        <div className="nav-actions">
          <a className="login-link" href="#account" onClick={(event) => { event.preventDefault(); window.location.hash = '#account'; document.getElementById('account')?.scrollIntoView({ behavior: 'smooth' }) }}>Login</a>
          <a className="button button-small" href="#signup" onClick={(event) => { event.preventDefault(); window.location.hash = '#signup'; document.getElementById('account')?.scrollIntoView({ behavior: 'smooth' }) }}>Sign up <ArrowUpRight size={16} /></a>
        </div>
      </header>

      <div className="prototype-notice" role="note">Shipment operations are managed on this platform · Carrier API access requires authorization.</div>

      <section className="hero" id="home">
        <div className="hero-copy">
          <div className="eyebrow"><span className="pulse" /> WORLDWIDE DELIVERY SERVICE</div>
          <h1>Global shipping,<br />made <em>simpler</em></h1>
          <p className="hero-text">Send and receive packages across the world with a simpler shipment experience — from your first enquiry to tracking updates.</p>
          <div className="hero-actions">
            <a className="button" href="#tracking"><Package size={17} /> Track your package <ArrowRight size={17} /></a>
            <a className="text-link" href="#services">Learn more <ArrowUpRight size={16} /></a>
          </div>
          <div className="hero-trust">
            <span><ShieldCheck size={17} /> Secure shipment handling</span>
            <span><Globe2 size={17} /> Worldwide shipping enquiries</span>
          </div>
        </div>
        <div className="hero-art" aria-label="Illustration representing worldwide delivery routes">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="route route-a" /><div className="route route-b" />
          <div className="map-dot dot-one"><MapPin size={18} /></div>
          <div className="map-dot dot-two"><MapPin size={18} /></div>
          <div className="map-dot dot-three"><MapPin size={18} /></div>
          <div className="parcel-card">
            <div className="parcel-icon"><Package size={30} /></div>
            <div><small>FedEx</small><strong>Global logistics</strong><span><i /> Your delivery, in view</span></div>
            <ArrowUpRight className="parcel-arrow" size={19} />
          </div>
          <div className="floating-tag"><Globe2 size={16} /> Worldwide delivery</div>
          <div className="hero-stamp">EXPRESS<span>•</span></div>
        </div>
      </section>

      <section className="quick-strip">
        <div><span className="strip-icon"><Globe2 /></span><span><strong>Worldwide shipping</strong><small>International delivery enquiries</small></span></div>
        <div><span className="strip-icon"><Truck /></span><span><strong>Fast & reliable</strong><small>Road, air and sea options</small></span></div>
        <div><span className="strip-icon"><ShieldCheck /></span><span><strong>Secure shipments</strong><small>Recipient-verified tracking</small></span></div>
      </section>

      <section className="tracking-section" id="tracking">
        <div><div className="eyebrow dark-eyebrow">SHIPMENT TRACKING</div><h2>Every delivery has a story.<br /><em>Follow yours.</em></h2><p className="tracking-intro">Enter your tracking number and the last four digits of the recipient's phone number to view shipment progress.</p></div>
        <div className="tracking-panel">
          <form className="tracking-form" onSubmit={trackShipment}>
            <label htmlFor="tracking-code">Shipment tracking number</label>
            <div className="tracking-input"><Package size={19} /><input id="tracking-code" value={trackingCode} onChange={(e) => setTrackingCode(e.target.value.toUpperCase())} placeholder="Enter your shipment reference" autoComplete="off" required /><button type="submit" aria-label="Track shipment" disabled={trackingState === 'loading'}><ArrowRight /></button></div>
            <label className="phone-last4-label" htmlFor="tracking-phone">Recipient phone — last four digits</label>
            <div className="tracking-input"><Phone size={18} /><input id="tracking-phone" inputMode="numeric" maxLength="4" value={trackingPhone} onChange={(e) => setTrackingPhone(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="e.g. 4821" required /></div>
            <button className="button track-submit" type="submit" disabled={trackingState === 'loading'}>{trackingState === 'loading' ? 'Checking shipment…' : 'Track shipment'} <ArrowRight size={16} /></button>
            {trackingState === 'error' && <p className="tracking-feedback error">{trackingError}</p>}
          </form>
          {trackingState === 'success' && trackingResult && <div className="tracking-result">
            <div className="result-heading"><span><CheckCircle2 size={17} /> Shipment found</span><strong>{trackingResult.shipment.tracking_number}</strong></div>
            <div className="result-current"><small>CURRENT STATUS</small><strong>{statusLabels[trackingResult.shipment.status] || trackingResult.shipment.status}</strong><span>{trackingResult.shipment.delivery_type} · {trackingResult.shipment.service_scope}</span></div>
            <div className="timeline"><strong>Shipment updates</strong>
              {trackingResult.events.length ? trackingResult.events.map((item, index) => <div className="timeline-item" key={item.status + item.occurred_at}><i className={index === trackingResult.events.length - 1 ? 'timeline-dot active' : 'timeline-dot'} /><div><b>{statusLabels[item.status] || item.status}</b>{item.location_label && <small>{item.location_label}</small>}{item.description && <small>{item.description}</small>}<small>{formatDate(item.occurred_at)}</small></div></div>) : <p className="timeline-empty">No progress updates have been recorded yet. Check again later.</p>}
            </div>
          </div>}
        </div>
      </section>

      <section className="services-section" id="services">
        <div className="section-heading"><div><div className="eyebrow dark-eyebrow">WHAT WE MOVE</div><h2>One platform.<br /><em>Every kind of delivery.</em></h2></div><p>Shipping options for individuals, growing businesses and organisations with goods to move. Send us your route and shipment details to discuss the right service.</p></div>
        <div className="service-grid">
          {services.map(({ icon: Icon, title, text }, index) => <article className="service-card" key={title}><div className="service-top"><span className="service-icon"><Icon size={23} /></span><span className="service-number">0{index + 1}</span></div><h3>{title}</h3><p>{text}</p><a className="service-arrow" href="#contact" aria-label={'Enquire about ' + title}><ArrowUpRight size={19} /></a></article>)}
        </div>
      </section>

      <section className="how-section" id="how-it-works">
        <div className="eyebrow">A CLEARER WAY TO SHIP</div><h2>From enquiry to <em>arrival.</em></h2>
        <div className="steps"><div><b>01</b><strong>Tell us what you need to send</strong><p>Share the shipment type, pickup location, destination and contact details.</p></div><div><b>02</b><strong>Discuss your delivery option</strong><p>Our team can review the route and follow up about available service and pricing.</p></div><div><b>03</b><strong>Prepare for shipment</strong><p>Once operations are active, shipment confirmation and tracking updates will be provided.</p></div></div>
      </section>

      <section className="quote-section" id="contact">
        <div className="quote-copy">
          <div className="eyebrow dark-eyebrow">START A SHIPPING ENQUIRY</div>
          <h2>Where does it<br /><em>need to go?</em></h2>
          <p>Tell us a little about your shipment. Send an enquiry and the platform operations team can follow up with you.</p>
          <div className="contact-points"><span><Mail size={17} /> Send a shipment enquiry</span><span><Compass size={17} /> Local and international routes</span><span><Boxes size={17} /> Parcels and cargo enquiries</span></div>
        </div>
        <form className="quote-form" name="shipment-enquiry" method="POST" data-netlify="true" netlify-honeypot="bot-field" onSubmit={submitEnquiry}>
          <input type="hidden" name="form-name" value="shipment-enquiry" />
          <p className="hidden-field"><label>Do not fill this in: <input name="bot-field" onChange={updateForm} /></label></p>
          <div className="form-grid">
            <label>Your name<input name="name" value={form.name} onChange={updateForm} placeholder="Full name" required /></label>
            <label>Email address<input name="email" type="email" value={form.email} onChange={updateForm} placeholder="you@example.com" required /></label>
            <label>Phone number<input name="phone" type="tel" value={form.phone} onChange={updateForm} placeholder="Phone / WhatsApp" required /></label>
            <label>Shipment type<select name="deliveryType" value={form.deliveryType} onChange={updateForm}><option>Parcel</option><option>Documents</option><option>Road freight</option><option>Air cargo</option><option>Sea freight</option><option>Other</option></select></label>
            <label>Pickup / origin<input name="origin" value={form.origin} onChange={updateForm} placeholder="City, country" required /></label>
            <label>Destination<input name="destination" value={form.destination} onChange={updateForm} placeholder="City, country" required /></label>
            <label className="full-field">Shipment details<textarea name="message" value={form.message} onChange={updateForm} placeholder="Describe your shipment, approximate size or weight, and preferred date." rows="4" /></label>
          </div>
          <button className="button submit-button" type="submit" disabled={formState === 'sending'}>{formState === 'sending' ? 'Sending enquiry…' : 'Send enquiry'} <Send size={16} /></button>
          {formState === 'sent' && <p className="form-feedback success"><CheckCircle2 size={16} /> Your enquiry has been submitted. Thank you.</p>}
          {formState === 'error' && <p className="form-feedback error">We couldn't send your enquiry. Please try again later.</p>}
          <small className="form-disclaimer">This is a shipping enquiry, not a confirmed booking or payment request.</small>
        </form>
      </section>

      <section className="about-section" id="about"><div className="about-icon"><Globe2 size={28} /></div><div><div className="eyebrow dark-eyebrow">BUILT TO CONNECT DISTANCES</div><h2>Moving goods.<br /><em>Bringing people closer.</em></h2></div><p>This independent platform is being developed for delivery and shipment management, bringing shipment enquiries, logistics coordination and tracking into one place.</p></section>

      <div id="account"><CustomerPortal /></div>

      <footer><a className="brand footer-brand" href="#home" aria-label="FedEx home"><img className="fedex-logo-img footer-logo-img" src="/fedex-express-logo.jpg" alt="FedEx Express" /></a><span>Independent platform preview · Not operated by FedEx.</span><span className="footer-status"><i /> {isSupabaseConfigured ? 'Backend project connected' : 'Backend setup pending'}</span><a className="admin-footer-link" href="#admin">Admin access</a></footer>
    </main>
  )
}

export default App
