import { useEffect, useState } from 'react'
import {
  ArrowRight, ArrowUpRight, Globe2, Package, MapPin, ShieldCheck,
  Clock3, Menu, X, Truck, Plane, Ship, CheckCircle2, Mail,
  Send, Compass, Boxes, FileText
} from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import AdminDashboard from './AdminDashboard.jsx'

const services = [
  { icon: Package, title: 'Parcels & documents', text: 'For personal packages, important documents and everyday deliveries.' },
  { icon: Truck, title: 'Road freight', text: 'Road transportation for goods, business supplies and larger consignments.' },
  { icon: Plane, title: 'Air cargo', text: 'Air-freight enquiries for time-sensitive international shipments.' },
  { icon: Ship, title: 'Sea freight', text: 'Sea-freight enquiries for bulk cargo and larger international movements.' },
]

function App() {
  const [adminMode, setAdminMode] = useState(window.location.hash === '#admin')
  useEffect(() => {
    const syncRoute = () => setAdminMode(window.location.hash === '#admin')
    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
  }, [])
  const [menuOpen, setMenuOpen] = useState(false)
  const [trackingCode, setTrackingCode] = useState('')
  const [trackingState, setTrackingState] = useState('idle')
  const [trackingResult, setTrackingResult] = useState(null)
  const [trackingError, setTrackingError] = useState('')

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
      body: { tracking_number: trackingCode }, 
    })
    if (error || data?.error) {
      setTrackingState('error')
      setTrackingError(data?.error || 'We could not complete the tracking lookup. Please try again.')
      return
    }
    setTrackingResult(data)
    setTrackingState('success')
  }
  if (adminMode) return <AdminDashboard onExit={() => { window.location.hash = '#home'; setAdminMode(false) }} />

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#home" aria-label="Flash Express Delivery Service home">
          <span className="fedex-text-logo">Flash <small>Express</small></span>
        </a>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">
          {menuOpen ? <X /> : <Menu />}
        </button>
        <nav className={menuOpen ? 'nav open' : 'nav'}>
          <a href="#home" onClick={closeMenu}>Home</a>
          <a href="#tracking" onClick={closeMenu}>Track package</a>
          <a href="#services" onClick={closeMenu}>Services</a>
          <a href="#about" onClick={closeMenu}>About</a>
          <a href="#admin" onClick={closeMenu}>Admin login</a>
        </nav>
        <div className="nav-actions"><a className="button button-small" href="#admin">Admin portal <ArrowUpRight size={16} /></a></div>
      </header>

      <section className="hero" id="home">
        <div className="hero-copy">
          <div className="eyebrow"><span className="pulse" /> WORLDWIDE DELIVERY SERVICE</div>
          <h1>Global shipping,<br />made <em>simpler</em></h1>
          <p className="hero-text">Send and receive packages across the world with a simpler shipment experience — from shipment registration to tracking updates.</p>
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
            <div><small>Flash Express</small><strong>Global logistics</strong><span><i /> Your delivery, in view</span></div>
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
        <div><div className="eyebrow dark-eyebrow">SHIPMENT TRACKING</div><h2>Every delivery has a story.<br /><em>Follow yours.</em></h2><p className="tracking-intro">Enter the tracking code provided by the shipment administrator to view shipment progress.</p></div>
        <div className="tracking-panel">
          <form className="tracking-form" onSubmit={trackShipment}>
            <label htmlFor="tracking-code">Shipment tracking number</label>
            <div className="tracking-input"><Package size={19} /><input id="tracking-code" value={trackingCode} onChange={(e) => setTrackingCode(e.target.value.toUpperCase())} placeholder="Enter your shipment reference" autoComplete="off" required /><button type="submit" aria-label="Track shipment" disabled={trackingState === 'loading'}><ArrowRight /></button></div>
            <button className="button track-submit" type="submit" disabled={trackingState === 'loading'}>{trackingState === 'loading' ? 'Checking shipment…' : 'Track shipment'} <ArrowRight size={16} /></button>
            {trackingState === 'error' && <p className="tracking-feedback error">{trackingError}</p>}
          </form>
          {trackingState === 'success' && trackingResult && <div className="tracking-result">
            <div className="result-heading"><span><CheckCircle2 size={17} /> Shipment found</span><strong>{trackingResult.shipment.tracking_number}</strong></div>
            <div className="result-current"><small>CURRENT STATUS</small><strong>{statusLabels[trackingResult.shipment.status] || trackingResult.shipment.status}</strong><span>{trackingResult.shipment.delivery_type} · {trackingResult.shipment.service_scope}</span></div>
            <div className="tracking-parties" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', padding: '16px 0', borderBottom: '1px solid #edf1f3' }}>
              <div><small>SENDER</small><b style={{ display: 'block', marginTop: '5px' }}>{trackingResult.shipment.pickup_contact_name || '—'}</b><span>{trackingResult.shipment.pickup_location_label || '—'}</span></div>
              <div><small>RECEIVER</small><b style={{ display: 'block', marginTop: '5px' }}>{trackingResult.shipment.dropoff_contact_name || '—'}</b><span>{trackingResult.shipment.dropoff_location_label || '—'}</span></div>
            </div>
            {trackingResult.shipment.customer_note && <p className="tracking-package-note" style={{ fontSize: '11px', color: '#657b87', lineHeight: 1.6, paddingTop: '12px' }}>{trackingResult.shipment.customer_note}</p>}
            {trackingResult.shipment.package_image_url && <img src={trackingResult.shipment.package_image_url} alt="Package" style={{ maxWidth: '100%', maxHeight: '190px', objectFit: 'contain', marginTop: '10px', borderRadius: '6px' }} />}
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

      <section className="about-section" id="about"><div className="about-icon"><Globe2 size={28} /></div><div><div className="eyebrow dark-eyebrow">BUILT TO CONNECT DISTANCES</div><h2>Moving goods.<br /><em>Bringing people closer.</em></h2></div><p>This independent platform is being developed for delivery and shipment management, bringing shipment enquiries, logistics coordination and tracking into one place.</p></section>


      <footer><a className="brand footer-brand" href="#home" aria-label="Flash Express home"><span className="fedex-text-logo">Flash <small>Express</small></span></a><span>Flash Express Delivery Service · Shipment management and tracking</span><span className="footer-status"><i /> {isSupabaseConfigured ? 'Backend project connected' : 'Backend setup pending'}</span><a className="admin-footer-link" href="#admin">Admin access</a></footer>
    </main>
  )
}

export default App
