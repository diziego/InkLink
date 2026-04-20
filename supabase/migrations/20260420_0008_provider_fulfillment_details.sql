alter table public.order_assignments
  add column if not exists provider_notes text,
  add column if not exists pickup_instructions text,
  add column if not exists ready_for_pickup_note text,
  add column if not exists carrier_name text,
  add column if not exists tracking_number text,
  add column if not exists estimated_ready_date date,
  add column if not exists shipping_note text,
  add column if not exists fulfillment_details_updated_at timestamptz;
