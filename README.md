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
- Public shipment tracking: connected to the `public-shipment-tracking` Supabase Edge Function. It requires the tracking number and the last four digits of the recipient phone number. The response intentionally excludes contact details, addresses, payment information and free-form event descriptions.
- Tracking visibility: only shipments with `tracking_code_issued = true` can be looked up. Shipment records must have a recipient phone number for verification.
- Customer registration, sign-in and personal shipment management: intentionally scheduled for a later development stage.
- Payments and live courier integrations: not connected; no payment or shipment booking is represented as confirmed.

## Before launch

1. Verify the Edge Function using a real test shipment after the admin shipment workflow can issue a tracking number and save the recipient phone.
2. Add production-grade rate limiting and abuse monitoring to the public tracking endpoint.
3. Run `npm install` and `npm run build` (also checked by GitHub Actions on pushes to `main`).
4. Deploy the site to Netlify and verify a test enquiry appears in the Netlify Forms dashboard.
5. Complete customer authentication, admin shipment operations, pricing and payment-provider integration before accepting paid bookings.

## Security notes

The tracking Edge Function uses a server-side Supabase secret key and returns only an allowlisted set of shipment progress fields. The secret key is never included in the browser bundle. Existing table row-level security policies have not been weakened to enable public tracking.
