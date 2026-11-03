# Malvis Express

Worldwide delivery and shipment management platform.

## Project foundation

- React + Vite frontend
- Supabase browser client configured with a publishable key only
- Netlify deployment configuration
- Responsive landing page, service overview and initial tracking interface

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

## Current build stage

The public landing-page foundation is in place. Phone/password authentication, shipment creation, pricing, tracking records, admin tools and payments remain upcoming implementation stages.
