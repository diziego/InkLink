# InkLink

InkLink is a local-first print fulfillment marketplace concept for small brands, creators, and vetted print providers.

The MVP focuses on DTG orders first, with a transparent provider recommendation engine that can later expand to DTF, screen print, embroidery, heat transfer, local courier delivery, Shopify import, and split routing.

## Problem

Small brands often outgrow generic print-on-demand tools before they are ready to manage a full vendor network. Local print providers may offer better quality, faster pickup, premium blank options, and stronger community fit, but they are hard to compare consistently.

The usual tradeoff is messy:

- Merchants have limited visibility into quality, turnaround, blank availability, and capacity.
- Providers get requests that may not fit their equipment, SLA, or current workload.
- Admin or marketplace operators need a clear way to verify providers before routing real orders.

## Solution

InkLink models a focused marketplace flow:

- Merchants create a DTG-first order using simple fulfillment preferences.
- Providers expose capabilities, capacity, supported garments, local pickup, verification status, and tier.
- Admins review provider readiness before providers become stronger routing candidates.
- A deterministic routing engine ranks providers using transparent factor scores instead of a black-box recommendation.

The current app is a mocked MVP demo. It is designed to show the product workflow, data model direction, and routing logic before backend wiring.

Supabase foundation is now included for the next migration phase, but the current UI still reads from local mock data unless explicitly migrated.

## Target Users

- Small apparel brands testing local fulfillment.
- Creators selling limited merch drops.
- Premium blank-friendly merchants who care about quality and sourcing.
- Local DTG providers looking for better-fit order demand.
- Marketplace operators/admins reviewing provider quality and readiness.

## Current MVP Features

- Branded landing page for the InkLink concept.
- Merchant order demo at `/merchant` with editable mocked inputs:
  - fulfillment ZIP
  - fulfillment goal
  - local pickup preference
  - garment type
  - quantity
  - preferred blank brand and style
  - DTG default print method
- Demo scenario presets for common mocked order cases.
- Ranked provider recommendations with:
  - provider name
  - total score
  - factor breakdown
  - explanation
  - estimated turnaround
  - mocked shipping cost
  - mocked distance
  - capacity notes
  - local pickup support
- Provider profile/onboarding demo at `/provider`.
- Admin provider verification/review demo at `/admin`.
- Shared UI components for headers, cards, badges, section headings, stat cards, notices, and metrics.
- Strongly typed mock marketplace data for merchants, providers, capabilities, inventory, orders, and quality metrics.
- Supabase wiring foundation:
  - environment variable support
  - browser/server/service-role helpers
  - initial SQL migration structure aligned to the current domain model

## Routing Engine

The routing engine lives in `src/lib/routing` and is intentionally isolated from UI code.

It ranks providers deterministically using editable weights from `src/lib/routing/weights.ts`. Each recommendation returns a total score, factor breakdown, explanation, and operational notes.

Current scoring factors:

- print method compatibility
- garment compatibility
- blank availability
- provider verification or tier
- provider quality score
- turnaround SLA
- provider capacity
- proximity to fulfillment ZIP
- mocked shipping cost
- local pickup preference
- merchant fulfillment goal

The goal is transparency: a merchant or marketplace operator can see why a provider ranked highly and which factors helped or hurt the score.

## Mocked Vs Real Status

Mocked today:

- Merchant orders and profile data
- Provider profiles and capabilities
- Provider verification status and tier
- Blank inventory and availability
- Quality metrics
- Distance/proximity estimates
- Shipping cost estimates
- Capacity fit calculations
- Admin review actions
- Auth/session behavior

Ready for future integration:

- Typed marketplace models in `src/types`
- Mock seed datasets in `src/lib/mock-data`
- Routing engine API in `src/lib/routing`
- Supabase helper layer in `src/lib/supabase`
- Initial schema in `supabase/migrations`
- Merchant recommendation screen wired to the routing engine
- Provider/admin screens that display routing-relevant provider signals

Not implemented yet:

- Supabase auth UI flows
- Live reads/writes from the current pages
- Persistent order creation
- Provider profile editing
- Admin verification mutations
- Real shipping, geocoding, blank supplier, payout, or Shopify integrations

