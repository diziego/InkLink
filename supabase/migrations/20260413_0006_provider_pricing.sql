-- Migration: Provider pricing profiles + provider_selected order status
-- Adds structured per-print-method pricing for providers and
-- tracks when a merchant has selected a specific provider before payment.

-- ── New enum: pricing_mode ────────────────────────────────────────────────────

create type public.pricing_mode as enum ('instant', 'manual_quote', 'hybrid');

-- ── Extend order_status enum ──────────────────────────────────────────────────
-- provider_selected: merchant chose a provider; order is awaiting payment.
-- All pending assignments for the order are hidden from provider inboxes
-- until payment clears (future milestone).

alter type public.order_status add value 'provider_selected' after 'routed';

-- ── Provider pricing profiles ─────────────────────────────────────────────────

create table public.provider_pricing_profiles (
  id                    uuid        primary key default gen_random_uuid(),
  provider_profile_id   uuid        not null references public.provider_profiles(id) on delete cascade,
  print_method          public.print_method not null,
  pricing_mode          public.pricing_mode not null default 'instant',
  minimum_quantity      integer     not null default 1,
  base_price_cents      integer     not null default 0,   -- per-unit price in USD cents
  setup_fee_cents       integer     not null default 0,   -- one-time setup fee in USD cents
  turnaround_days       integer     not null default 5,
  supports_local_pickup boolean     not null default false,
  supports_shipping     boolean     not null default true,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (provider_profile_id, print_method)
);

alter table public.provider_pricing_profiles enable row level security;

-- Service-role (used by all server-side writes) bypasses RLS automatically.
-- These policies cover future direct-client reads.

create policy "Authenticated users can read pricing profiles of verified providers"
  on public.provider_pricing_profiles for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from public.provider_profiles pp
      where pp.id = provider_pricing_profiles.provider_profile_id
        and pp.verification_status = 'verified'
    )
  );

create policy "Providers can manage their own pricing profiles"
  on public.provider_pricing_profiles for all
  using (
    exists (
      select 1 from public.provider_profiles pp
      where pp.id = provider_pricing_profiles.provider_profile_id
        and pp.profile_id = auth.uid()
    )
  );

-- ── Extend merchant_orders ────────────────────────────────────────────────────

alter table public.merchant_orders
  add column selected_provider_profile_id uuid references public.provider_profiles(id),
  add column selected_estimated_price_cents integer;
