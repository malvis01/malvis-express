export function normalizePhoneE164(value) {
  const raw = String(value || '').trim()
  const digits = raw.replace(/\D/g, '')
  if (!digits) throw new Error('Enter a valid phone number.')
  let normalized
  if (raw.startsWith('+')) normalized = '+' + digits
  else if (digits.startsWith('0')) normalized = '+234' + digits.slice(1)
  else if (digits.startsWith('234')) normalized = '+' + digits
  else throw new Error('Include your country code for international numbers, e.g. +234...')
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) throw new Error('Enter a valid phone number with country code.')
  return normalized
}

// Supabase email/password auth is used behind the scenes; customers only see their phone number.
export function phoneToAuthEmail(value) {
  const phone = normalizePhoneE164(value)
  return phone.slice(1) + '@phone.malvis-express.invalid'
}
