do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'payment_status'
  ) then
    create type public.payment_status as enum (
      'checkout_pending',
      'paid',
      'failed',
      'expired',
      'cancelled'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.order_status'::regtype
      and enumlabel = 'paid'
  ) then
    alter type public.order_status add value 'paid' after 'provider_selected';
  end if;
end
$$;

create table if not exists public.recommendation_snapshots (
  id uuid primary key default gen_random_uuid(),
  merchant_order_id uuid not null references public.merchant_orders(id) on delete cascade,
  provider_profile_id uuid not null references public.provider_profiles(id) on delete cascade,
  rank integer not null,
  score numeric(8,2) not null,
  factor_breakdown jsonb not null default '{}'::jsonb,
  explanation text not null default '',
  pricing_profile_id uuid references public.provider_pricing_profiles(id) on delete set null,
  pricing_mode public.pricing_mode,
  estimated_total_cents integer,
  base_price_cents integer,
  setup_fee_cents integer,
  quantity integer not null default 1,
  turnaround_days integer,
  supports_local_pickup boolean not null default false,
  supports_shipping boolean not null default true,
  estimated_shipping_cost_usd numeric(8,2),
  estimated_distance_miles numeric(8,2),
  available_capacity_units integer,
  requested_units integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (merchant_order_id, provider_profile_id),
  unique (merchant_order_id, rank)
);

create index if not exists idx_recommendation_snapshots_merchant_order_id
  on public.recommendation_snapshots(merchant_order_id);

create index if not exists idx_recommendation_snapshots_provider_profile_id
  on public.recommendation_snapshots(provider_profile_id);

drop trigger if exists set_recommendation_snapshots_updated_at on public.recommendation_snapshots;
create trigger set_recommendation_snapshots_updated_at
before update on public.recommendation_snapshots
for each row execute function public.set_updated_at();

alter table public.recommendation_snapshots enable row level security;

drop policy if exists "Merchants read own recommendation snapshots" on public.recommendation_snapshots;
create policy "Merchants read own recommendation snapshots"
  on public.recommendation_snapshots for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1
      from public.merchant_orders mo
      where mo.id = recommendation_snapshots.merchant_order_id
        and mo.profile_id = auth.uid()
    )
  );

alter table public.merchant_orders
  add column if not exists selected_recommendation_snapshot_id uuid
    references public.recommendation_snapshots(id) on delete set null;

create index if not exists idx_merchant_orders_selected_recommendation_snapshot_id
  on public.merchant_orders(selected_recommendation_snapshot_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  merchant_order_id uuid not null unique references public.merchant_orders(id) on delete cascade,
  recommendation_snapshot_id uuid not null references public.recommendation_snapshots(id) on delete restrict,
  selected_provider_profile_id uuid not null references public.provider_profiles(id) on delete restrict,
  status public.payment_status not null default 'checkout_pending',
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'usd',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  stripe_customer_email text,
  checkout_created_at timestamptz,
  paid_at timestamptz,
  failed_at timestamptz,
  expired_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_payments_selected_provider_profile_id
  on public.payments(selected_provider_profile_id);

create index if not exists idx_payments_status
  on public.payments(status);

drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

alter table public.payments enable row level security;

drop policy if exists "Merchants read own payments" on public.payments;
create policy "Merchants read own payments"
  on public.payments for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1
      from public.merchant_orders mo
      where mo.id = payments.merchant_order_id
        and mo.profile_id = auth.uid()
    )
  );

drop policy if exists "Providers read own payments" on public.payments;
create policy "Providers read own payments"
  on public.payments for select
  using (
    exists (
      select 1
      from public.provider_profiles pp
      where pp.id = payments.selected_provider_profile_id
        and pp.profile_id = auth.uid()
    )
  );
