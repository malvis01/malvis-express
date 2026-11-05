# FedEx-branded delivery platform prototype

Worldwide delivery and shipment management platform.

## Stack

- React + Vite frontend
- Supabase Auth, Postgres, Row Level Security and Edge Functions
- Netlify deployment
- GitHub Actions build verification and ZIP artifacts

## Supabase project

Project ref: `pgkkojkcbjvhbtcqccmu`

The database schema is versioned in `supabase/migrations/`. It includes:

- `profiles` — user profile details linked to Supabase Auth
- `user_roles` — administrator role assignments
- `deliveries` — shipment records and generated tracking numbers
- `shipment_events` — shipment journey updates
- `audit_logs` — admin-only shipment audit history

Row Level Security is enabled on every public table. Customers can read only their own linked shipments and events; administrators can manage shipment operations. Public tracking is handled by the Edge Function and does not expose recipient phone numbers or internal shipment IDs.

## Local development

1. Install Node.js 20.19+ or 22.12+.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Set the Supabase URL and publishable key below.
5. Run `npm run dev`.

Environment variables:

- `VITE_SUPABASE_URL=https://pgkkojkcbjvhbtcqccmu.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` — use the project's publishable key. Never use a service-role or secret key in browser code.

For Netlify, add these same two variables under Site configuration → Environment variables, then trigger a new deploy.

## Authentication setup

In Supabase Dashboard → Authentication → Providers, enable Phone sign-in. For the requested phone-number-and-password flow without OTP, configure phone confirmation according to the product's no-OTP requirement and test signup/sign-in before launch. Do not expose admin signup publicly.

The first administrator must first be created through the trusted project-owner process. Then assign the admin role to that Auth user's UUID using the SQL editor:

```sql
insert into public.user_roles (user_id, role)
values ('AUTH_USER_UUID_HERE', 'admin');
```

Do not share passwords or service keys. Keep the admin UUID private.

## Shipment tracking

The `public-shipment-tracking` Edge Function is in `supabase/functions/public-shipment-tracking/`. It accepts a tracking number and the recipient phone's last four digits, then returns the shipment status and journey events without returning the recipient's phone number.

Deploy with the Supabase CLI after linking the project:

```bash
supabase link --project-ref pgkkojkcbjvhbtcqccmu
supabase functions deploy public-shipment-tracking
```

Before public launch, add persistent rate limiting and abuse monitoring to the tracking endpoint.

## Current implementation status

- Public website pages and responsive navigation: implemented.
- Shipment enquiry form: configured for Netlify Forms; it receives submissions only after deployment and Netlify detects the form.
- Public tracking: Edge Function deployed to the new Supabase project; test with a real admin-created shipment after admin provisioning.
- Admin dashboard: phone/password sign-in, admin-role verification, shipment creation, search, status updates and journey events are implemented in the frontend.
- Customer registration and personal shipment management: implemented with phone/password authentication, shipment requests and private shipment views.
- Manual bank-transfer payments: admin quote and bank instructions, customer receipt upload to private Storage, admin-only verification/rejection, and tracking-code release after confirmation.
- Automatic payment gateways and live courier integrations: not connected; bank transfers are verified manually.

## Before launch

1. Add the two frontend environment variables to Netlify and redeploy.
2. Enable and test phone/password authentication.
3. Provision the first administrator securely.
4. Test customer signup, shipment request, admin quote, bank instructions, receipt upload, admin verification, tracking-code release and public tracking end-to-end.
5. Add persistent rate limiting and abuse monitoring to public tracking.
6. Verify GitHub Actions build checks and the latest Netlify deploy preview.
7. Configure real bank account details and support procedures before accepting customer transfers.

## Security

- Never place a Supabase service-role or secret key in frontend code or `VITE_*` variables.
- Keep Row Level Security enabled on exposed tables.
- Admin role assignment is owner-controlled; users cannot grant themselves roles.
- Tracking responses omit private phone numbers and internal record IDs.
