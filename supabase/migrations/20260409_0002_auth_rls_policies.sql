-- Migration: Enable RLS and add policies for auth
-- Run this in Supabase SQL Editor after the auth code is deployed.

-- ============================================================
-- CRITICAL: profiles + user_roles (needed for auth flow)
-- ============================================================

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can read own role"
  on public.user_roles for select
  using (auth.uid() = profile_id);

-- ============================================================
-- PROVIDER TABLES (future-proofing — all current code uses
-- service-role which bypasses RLS, so these won't break anything)
-- ============================================================

alter table public.provider_profiles enable row level security;
alter table public.provider_capabilities enable row level security;
alter table public.provider_quality_metrics enable row level security;
alter table public.provider_inventory enable row level security;
alter table public.provider_wholesale_readiness enable row level security;
alter table public.admin_provider_reviews enable row level security;
alter table public.merchant_orders enable row level security;
alter table public.merchant_order_items enable row level security;

create policy "Providers can read own provider profile"
  on public.provider_profiles for select
  using (auth.uid() = profile_id);

create policy "Authenticated users can read verified providers"
  on public.provider_profiles for select
  using (
    verification_status = 'verified'
    and auth.role() = 'authenticated'
  );

create policy "Read verified provider capabilities"
  on public.provider_capabilities for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from public.provider_profiles pp
      where pp.id = provider_capabilities.provider_profile_id
        and pp.verification_status = 'verified'
    )
  );

create policy "Providers read own capabilities"
  on public.provider_capabilities for select
  using (
    exists (
      select 1 from public.provider_profiles pp
      where pp.id = provider_capabilities.provider_profile_id
        and pp.profile_id = auth.uid()
    )
  );

create policy "Read verified provider inventory"
  on public.provider_inventory for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from public.provider_profiles pp
      where pp.id = provider_inventory.provider_profile_id
        and pp.verification_status = 'verified'
    )
  );

create policy "Providers read own inventory"
  on public.provider_inventory for select
  using (
    exists (
      select 1 from public.provider_profiles pp
      where pp.id = provider_inventory.provider_profile_id
        and pp.profile_id = auth.uid()
    )
  );

create policy "Read verified provider quality metrics"
  on public.provider_quality_metrics for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from public.provider_profiles pp
      where pp.id = provider_quality_metrics.provider_profile_id
        and pp.verification_status = 'verified'
    )
  );

create policy "Providers read own wholesale readiness"
  on public.provider_wholesale_readiness for select
  using (
    exists (
      select 1 from public.provider_profiles pp
      where pp.id = provider_wholesale_readiness.provider_profile_id
        and pp.profile_id = auth.uid()
    )
  );

create policy "Merchants read own orders"
  on public.merchant_orders for select
  using (auth.uid() = merchant_id);

create policy "Merchants read own order items"
  on public.merchant_order_items for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from public.merchant_orders mo
      where mo.id = merchant_order_items.order_id
        and mo.merchant_id = auth.uid()
    )
  );
