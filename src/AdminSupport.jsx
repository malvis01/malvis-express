import { useEffect, useState } from 'react'
import { MessageCircle, Send, RefreshCw } from 'lucide-react'
import { supabase } from './lib/supabase'

export default function AdminSupport({ delivery, adminId }) {
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function load() {
    setBusy(true); setError('')
    const { data, error: readError } = await supabase.from('support_messages')
      .select('id,sender_type,message,created_at')
      .eq('delivery_id', delivery.id).order('created_at', { ascending: true })
    if (readError) setError(readError.message); else setMessages(data || [])
    setBusy(false)
  }
  async function reply(e) {
    e.preventDefault()
    if (!draft.trim()) return
    setBusy(true); setError('')
    const { error: writeError } = await supabase.from('support_messages').insert({
      delivery_id: delivery.id, tracking_number: delivery.tracking_number,
      sender_type: 'admin', message: draft.trim(),
    })
    if (writeError) setError(writeError.message)
    else { setDraft(''); await load() }
    setBusy(false)
  }
  useEffect(() => { load() }, [delivery.id])
  return <section className="admin-support-panel">
    <h3><MessageCircle size={17}/> Receiver support · {delivery.tracking_number}</h3>
    <div className="admin-support-messages">{messages.map(m => <article key={m.id}><b>{m.sender_type === 'admin' ? 'Admin' : 'Receiver'}</b><p>{m.message}</p><small>{new Date(m.created_at).toLocaleString()}</small></article>)}{!messages.length && <p>No messages for this shipment yet.</p>}</div>
    <form onSubmit={reply}><input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Reply to receiver…" maxLength={2000} required/><button className="button" disabled={busy || !draft.trim()}><Send size={15}/> Reply</button><button type="button" className="admin-plain-button" onClick={load} disabled={busy}><RefreshCw size={14}/> Refresh</button></form>
    {error && <p className="admin-error">{error}</p>}
  </section>
}
