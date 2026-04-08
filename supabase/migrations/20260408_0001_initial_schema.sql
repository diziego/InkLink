create extension if not exists pgcrypto;

create type public.user_role as enum ('merchant', 'provider', 'admin');
create type public.provider_tier as enum ('emerging', 'verified', 'preferred');
create type public.verification_status as enum (
  'not_submitted',
  'pending',
  'verified',
  'rejected'
);
create type public.print_method as enum (
  'dtg',
  'dtf',
  'screen_print',
  'embroidery',
  'heat_transfer'
);
create type public.garment_type as enum (
  't_shirt',
  'long_sleeve',
  'hoodie',
  'crewneck',
  'tank',
  'tote'
);
create type public.blank_stock_status as enum (
  'in_stock',
  'limited',
  'out_of_stock'
);
create type public.fulfillment_goal as enum (
  'local_first',
  'fastest_turnaround',
  'lowest_cost',
  'premium_blank'
);
create type public.order_status as enum (
  'draft',
  'ready_for_routing',
  'routed',
  'accepted',
  'in_production',
  'ready',
  'shipped',
  'completed',
  'cancelled'
);
create type public.review_decision as enum (
  'pending',
  'approved',
  'rejected',
  'needs_changes'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.user_role not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, role)
);

create table public.provider_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  business_name text not null,
  contact_name text not null,
  city text not null,
  state text not null default 'CA',
  zip text not null,
  service_radius_miles integer not null default 25,
  supports_local_pickup boolean not null default false,
  tier public.provider_tier not null default 'emerging',
  verification_status public.verification_status not null default 'not_submitted',
  turnaround_sla_days integer not null default 5,
  daily_capacity_units integer not null default 0,
  current_capacity_used integer not null default 0,
  specialties text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.provider_capabilities (
  id uuid primary key default gen_random_uuid(),
  provider_profile_id uuid not null unique references public.provider_profiles(id) on delete cascade,
  print_methods public.print_method[] not null default '{}',
  garment_types public.garment_type[] not null default '{}',
  max_order_quantity integer not null default 0,
  accepts_premium_blanks boolean not null default false,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.provider_quality_metrics (
  id uuid primary key default gen_random_uuid(),
  provider_profile_id uuid not null unique references public.provider_profiles(id) on delete cascade,
  quality_score numeric(5,2) not null default 0,
  reliability_score numeric(5,2) not null default 0,
  reprint_rate numeric(6,4) not null default 0,
  on_time_delivery_rate numeric(6,4) not null default 0,
  average_rating numeric(4,2) not null default 0,
  completed_orders integer not null default 0,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.provider_inventory (
  id uuid primary key default gen_random_uuid(),
  provider_profile_id uuid not null references public.provider_profiles(id) on delete cascade,
  blank_brand text not null,
  style_name text not null,
  garment_type public.garment_type not null,
  colors text[] not null default '{}',
  sizes text[] not null default '{}',
  stock_status public.blank_stock_status not null default 'in_stock',
  quantity_on_hand integer not null default 0,
  is_premium_blank boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.provider_wholesale_readiness (
  id uuid primary key default gen_random_uuid(),
  provider_profile_id uuid not null unique references public.provider_profiles(id) on delete cascade,
  legal_business_name text not null,
  dba_name text,
  business_email text not null,
  phone text not null,
  street_address text not null,
  sellers_permit_number text,
  ein_placeholder text,
  business_type text,
  years_in_operation integer,
  supplier_account_readiness text[] not null default '{}',
  preferred_blank_distributors text[] not null default '{}',
  fulfillment_cutoff_time text,
  reorder_lead_time_days integer,
  blank_sourcing_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.merchant_orders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status public.order_status not null default 'draft',
  fulfillment_zip text not null,
  fulfillment_goal public.fulfillment_goal not null,
  local_pickup_preferred boolean not null default false,
  needed_by_date date,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.merchant_order_items (
  id uuid primary key default gen_random_uuid(),
  merchant_order_id uuid not null references public.merchant_orders(id) on delete cascade,
  print_method public.print_method not null,
  garment_type public.garment_type not null,
  quantity integer not null default 1,
  preferred_blank_brand text,
  preferred_blank_style text,
  sizes jsonb not null default '{}'::jsonb,
  color text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.admin_provider_reviews (
  id uuid primary key default gen_random_uuid(),
  provider_profile_id uuid not null references public.provider_profiles(id) on delete cascade,
  reviewer_profile_id uuid references public.profiles(id) on delete set null,
  decision public.review_decision not null default 'pending',
  tier_after_review public.provider_tier,
  verification_status_after_review public.verification_status,
  review_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index idx_user_roles_profile_id on public.user_roles(profile_id);
create index idx_provider_inventory_provider_profile_id on public.provider_inventory(provider_profile_id);
create index idx_merchant_orders_profile_id on public.merchant_orders(profile_id);
create index idx_merchant_order_items_order_id on public.merchant_order_items(merchant_order_id);
create index idx_admin_provider_reviews_provider_profile_id on public.admin_provider_reviews(provider_profile_id);

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_provider_profiles_updated_at
before update on public.provider_profiles
for each row execute function public.set_updated_at();

create trigger set_provider_capabilities_updated_at
before update on public.provider_capabilities
for each row execute function public.set_updated_at();

create trigger set_provider_quality_metrics_updated_at
before update on public.provider_quality_metrics
for each row execute function public.set_updated_at();

create trigger set_provider_inventory_updated_at
before update on public.provider_inventory
for each row execute function public.set_updated_at();

create trigger set_provider_wholesale_readiness_updated_at
before update on public.provider_wholesale_readiness
for each row execute function public.set_updated_at();

create trigger set_merchant_orders_updated_at
before update on public.merchant_orders
for each row execute function public.set_updated_at();

create trigger set_merchant_order_items_updated_at
before update on public.merchant_order_items
for each row execute function public.set_updated_at();

create trigger set_admin_provider_reviews_updated_at
before update on public.admin_provider_reviews
for each row execute function public.set_updated_at();
