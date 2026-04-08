# InkLink AGENTS.md

## Project identity

InkLink is a local-first print fulfillment marketplace for small brands, creators, and vetted print providers.

Current MVP focus:
- DTG first
- architecture must support future expansion to DTF, screen print, embroidery, and heat transfer
- local-first routing
- premium blank friendly
- transparent provider scoring
- strong merchant, provider, and admin workflows

Treat "InkLink" as the current working brand name, but keep branding centralized so it can be renamed later from a single config/constants location.

## Product priorities

When making tradeoffs, prioritize in this order:
1. Runnable MVP
2. Clean user flows
3. Clear data model for future expansion
4. Maintainable code for a solo founder
5. UI polish
6. Advanced integrations later

Do not overengineer.
Prefer simple, believable marketplace behavior over speculative complexity.

## Tech stack expectations

Use:
- Next.js App Router
- TypeScript
- Tailwind
- shadcn/ui
- Supabase for auth and storage
- PostgreSQL
- Zod for validation

Keep external dependencies minimal.
Do not add new production dependencies unless they clearly reduce complexity.

## Code style

- Prefer clear, boring, maintainable code
- Keep components small and reusable
- Favor server actions or server-side handlers where appropriate
- Validate all form inputs on the server
- Strong typing throughout
- Avoid unnecessary abstraction early
- Use descriptive names
- Keep comments minimal and useful
- Do not leave dead code behind
- Do not create duplicate utility functions

## Architecture rules

Design for three user roles:
- merchant
- provider
- admin

Keep domain boundaries clear:
- branding/config
- auth
- profiles
- provider capabilities
- inventory / blank availability
- orders
- routing
- reviews / quality metrics
- admin review tools

Keep routing logic in its own isolated module so it can evolve independently.

Centralize brand constants in one place, such as:
- app name
- tagline
- metadata title
- metadata description
- footer copy
- placeholder logo text

## UX rules

The UI should feel:
- modern
- minimal
- credible
- slightly premium
- local/community oriented

Avoid cheesy POD design language.
Avoid clutter.
Default to neutral colors and clean spacing.

## Marketplace rules

For the MVP, prioritize:
- merchant onboarding
- provider onboarding
- admin verification
- order creation
- provider recommendation/routing
- order status tracking

Use mocked calculations where needed for:
- shipping estimates
- blank sourcing
- distance scoring
- payouts
- Shopify integration

Mocked logic must be clearly labeled in code and README.

## Routing engine rules

The routing engine should be transparent and deterministic, not machine learning.

Rank providers using weighted scoring based on:
- print method compatibility
- garment compatibility
- blank availability
- provider tier / verification
- provider quality score
- provider turnaround SLA
- provider capacity
- proximity to fulfillment ZIP
- estimated shipping cost
- local pickup preference
- merchant fulfillment goal

Every recommendation response must include:
- total score
- factor breakdown
- human-readable explanation

Keep scoring weights easy to edit from one file.

## Data and schema rules

Schema should support future expansion for:
- multiple print methods
- multi-item orders
- Shopify import
- blank supplier integrations
- local courier delivery
- split routing

Prefer normalized data where it improves clarity, but do not over-model the MVP.

## File and folder guidance

Prefer this general structure:

- src/app
- src/components
- src/config
- src/lib
- src/actions
- src/types
- docs

Put business logic in lib or server-side modules, not inside UI components.

## Quality bar before marking work complete

Before declaring a task done:
- app builds successfully if the task affects build behavior
- lint passes if lint is configured
- changed flows are manually sanity-checked
- types are clean
- new env vars are added to `.env.example`
- README is updated when setup changes
- mocked vs real behavior is clearly noted

## How to work in this repo

For non-trivial tasks:
1. Inspect the current codebase
2. Create a short plan
3. Make the smallest viable set of changes
4. Run relevant checks
5. Summarize what changed, what is mocked, and next steps

For large tasks, prefer phased implementation over one giant rewrite.

## Constraints

Do not:
- rewrite the whole repo unless explicitly asked
- silently rename core concepts
- add payment logic before the surrounding flow exists
- add fake complexity to look impressive
- hide TODOs for mocked integrations

Do:
- keep the MVP believable
- optimize for founder usability
- leave the repo in a clean, understandable state
