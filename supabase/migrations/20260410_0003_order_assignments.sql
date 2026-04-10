-- Migration: order_assignments table
-- Tracks which providers have been matched to a merchant order and their response.

create type public.assignment_status as enum ('pending', 'accepted', 'declined');

create table public.order_assignments (
  id uuid primary key default gen_random_uuid(),
  merchant_order_id uuid not null references public.merchant_orders(id) on delete cascade,
  provider_profile_id uuid not null references public.provider_profiles(id) on delete cascade,
  status public.assignment_status not null default 'pending',
  assigned_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (merchant_order_id, provider_profile_id)
);

alter table public.order_assignments enable row level security;

-- Providers can read assignments that belong to them.
create policy "Providers read own assignments"
  on public.order_assignments for select
  using (
    exists (
      select 1 from public.provider_profiles pp
      where pp.id = order_assignments.provider_profile_id
        and pp.profile_id = auth.uid()
    )
  );
