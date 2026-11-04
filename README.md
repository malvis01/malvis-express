# Malvis Express

Worldwide delivery and shipment management platform.

## Project foundation

- React + Vite frontend
- Supabase backend using a browser-safe publishable key
- Netlify deployment configuration
- Responsive service, about, tracking and shipment-enquiry sections
- Netlify Forms markup for shipment enquiries

## Local development

1. Install Node.js 20.19+ or 22.12+.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. The example file is prefilled with this project's public URL and publishable key; these are safe for browser use.
5. Run `npm run dev`.

## Environment variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Never place a Supabase service-role or secret key in frontend environment variables.

## Current implementation status

- Public website pages and responsive navigation: implemented.
- Shipment enquiry form: configured for Netlify Forms; it receives submissions only after the site is deployed and Netlify detects the form.
- Public shipment tracking: connected to the `public-shipment-tracking` Supabase Edge Function. It requires the tracking number and the last four digits of the recipient phone number. The response intentionally excludes contact details, addresses, payment information and free-form event descriptions; it exposes only shipment status, location labels and update timestamps.
- Tracking visibility: only shipments with `tracking_code_issued = true` can be looked up. Shipment records must have a recipient phone number for verification.
- Administrator dashboard: password-only sign-in for the existing owner-provisioned admin account (Supabase Auth uses the fixed account email behind the scenes) and database admin-role verification. Admins can create shipments, issue tracking numbers, search shipments and customers, and see the latest recorded package location.
- Shipment progress: admin status and location changes are written through an admin-only, security-invoker database function so the shipment status and public timeline event commit atomically. Updates are audit logged.
- Guest shipment records are supported for admin-created bookings; a customer account can be linked later.
- Customer portal: visible Customer Login / Create Account entry points; customers register and sign in with phone number + password, submit shipment requests, and view only their own shipment records and latest location updates. Phone numbers are used as login identifiers through the existing `@phone.malvis-express.invalid` account pattern; they are not SMS-verified.
- Customer registration: the `customer-register` Edge Function creates accounts using the server-side Supabase service role, marks only the synthetic login email as confirmed, and applies a five-attempt-per-IP-per-hour throttle using hashed IP identifiers. The service-role key is never sent to the browser.
- Tracking code issuance: a database insert trigger generates unique request tracking numbers. Admins can issue a tracking code for customer requests from the admin dashboard.
- Payments and live courier integrations: not connected; no payment or shipment booking is represented as confirmed.

## Before launch

1. The owner administrator account and its `admin` role are already provisioned in the connected Supabase project.
2. Use the visible Admin login link and sign in with the existing owner administrator password. Use Customer login to create a test customer account with a phone number in international format and a password of at least eight characters.
3. Add production-grade rate limiting and abuse monitoring to the public tracking endpoint before broad public launch.
4. Run `npm install` and `npm run build` (also checked by GitHub Actions on pushes to `main`).
5. Deploy the site to Netlify and verify a test enquiry appears in the Netlify Forms dashboard.
6. Add phone ownership verification (SMS OTP) if phone-number ownership must be proven; the current password-only flow deliberately does not verify phone ownership. Complete pricing, payment-provider integration and live carrier connections before accepting paid bookings.

## Security notes

The tracking Edge Function uses a server-side Supabase secret key and returns only an allowlisted set of shipment progress fields. The secret key is never included in the browser bundle. Existing table row-level security policies have not been weakened to enable public tracking.
