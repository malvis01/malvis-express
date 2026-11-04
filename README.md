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
4. Add the Supabase project URL and publishable key.
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
- Customer registration, sign-in and personal shipment management: intentionally scheduled for a later development stage.
- Payments and live courier integrations: not connected; no payment or shipment booking is represented as confirmed.

## Before launch

1. Provision the first administrator account in Supabase Auth and assign its user ID the `admin` role in `public.user_roles`.
2. Sign in at the website's Admin access page using the administrator account password and create a real test shipment. The sign-in screen does not ask for a phone number.
3. Add production-grade rate limiting and abuse monitoring to the public tracking endpoint before broad public launch.
4. Run `npm install` and `npm run build` (also checked by GitHub Actions on pushes to `main`).
5. Deploy the site to Netlify and verify a test enquiry appears in the Netlify Forms dashboard.
6. Complete customer registration and personal shipment management, pricing, payment-provider integration and live carrier connections before accepting paid bookings.

## Security notes

The tracking Edge Function uses a server-side Supabase secret key and returns only an allowlisted set of shipment progress fields. The secret key is never included in the browser bundle. Existing table row-level security policies have not been weakened to enable public tracking.
