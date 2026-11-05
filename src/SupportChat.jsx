import { useEffect, useState } from 'react'
import { MessageCircle, Send, RefreshCw } from 'lucide-react'
import { supabase } from './lib/supabase'

export default function SupportChat({ shipment }) {
  const [phoneLast4, setPhoneLast4] = useState('')
  const [verified, setVerified] = useState(false)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadMessages() {
    setBusy(true); setError('')
    const { data, error: invokeError } = await supabase.functions.invoke('shipment-support-chat', {
      body: { action: 'list', tracking_number: shipment.tracking_number, phone_last4: phoneLast4 },
    })
    if (invokeError || data?.error) setError(data?.error || 'Unable to load support messages.')
    else { setMessages(data.messages || []); setVerified(true) }
    setBusy(false)
  }
  async function sendMessage(event) {
    event.preventDefault()
    if (!draft.trim()) return
    setBusy(true); setError(''); setNotice('')
    const { data, error: invokeError } = await supabase.functions.invoke('shipment-support-chat', {
      body: { action: 'send', tracking_number: shipment.tracking_number, phone_last4: phoneLast4, message: draft.trim() },
    })
    if (invokeError || data?.error) setError(data?.error || 'Message could not be sent.')
    else { setDraft(''); setMessages((old) => [...old, data.message]); setNotice('Message sent to Flash Express support.') }
    setBusy(false)
  }
  useEffect(() => { if (verified) { const id = setInterval(loadMessages, 15000); return () => clearInterval(id) } }, [verified, phoneLast4, shipment.tracking_number])
  return <section className="tracking-support">
    <div className="tracking-support-heading"><span><MessageCircle size={19} /> Shipment support</span><small>Chat with our operations team</small></div>
    {!verified ? <form onSubmit={(e) => { e.preventDefault(); loadMessages() }}>
      <p>To protect shipment details, confirm the last four digits of the receiver's phone number.</p>
      <label>Receiver phone — last 4 digits<input inputMode="numeric" maxLength="4" pattern="[0-9]{4}" value={phoneLast4} onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, '').slice(0,4))} required /></label>
      <button className="button" disabled={busy || phoneLast4.length !== 4}>{busy ? 'Verifying…' : 'Open support chat'} <MessageCircle size={16}/></button>
    </form> : <>
      <div className="tracking-chat-messages">{messages.length ? messages.map((m) => <article key={m.id} className={'tracking-chat-message ' + (m.sender_type === 'receiver' ? 'from-receiver' : 'from-admin')}><b>{m.sender_type === 'receiver' ? 'You' : 'Flash Express Support'}</b><p>{m.message}</p><small>{new Date(m.created_at).toLocaleString()}</small></article>) : <p>No messages yet. Send a message to contact support.</p>}</div>
      <form onSubmit={sendMessage} className="tracking-chat-compose"><input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2000} placeholder="Write your message…" required/><button className="button" disabled={busy || !draft.trim()} aria-label="Send message"><Send size={16}/></button><button type="button" className="admin-plain-button" onClick={loadMessages} disabled={busy} aria-label="Refresh messages"><RefreshCw size={15}/></button></form>
    </>}
    {error && <p className="tracking-feedback error">{error}</p>}{notice && <p className="tracking-feedback">{notice}</p>}
  </section>
}
