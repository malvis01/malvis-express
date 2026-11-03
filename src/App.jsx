import { useState } from 'react'
import {
  ArrowRight, ArrowUpRight, Globe2, Package, MapPin, ShieldCheck,
  Clock3, Menu, X, ChevronDown, Truck, Plane, Ship, CheckCircle2
} from 'lucide-react'
import { isSupabaseConfigured } from './lib/supabase'

const services = [
  { icon: Package, title: 'Local & international parcels', text: 'Send documents, packages and personal items across town or across borders.' },
  { icon: Truck, title: 'Road freight', text: 'Move goods by road with shipment updates from pickup to destination.' },
  { icon: Plane, title: 'Air cargo', text: 'Plan time-sensitive international shipments with clear delivery milestones.' },
  { icon: Ship, title: 'Sea freight', text: 'Arrange larger cargo movements for business and personal shipping.' },
]

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [trackingCode, setTrackingCode] = useState('')

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#" aria-label="Malvis Express home">
          <span className="brand-mark"><Package size={22} /></span>
          <span>MALVIS<span className="brand-light"> EXPRESS</span></span>
        </a>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">
          {menuOpen ? <X /> : <Menu />}
        </button>
        <nav className={menuOpen ? 'nav open' : 'nav'}>
          <a href="#services" onClick={() => setMenuOpen(false)}>Services</a>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
          <a href="#tracking" onClick={() => setMenuOpen(false)}>Track shipment</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
        </nav>
        <div className="nav-actions">
          <button className="login-link" onClick={() => alert('Customer sign-in will be connected in the authentication stage.')}>Log in</button>
          <button className="button button-small" onClick={() => alert('Shipment booking will be enabled after the backend is connected.')}>Send a package <ArrowUpRight size={16} /></button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="pulse" /> WORLDWIDE SHIPPING. ONE SIMPLE EXPERIENCE.</div>
          <h1>Deliver without<br /><em>borders.</em></h1>
          <p className="hero-text">From a small parcel to a major shipment, Malvis Express is building a simpler way to move what matters — locally and around the world.</p>
          <div className="hero-actions">
            <a className="button" href="#tracking">Track a shipment <ArrowRight size={17} /></a>
            <a className="text-link" href="#services">Explore our services <ArrowUpRight size={16} /></a>
          </div>
          <div className="hero-trust">
            <span><ShieldCheck size={17} /> Shipment visibility</span>
            <span><Globe2 size={17} /> Worldwide coverage</span>
          </div>
        </div>
        <div className="hero-art" aria-label="Delivery route illustration">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="route route-a" /><div className="route route-b" />
          <div className="map-dot dot-one"><MapPin size={18} /></div>
          <div className="map-dot dot-two"><MapPin size={18} /></div>
          <div className="map-dot dot-three"><MapPin size={18} /></div>
          <div className="parcel-card">
            <div className="parcel-icon"><Package size={30} /></div>
            <div><small>YOUR SHIPMENT</small><strong>Moving forward</strong><span><i /> Route planning in progress</span></div>
            <ArrowUpRight className="parcel-arrow" size={19} />
          </div>
          <div className="floating-tag"><Globe2 size={16} /> Across the world</div>
          <div className="hero-stamp">MX<span>•</span></div>
        </div>
      </section>

      <section className="quick-strip">
        <div><span className="strip-icon"><Package /></span><span><strong>All shipment types</strong><small>Parcels, freight and more</small></span></div>
        <div><span className="strip-icon"><Globe2 /></span><span><strong>Worldwide direction</strong><small>Send and receive globally</small></span></div>
        <div><span className="strip-icon"><Clock3 /></span><span><strong>Clear milestones</strong><small>Know where your shipment is</small></span></div>
      </section>

      <section className="tracking-section" id="tracking">
        <div><div className="eyebrow dark-eyebrow">SHIPMENT TRACKING</div><h2>Every delivery has a story.<br /><em>Follow yours.</em></h2></div>
        <form className="tracking-form" onSubmit={(event) => { event.preventDefault(); alert(trackingCode.trim() ? 'Tracking will be activated when shipment records are connected.' : 'Enter your tracking number to continue.') }}>
          <label htmlFor="tracking-code">Enter your tracking number</label>
          <div className="tracking-input"><Package size={19} /><input id="tracking-code" value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} placeholder="e.g. MX-2048-8391" /><button type="submit" aria-label="Track shipment"><ArrowRight /></button></div>
          <small>Tracking lookup will go live when the shipment database is connected.</small>
        </form>
      </section>

      <section className="services-section" id="services">
        <div className="section-heading"><div><div className="eyebrow dark-eyebrow">WHAT WE MOVE</div><h2>One platform.<br /><em>Every kind of delivery.</em></h2></div><p>Flexible shipping options designed for individuals, growing businesses and organisations with goods to move.</p></div>
        <div className="service-grid">
          {services.map(({ icon: Icon, title, text }, index) => <article className="service-card" key={title}><div className="service-top"><span className="service-icon"><Icon size={23} /></span><span className="service-number">0{index + 1}</span></div><h3>{title}</h3><p>{text}</p><span className="service-arrow"><ArrowUpRight size={19} /></span></article>)}
        </div>
      </section>

      <section className="how-section" id="how-it-works">
        <div className="eyebrow">A CLEARER WAY TO SHIP</div><h2>From pickup to <em>arrival.</em></h2>
        <div className="steps"><div><b>01</b><strong>Create your shipment</strong><p>Enter sender, receiver, parcel and destination details.</p></div><div><b>02</b><strong>Choose your delivery</strong><p>Review available delivery methods and transparent pricing.</p></div><div><b>03</b><strong>Follow the journey</strong><p>Use your tracking reference to follow shipment progress.</p></div></div>
      </section>

      <section className="about-section" id="about"><div className="about-icon"><Globe2 size={28} /></div><div><div className="eyebrow dark-eyebrow">BUILT TO CONNECT DISTANCES</div><h2>Moving goods.<br /><em>Bringing people closer.</em></h2></div><p>Malvis Express is being developed as a worldwide delivery and shipment management platform, bringing booking, logistics coordination and tracking into one place.</p></section>

      <footer><a className="brand footer-brand" href="#"><span className="brand-mark"><Package size={20} /></span><span>MALVIS<span className="brand-light"> EXPRESS</span></span></a><span>© {new Date().getFullYear()} Malvis Express. Built to move what matters.</span><span className="footer-status"><i /> {isSupabaseConfigured ? 'Backend settings detected' : 'Backend setup in progress'}</span></footer>
    </main>
  )
}

export default App