## Tech Stack

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- ESLint

Planned stack additions:

- Zod for server-side form validation
- shadcn/ui only where it clearly reduces UI repetition

## Local Setup

Install dependencies:

```bash
npm install
```

Create local environment variables:

```bash
cp .env.example .env.local
```

Add your Supabase project values to `.env.local` when you are ready to test live persistence code:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
DEV_PROVIDER_EMAIL=provider-demo@inklink.local
DEV_ADMIN_EMAIL=admin-demo@inklink.local
```

To test hosted Stripe Checkout locally after a provider is selected:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the printed signing secret into:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

Run the development server:

```bash
npm run dev
```

Open the app:

```text
http://localhost:3000
```

Run lint:

```bash
npm run lint
```

Run a production build:

```bash
npm run build
```

Note: the app currently uses `next/font/google` for Geist. A production build may need network access to fetch font assets if they are not already cached.

Apply the initial Supabase schema:

```bash
supabase db push
```

Or run the SQL in:

```text
supabase/migrations/20260408_0001_initial_schema.sql
```

The current pages still work without live Supabase data. The schema and helpers are in place so the app can migrate gradually instead of switching all screens at once.

Current live migration status:

- `/provider` can now save and load provider onboarding data from Supabase using a temporary development provider fallback.
- `/admin` can now load live provider applications from Supabase and save review decisions using a temporary development admin fallback.
- `/merchant` still uses mocked data.

## Deployment

The current mocked MVP is ready to deploy as a standard Next.js app on Vercel.

Recommended Vercel settings:

- Framework preset: Next.js
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: leave as the Next.js default
- Environment variables: optional for the current mocked demo, required once live Supabase-backed features are wired

Suggested demo routes:

- `/` for the product overview
- `/merchant` for the mocked order and recommendation flow
- `/provider` for the mocked provider profile
- `/admin` for the live provider review queue

Deployment note: this version is intentionally frontend-only and uses static mock data. Do not present it as a live fulfillment marketplace, live provider network, or production order system until Supabase, auth, persistence, and real integrations are added.

## Portfolio Case Study

### Why InkLink Exists

InkLink explores a gap between commodity print-on-demand tools and manually managed local print relationships. Small brands often want better quality, premium blanks, and local fulfillment options, but comparing providers is time-consuming and opaque.

The product concept is a local-first marketplace where routing decisions are visible and operationally grounded.

### What Makes It Different

Generic POD tools usually optimize for simple upload-to-ship workflows. InkLink is framed around local provider fit:

- Can this provider print the requested method and garment?
- Do they have compatible blanks available?
- Are they verified?
- What is their quality score?
- Do they have capacity?
- Are they close to the fulfillment ZIP?
- Do they support pickup?
- Does the recommendation match the merchant's fulfillment goal?

That makes the demo feel less like a generic storefront and more like a marketplace operations product.

### Strongest Technical Parts

- Isolated deterministic routing engine with editable scoring weights.
- Typed mock marketplace model that anticipates future Supabase tables without over-modeling the MVP.
- Recommendation output that includes both machine-readable factor scores and human-readable explanations.
- Clear separation between UI routes, mock data, routing logic, and shared presentation components.

### What Would Be Built Next

1. Add Supabase auth and role-aware profiles for merchants, providers, and admins.
2. Add a Postgres schema for profiles, provider capabilities, inventory, orders, and quality metrics.
3. Persist merchant order creation and provider recommendation snapshots.
4. Convert provider/admin demo screens into real server-validated forms and actions.
5. Replace mocked distance, shipping, inventory, and capacity estimates with real integrations incrementally.
6. Add Shopify import only after the core order and routing loop is stable.

## Roadmap

- Phase 1: Supabase auth and profile creation.
- Phase 2: Provider onboarding persistence and admin verification actions.
- Phase 3: Merchant order persistence and saved recommendation snapshots.
- Phase 4: Real inventory/blank supplier data model.
- Phase 5: Shipping, distance, and local courier integrations.
- Phase 6: Shopify import and multi-item/split routing workflows.
