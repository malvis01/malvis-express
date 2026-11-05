import { useEffect, useState } from 'react'
import {
  ArrowRight, ArrowUpRight, Globe2, Package, MapPin, ShieldCheck,
  Clock3, Menu, X, Truck, Plane, Ship, CheckCircle2, Phone,
  FileText, UserRound, UserPlus, Headphones, Handshake, ChevronDown, Search
} from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import AdminDashboard from './AdminDashboard.jsx'
import CustomerPortal from './CustomerPortal.jsx'

const services = [
  { icon: Package, title: 'Parcels & documents', text: 'For personal packages, important documents and everyday deliveries.' },
  { icon: Truck, title: 'Road freight', text: 'Road transportation for goods, business supplies and larger consignments.' },
  { icon: Plane, title: 'Air cargo', text: 'Air-freight options for time-sensitive international shipments.' },
  { icon: Ship, title: 'Sea freight', text: 'Sea-freight options for bulk cargo and larger international movements.' },
]

function App() {
  const [adminMode, setAdminMode] = useState(window.location.hash === '#admin')
  const [customerMode, setCustomerMode] = useState(window.location.hash.startsWith('#account'))
  useEffect(() => {
    const syncRoute = () => {
      setAdminMode(window.location.hash === '#admin')
      setCustomerMode(window.location.hash.startsWith('#account'))
    }
    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
  }, [])
  const [menuOpen, setMenuOpen] = useState(false)
  const [trackingCode, setTrackingCode] = useState('')
  const [trackingPhone, setTrackingPhone] = useState('')
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
    try {
      const { data, error } = await supabase.functions.invoke('public-shipment-tracking', {
        body: { tracking_number: trackingCode.trim(), phone_last4: trackingPhone.trim() },
      })
      if (error || data?.error || !data?.shipment) {
        setTrackingState('error')
        setTrackingError(data?.error || 'We could not find that shipment. Check the tracking number and recipient phone digits, then try again.')
        return
      }
      setTrackingResult(data)
      setTrackingState('success')
    } catch {
      setTrackingState('error')
      setTrackingError('The tracking service could not be reached. Please try again in a moment.')
    }
  }

  if (adminMode) return <AdminDashboard onExit={() => { window.location.hash = '#home'; setAdminMode(false); setCustomerMode(false) }} />
  if (customerMode) return <CustomerPortal initialMode={window.location.hash.includes('signup') ? 'register' : 'login'} onExit={() => { window.location.hash = '#home'; setCustomerMode(false); setAdminMode(false) }} />

  return (
    <main>
      <header className="topbar">
        <a className="brand brand-logo" href="#home" aria-label="FedEx home">
          <span className="brand-mark"><Truck size={29} strokeWidth={2.5} /></span>
          <span className="brand-wordmark"><strong>Fed<span className="fedex-orange">Ex</span></strong><small>Delivering More, Faster!</small></span>
        </a>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">
          {menuOpen ? <X /> : <Menu />}
        </button>
        <nav className={menuOpen ? 'nav open' : 'nav'}>
          <a className="nav-home" href="#home" onClick={closeMenu}>Home</a>
          <a href="#tracking" onClick={closeMenu}>Track Package</a>
          <a className="nav-services" href="#services" onClick={closeMenu}>Services <ChevronDown size={15} /></a>
          <a href="#about" onClick={closeMenu}>About</a>
        </nav>
        <div className="nav-actions">
          <a className="button button-login" href="#account" onClick={closeMenu}><UserRound size={16} /> Login</a>
          <a className="button button-signup" href="#account-signup" onClick={closeMenu}><UserPlus size={16} /> Sign Up</a>
        </div>
      </header>
      <section className="hero hero-redesign" id="home">
        <div className="hero-copy">
          <div className="eyebrow hero-badge"><Globe2 size={16} /> Worldwide Delivery Service <i /></div>
          <h1>FedEx<br />Your <em>Global Delivery</em><br />Partner</h1>
          <p className="hero-text">Send and receive packages anywhere in the world — safely, fast and reliably!</p>
          <div className="hero-actions">
            <a className="button hero-primary" href="#tracking"><Package size={20} /> Track Your Package <ArrowRight size={18} /></a>
            <a className="button hero-secondary" href="#services"><span className="play-mark">▶</span> Learn More</a>
          </div>
        </div>
        <div className="hero-visual hero-image-placeholder" role="img" aria-label="Global logistics image area">
          <div className="placeholder-topline"><span className="placeholder-mark"><Globe2 size={19} /></span><span>GLOBAL LOGISTICS SOLUTIONS</span></div>
          <div className="placeholder-globe"><Globe2 size={150} strokeWidth={0.7} /></div>
          <div className="placeholder-route route-one"><i /><span /><b /></div>
          <div className="placeholder-route route-two"><i /><span /><b /></div>
          <div className="placeholder-plane"><Plane size={38} /></div>
          <div className="placeholder-package"><Package size={48} /></div>
          <div className="placeholder-caption"><small>DELIVERING MORE, FASTER!</small><strong>Connecting people<br />and possibilities.</strong></div>
          <div className="hero-track-card">
            <h3><MapPin size={19} fill="currentColor" /> Track Your Shipment</h3>
            <form onSubmit={trackShipment}>
              <label className="hero-track-input"><Package size={15} /><input aria-label="Tracking number" value={trackingCode} onChange={(e) => setTrackingCode(e.target.value.toUpperCase())} placeholder="Enter Tracking Number..." required /></label>
              <button className="hero-track-button" type="submit" disabled={trackingState === 'loading'}><Search size={17} /> {trackingState === 'loading' ? 'Checking…' : 'Track Now'}</button>
              <label className="hero-track-verify"><ShieldCheck size={15} /> <span>Verify Recipient</span><input aria-label="Recipient phone last four digits" inputMode="numeric" maxLength="4" value={trackingPhone} onChange={(e) => setTrackingPhone(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="Last 4 digits" required /></label>
            </form>
            <div className="hero-track-journey"><strong>Shipment Journey</strong>
              {trackingState === 'success' && trackingResult ? <><b><CheckCircle2 size={15} /> {statusLabels[trackingResult.shipment.status] || trackingResult.shipment.status}</b><small>Latest verified shipment status</small><a href="#tracking">View full shipment updates <ArrowRight size={13} /></a></> : trackingState === 'error' ? <p className="hero-track-error">{trackingError}</p> : <p>Enter your tracking details to view verified shipment progress and delivery updates.</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="quick-strip benefits-strip">
        <div><span className="strip-icon"><Globe2 /></span><span><strong>Worldwide</strong><small>Shipping</small></span></div>
        <div><span className="strip-icon"><Clock3 /></span><span><strong>Fast & Reliable</strong><small>Delivery options</small></span></div>
        <div><span className="strip-icon"><ShieldCheck /></span><span><strong>Secure & Safe</strong><small>Shipment handling</small></span></div>
        <div><span className="strip-icon"><Headphones /></span><span><strong>Helpful</strong><small>Customer support</small></span></div>
        <div><span className="strip-icon"><Handshake /></span><span><strong>Customer First</strong><small>Service approach</small></span></div>
      </section>

      <section className="tracking-section" id="tracking">
        <div><div className="eyebrow dark-eyebrow">SHIPMENT TRACKING</div><h2>Every delivery has a story.<br /><em>Follow yours.</em></h2><p className="tracking-intro">Enter your tracking number and the last four digits of the recipient's phone number to view shipment progress.</p></div>
        <div className="tracking-panel">
          <form className="tracking-form" onSubmit={trackShipment}>
            <label htmlFor="tracking-code">FedEx tracking number</label>
            <div className="tracking-input"><Package size={19} /><input id="tracking-code" value={trackingCode} onChange={(e) => setTrackingCode(e.target.value.toUpperCase())} placeholder="MX-REQ-XXXXXXXXXX" autoComplete="off" required /><button type="submit" aria-label="Track shipment" disabled={trackingState === 'loading'}><ArrowRight /></button></div>
            <label className="phone-last4-label" htmlFor="tracking-phone">Recipient phone — last four digits</label>
            <div className="tracking-input"><Phone size={18} /><input id="tracking-phone" inputMode="numeric" maxLength="4" value={trackingPhone} onChange={(e) => setTrackingPhone(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="e.g. 4821" required /></div>
            <button className="button track-submit" type="submit" disabled={trackingState === 'loading'}>{trackingState === 'loading' ? 'Checking shipment…' : 'Track shipment'} <ArrowRight size={16} /></button>
            {trackingState === 'error' && <p className="tracking-feedback error">{trackingError}</p>}
          </form>
          {trackingState === 'success' && trackingResult && <div className="tracking-result">
            <div className="result-heading"><span><CheckCircle2 size={17} /> Shipment found</span><strong>{trackingResult.shipment.tracking_number}</strong></div>
            <div className="result-current"><small>CURRENT STATUS</small><strong>{statusLabels[trackingResult.shipment.status] || trackingResult.shipment.status}</strong><span>{trackingResult.shipment.delivery_type} · {trackingResult.shipment.service_scope}</span></div>
            <div className="timeline"><strong>Shipment updates</strong>
              {trackingResult.events.length ? trackingResult.events.map((item, index) => <div className="timeline-item" key={item.status + item.occurred_at}><i className={index === trackingResult.events.length - 1 ? 'timeline-dot active' : 'timeline-dot'} /><div><b>{statusLabels[item.status] || item.status}</b>{item.location_label && <small><MapPin size={12} /> {item.location_label}</small>}<small>{formatDate(item.occurred_at)}</small></div></div>) : <p className="timeline-empty">No progress updates have been recorded yet. Check again later.</p>}
            </div>
          </div>}
        </div>
      </section>

      <section className="services-section reference-services" id="services">
        <div className="reference-service-main">
          <div className="section-heading"><div><div className="eyebrow dark-eyebrow">OUR DELIVERY SERVICES</div><h2>Fast. Reliable. <em>Everywhere.</em></h2></div><p>From local deliveries to international shipments, we help you explore delivery options with care and professionalism.</p></div>
          <div className="service-grid">
            {services.map(({ icon: Icon, title, text }, index) => <article className={'service-card service-card-' + index} key={title}>
              <div className="service-art"><span className="service-art-icon"><Icon size={46} /></span><span className="service-art-orbit" /></div>
              <div className="service-card-content"><span className="service-icon"><Icon size={25} /></span><div><h3>{title === 'Parcels & documents' ? 'Parcel Delivery' : title === 'Road freight' ? 'Road Delivery' : title === 'Air cargo' ? 'Air Freight' : 'Sea Freight'}</h3><p>{index === 0 ? 'Small Packages, Big Care' : index === 1 ? 'Fast & Reliable' : index === 2 ? 'Global Reach' : 'Cost Effective'}</p></div><a className="service-arrow" href="#tracking" aria-label={'Track shipment information for ' + title}><ArrowRight size={16} /></a></div>
            </article>)}
          </div>
        </div>
        <aside className="global-promo">
          <div className="promo-map"><Globe2 size={190} strokeWidth={0.7} /></div>
          <div className="promo-plane"><Plane size={64} /></div>
          <div className="promo-copy"><h3>We connect<br />you to the world</h3><p>Your logistics partner<br />for a bigger tomorrow.</p><a href="#tracking" className="promo-button">Get Started <ArrowRight size={16} /></a></div>
          <div className="promo-ship"><Ship size={58} /><Truck size={54} /></div>
        </aside>
      </section>

      <section className="stats-strip">
        <div><span><Package /></span><strong>One platform</strong><small>Shipment requests</small></div>
        <div><span><UserRound /></span><strong>Customer accounts</strong><small>Sign in and manage shipments</small></div>
        <div><span><Globe2 /></span><strong>Global reach</strong><small>International delivery</small></div>
        <div><span><ShieldCheck /></span><strong>Safe & organised</strong><small>Shipment visibility</small></div>
      </section>

      <section className="how-section" id="how-it-works">
        <div className="eyebrow">A CLEARER WAY TO SHIP</div><h2>From pickup to <em>arrival.</em></h2>
        <div className="steps"><div><b>01</b><strong>Tell us what you need to send</strong><p>Share the shipment type, pickup location, destination and contact details.</p></div><div><b>02</b><strong>Discuss your delivery option</strong><p>Our team can review the route and follow up about available service and pricing.</p></div><div><b>03</b><strong>Prepare for shipment</strong><p>Once operations are active, shipment confirmation and tracking updates will be provided.</p></div></div>
      </section>

      <section className="about-section" id="about"><div className="about-icon"><Globe2 size={28} /></div><div><div className="eyebrow dark-eyebrow">BUILT TO CONNECT DISTANCES</div><h2>Moving goods.<br /><em>Bringing people closer.</em></h2></div><p>We provide a worldwide delivery and shipment management experience, bringing logistics coordination and tracking into one place.</p></section>

      <section className="portal-section" id="account">
        <div className="portal-icon"><FileText size={23} /></div>
        <div><strong>Customer account portal</strong><p>Sign in with your phone number and password, create an account, submit shipment requests and follow your delivery progress.</p></div>
        <a className="portal-action" href="#account">Customer login <ArrowRight size={15} /></a>
      </section>

      <footer><a className="brand footer-brand" href="#home"><span className="brand-mark"><Package size={20} /></span><span>Fed<span className="fedex-orange">Ex</span></span></a><span>© {new Date().getFullYear()} FedEx.</span><span className="footer-status"><i /> {isSupabaseConfigured ? 'Backend project connected' : 'Backend setup pending'}</span><a className="admin-footer-link" href="#admin">Admin access</a></footer>
    </main>
  )
}

export default App
