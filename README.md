# Malvis Express

Worldwide delivery and shipment management platform.

## Project foundation

- React + Vite frontend
- Supabase browser client configured with a publishable key only
- Netlify deployment configuration
- Responsive service, about, tracking-information and shipment-enquiry sections
- Netlify Forms markup for shipment enquiries (submissions become active after deployment and form detection)

## Local development

1. Install Node.js 20.19+ or 22.12+.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Add the Supabase project URL and publishable key if using Supabase features.
5. Run `npm run dev`.

## Environment variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Never place a Supabase service-role or secret key in frontend environment variables.

## Current implementation status

- Public website pages and responsive navigation: implemented.
- Shipment enquiry form: configured for Netlify Forms; it cannot receive live submissions until deployed and form detection is enabled.
- Tracking lookup: interface is present, but public tracking queries are not yet connected. Existing shipment data is protected by authenticated-user policies; do not expose shipment records by weakening row-level security.
- Customer registration, sign-in and personal shipment management: intentionally scheduled for a later development stage.
- Payments and live courier integrations: not connected; no payment or shipment booking is represented as confirmed.

## Before launch

Run `npm install` and `npm run build`, configure the Netlify site to deploy from the `main` branch, then submit a test enquiry and verify it appears in the Netlify Forms dashboard. Add tracking through a narrowly scoped server-side endpoint before advertising public tracking as live.
