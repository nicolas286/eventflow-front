begin;

create table promo_codes (
  id uuid primary key default gen_random_uuid(),

  org_id uuid not null references organizations(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,

  code text not null,

  discount_percent integer,
  discount_cents integer,

  max_uses integer,
  used_count integer not null default 0,

  starts_at timestamptz,
  ends_at timestamptz,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint promo_codes_code_length_check
    check (char_length(trim(code)) between 1 and 20),

  constraint promo_codes_discount_check check (
    (
      discount_percent is not null
      and discount_percent between 1 and 100
      and discount_cents is null
    )
    or
    (
      discount_cents is not null
      and discount_cents between 1 and 100000
      and discount_percent is null
    )
  ),

  constraint promo_codes_max_uses_check
    check (max_uses is null or (max_uses > 0 and max_uses < 100000)),

  constraint promo_codes_used_count_check
    check (used_count >= 0 and used_count < 100000),

  constraint promo_codes_dates_check
    check (starts_at is null or ends_at is null or starts_at < ends_at)
);

create unique index promo_codes_event_code_unique
on promo_codes (event_id, lower(trim(code)));

create table promo_code_redemptions (
  id uuid primary key default gen_random_uuid(),

  promo_code_id uuid not null references promo_codes(id) on delete restrict,
  order_id uuid not null references orders(id) on delete cascade,

  discount_cents integer not null,

  created_at timestamptz not null default now(),

  constraint promo_code_redemptions_discount_check
    check (discount_cents between 1 and 100000),

  constraint promo_code_redemptions_order_unique
    unique (order_id)
);

create index promo_code_redemptions_promo_code_id_idx
on promo_code_redemptions (promo_code_id);

alter table public.promo_codes enable row level security;




alter table public.promo_code_redemptions enable row level security;

revoke all on table public.promo_codes from anon;
revoke all on table public.promo_codes from authenticated;

grant select, insert, update, delete
on table public.promo_codes
to authenticated;

drop policy if exists promo_codes_select_member on public.promo_codes;
drop policy if exists promo_codes_insert_member on public.promo_codes;
drop policy if exists promo_codes_update_member on public.promo_codes;
drop policy if exists promo_codes_delete_member on public.promo_codes;

create policy promo_codes_select_member
on public.promo_codes
for select
to authenticated
using (
  public.is_org_member(org_id)
);

create policy promo_codes_insert_member
on public.promo_codes
for insert
to authenticated
with check (
  public.is_org_member(org_id)
  and exists (
    select 1
    from public.events e
    where e.id = promo_codes.event_id
      and e.org_id = promo_codes.org_id
  )
);

create policy promo_codes_update_member
on public.promo_codes
for update
to authenticated
using (
  public.is_org_member(org_id)
)
with check (
  public.is_org_member(org_id)
  and exists (
    select 1
    from public.events e
    where e.id = promo_codes.event_id
      and e.org_id = promo_codes.org_id
  )
);

create policy promo_codes_delete_member
on public.promo_codes
for delete
to authenticated
using (
  public.is_org_member(org_id)
);

revoke all on table public.promo_code_redemptions from anon;
revoke all on table public.promo_code_redemptions from authenticated;

grant all on table public.promo_codes to service_role;
grant all on table public.promo_code_redemptions to service_role;

drop function if exists public.create_order_intent(
  uuid,
  jsonb,
  jsonb,
  jsonb,
  text
);

create or replace function public.create_order_intent(
  p_event_id uuid,
  p_items jsonb,
  p_attendees jsonb,
  p_buyer jsonb default '{}'::jsonb,
  p_rate_key text default null,
  p_promo_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
  v_rate_key text := nullif(trim(p_rate_key), '');

  v_order_id uuid;
  v_booking_token text;

  v_currency text;
  v_total_cents int := 0;
  v_requires_payment boolean := false;

  v_deposit_cents int;
  v_amount_due_now_cents int;

  v_item jsonb;
  v_att jsonb;
  v_ans jsonb;

  v_event_product_id uuid;
  v_qty int;

  v_price_cents int;
  v_stock_qty int;
  v_reserved_qty int;
  v_sold_qty int;
  v_attendees_per_unit int;
  v_creates_attendees boolean;

  v_expected_attendees_total int := 0;
  v_max_attendees int;
  v_current_attendees_total int := 0;

  v_order_item_id uuid;
  v_attendee_id uuid;

  v_item_currency text;
  v_product_name text;

  v_event record;
  v_attendee_index int := 0;

  /* ---------------- Promo code ---------------- */
  v_promo_code_input text;
  v_promo record;
  v_promo_code_id uuid;
  v_discount_cents int := 0;
  v_discounted_total_cents int := 0;

  /* ---------------- Gatekeepers ---------------- */
  v_event_has_gatekeeper boolean := false;
  v_order_has_gatekeeper boolean := false;
  v_close_event_gatekeeper_sold_out boolean := false;

  v_is_gatekeeper boolean;
  v_close_event_when_sold_out boolean;

  /* ---------------- answers mapping ---------------- */
  v_field_key text;
  v_field_id uuid;
  v_has_key boolean;
  v_eff record;

  /* ---------------- buyer (contact principal) ---------------- */
  v_buyer_email text;
  v_buyer_name text;
  v_buyer_phone text;
  v_buyer_is_attendee boolean := false;

begin
  /* ---------------- Guardrails (rate limit) ---------------- */
  if v_rate_key is null then
    -- contexte "admin" ou backend interne
    perform public.assert_rate_limit('svc:create_order_intent:event:' || p_event_id::text, 500, 60);
  else
    -- contexte "public"
    perform public.assert_rate_limit('pub:create_order_intent:' || v_rate_key, 30, 60);
  end if;

  /* ---------------- Event guardrails ---------------- */
  select *
  into v_event
  from public.events e
  where e.id = p_event_id
  limit 1;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if coalesce(v_event.is_published, false) is not true then
    raise exception 'EVENT_NOT_PUBLISHED';
  end if;

  if v_event.ends_at is not null and v_event.ends_at <= now() then
    raise exception 'EVENT_ENDED';
  end if;

  if public.is_event_registration_open(p_event_id) is not true then
    raise exception 'EVENT_REGISTRATION_CLOSED';
  end if;

  /* ---------------- Input ---------------- */
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'VALIDATION_ERROR: p_items must be a non-empty array';
  end if;

  if p_attendees is null or jsonb_typeof(p_attendees) <> 'array' then
    raise exception 'VALIDATION_ERROR: p_attendees must be an array';
  end if;

  if jsonb_array_length(p_items) > 50 then
    raise exception 'VALIDATION_ERROR: too many items';
  end if;

  if jsonb_array_length(p_attendees) > 500 then
    raise exception 'VALIDATION_ERROR: too many attendees';
  end if;

  v_booking_token := encode(extensions.gen_random_bytes(16), 'hex');

  create temporary table if not exists pg_temp._order_item_map (
    event_product_id uuid not null,
    order_item_id uuid not null,
    remaining_slots int not null
  ) on commit drop;

  truncate table pg_temp._order_item_map;

  /* ---------------- Gatekeeper pre-check ---------------- */
  select exists (
    select 1
    from public.event_products ep
    where ep.event_id = p_event_id
      and ep.is_active = true
      and ep.is_gatekeeper = true
  )
  into v_event_has_gatekeeper;

  /* -------------------------------------------------
   * 1) Lock products + compute total + stock check
   * ------------------------------------------------- */
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if (v_item ? 'event_product_id') is not true or (v_item ? 'quantity') is not true then
      raise exception 'VALIDATION_ERROR: invalid items';
    end if;

    begin
      v_event_product_id := (v_item->>'event_product_id')::uuid;
      v_qty := (v_item->>'quantity')::int;
    exception when others then
      raise exception 'VALIDATION_ERROR: invalid items';
    end;

    if v_qty is null or v_qty < 1 or v_qty > 100 then
      raise exception 'VALIDATION_ERROR: invalid quantity';
    end if;

    select
      ep.price_cents,
      ep.currency,
      ep.stock_qty,
      ep.reserved_qty,
      ep.sold_qty,
      ep.attendees_per_unit,
      ep.creates_attendees,
      ep.is_gatekeeper,
      ep.close_event_when_sold_out
    into
      v_price_cents,
      v_item_currency,
      v_stock_qty,
      v_reserved_qty,
      v_sold_qty,
      v_attendees_per_unit,
      v_creates_attendees,
      v_is_gatekeeper,
      v_close_event_when_sold_out
    from public.event_products ep
    where ep.id = v_event_product_id
      and ep.event_id = p_event_id
      and ep.is_active = true
    for update;

    if not found then
      raise exception 'NOT_FOUND';
    end if;

    if v_currency is null then
      v_currency := v_item_currency;
    elsif v_item_currency is distinct from v_currency then
      raise exception 'VALIDATION_ERROR: currency mismatch';
    end if;

    if v_stock_qty is not null then
      if (coalesce(v_reserved_qty, 0) + coalesce(v_sold_qty, 0) + v_qty) > v_stock_qty then
        raise exception 'INSUFFICIENT_STOCK';
      end if;
    end if;

    if coalesce(v_is_gatekeeper, false) then
      v_order_has_gatekeeper := true;
    end if;

    if coalesce(v_is_gatekeeper, false)
       and coalesce(v_close_event_when_sold_out, false)
       and v_stock_qty is not null
       and (coalesce(v_reserved_qty, 0) + coalesce(v_sold_qty, 0)) >= v_stock_qty then
      v_close_event_gatekeeper_sold_out := true;
    end if;

    v_total_cents := v_total_cents + (coalesce(v_price_cents, 0) * v_qty);

    if coalesce(v_creates_attendees, true) then
      v_expected_attendees_total :=
        v_expected_attendees_total + (v_qty * greatest(1, coalesce(v_attendees_per_unit, 1)));
    end if;
  end loop;

  if v_close_event_gatekeeper_sold_out then
    raise exception 'EVENT_SOLD_OUT';
  end if;

  if v_event_has_gatekeeper and not v_order_has_gatekeeper then
    raise exception 'MISSING_GATEKEEPER_PRODUCT';
  end if;

  if v_expected_attendees_total <> jsonb_array_length(p_attendees) then
    raise exception 'VALIDATION_ERROR: attendees count mismatch';
  end if;

  /* -------------------------------------------------
   * Plan limit: registrations per event (bulk)
   * + lock event row to reduce race conditions
   * ------------------------------------------------- */
  perform 1
  from public.events e
  where e.id = p_event_id
  for update;

  perform public.assert_event_registrations_limit_bulk(
    v_event.org_id,
    p_event_id,
    v_expected_attendees_total
  );

  /* -------------------------------------------------
   * Global attendees cap
   * ------------------------------------------------- */
  v_max_attendees := v_event.max_attendees;

  if v_max_attendees is not null then
    select coalesce(sum(
      (coalesce(ep.sold_qty, 0) + coalesce(ep.reserved_qty, 0))
      * greatest(1, coalesce(ep.attendees_per_unit, 1))
    ), 0)
    into v_current_attendees_total
    from public.event_products ep
    where ep.event_id = p_event_id
      and ep.is_active = true
      and coalesce(ep.creates_attendees, true) = true;

    if v_current_attendees_total + v_expected_attendees_total > v_max_attendees then
      raise exception 'MAX_ATTENDEES_REACHED';
    end if;
  end if;

  /* -------------------------------------------------
   * Promo code
   * ------------------------------------------------- */
  v_promo_code_input := nullif(trim(coalesce(p_promo_code, '')), '');

  if v_promo_code_input is not null then
    if char_length(v_promo_code_input) > 20 then
      raise exception 'PROMO_CODE_INVALID';
    end if;

    if v_total_cents <= 0 then
      raise exception 'PROMO_CODE_NOT_APPLICABLE';
    end if;

    select
      pc.*
    into v_promo
    from public.promo_codes pc
    where pc.event_id = p_event_id
      and lower(trim(pc.code)) = lower(v_promo_code_input)
    for update;

    if not found then
      raise exception 'PROMO_CODE_NOT_FOUND';
    end if;

    if coalesce(v_promo.is_active, false) is not true then
      raise exception 'PROMO_CODE_INACTIVE';
    end if;

    if v_promo.starts_at is not null and v_promo.starts_at > now() then
      raise exception 'PROMO_CODE_NOT_STARTED';
    end if;

    if v_promo.ends_at is not null and v_promo.ends_at <= now() then
      raise exception 'PROMO_CODE_EXPIRED';
    end if;

    if v_promo.max_uses is not null and coalesce(v_promo.used_count, 0) >= v_promo.max_uses then
      raise exception 'PROMO_CODE_USAGE_LIMIT_REACHED';
    end if;

    v_promo_code_id := v_promo.id;

    if v_promo.discount_percent is not null then
      v_discount_cents := floor(v_total_cents * v_promo.discount_percent / 100.0)::int;
    elsif v_promo.discount_cents is not null then
      v_discount_cents := v_promo.discount_cents;
    else
      raise exception 'PROMO_CODE_INVALID';
    end if;

    v_discount_cents := least(greatest(v_discount_cents, 0), v_total_cents);

    if v_discount_cents <= 0 then
      raise exception 'PROMO_CODE_NOT_APPLICABLE';
    end if;
  end if;

  v_discounted_total_cents := greatest(v_total_cents - v_discount_cents, 0);
  v_requires_payment := (v_discounted_total_cents > 0);

  /* ---------------- Deposit snapshot ---------------- */
  v_deposit_cents := v_event.deposit_cents;

  v_amount_due_now_cents :=
    case
      when not v_requires_payment then 0
      when v_deposit_cents is null or v_deposit_cents <= 0 then v_discounted_total_cents
      else least(v_discounted_total_cents, v_deposit_cents)
    end;

  /* ---------------- Buyer (contact principal) ---------------- */
  v_buyer_email := nullif(trim(coalesce(p_buyer->>'email', '')), '');
  v_buyer_name  := nullif(trim(coalesce(p_buyer->>'name', '')), '');
  v_buyer_phone := nullif(trim(coalesce(p_buyer->>'phone', '')), '');

  if (p_buyer ? 'is_attendee') then
    v_buyer_is_attendee := (p_buyer->>'is_attendee')::boolean;
  end if;

  if v_buyer_email is null then
    v_buyer_email := nullif(trim(coalesce(p_attendees->0->>'email', '')), '');
    v_buyer_is_attendee := true;
  end if;

  if v_buyer_phone is null then
    v_buyer_phone := nullif(trim(coalesce(p_attendees->0->>'phone', '')), '');
  end if;

  if v_buyer_name is null then
    v_buyer_name := trim(concat_ws(
      ' ',
      nullif(trim(coalesce(p_attendees->0->>'first_name', '')), ''),
      nullif(trim(coalesce(p_attendees->0->>'last_name', '')), '')
    ));
  end if;

  if v_buyer_name is null or v_buyer_name = '' then
    v_buyer_name := 'Participant';
  end if;

  /* ---------------- Create order ---------------- */
  insert into public.orders (
    org_id,
    event_id,
    buyer_name,
    buyer_email,
    buyer_phone,
    buyer_is_attendee,
    booking_token,
    currency,
    total_cents,
    paid_cents,
    status,
    expires_at,
    confirmed_at,
    deposit_due_cents_snapshot
  )
  values (
    v_event.org_id,
    p_event_id,
    v_buyer_name,
    v_buyer_email,
    v_buyer_phone,
    v_buyer_is_attendee,
    v_booking_token,
    v_currency,
    v_total_cents,
    case when v_requires_payment then 0 else v_discounted_total_cents end,
    case when v_requires_payment then 'awaiting_payment' else 'paid' end,
    case when v_requires_payment then now() + interval '20 minutes' else null end,
    case when v_requires_payment then null else now() end,
    v_amount_due_now_cents
  )
  returning id into v_order_id;

  /* ---------------- Promo redemption ---------------- */
  if v_promo_code_id is not null and v_discount_cents > 0 then
    insert into public.promo_code_redemptions (
      promo_code_id,
      order_id,
      discount_cents
    )
    values (
      v_promo_code_id,
      v_order_id,
      v_discount_cents
    );

    update public.promo_codes
    set
      used_count = coalesce(used_count, 0) + 1,
      updated_at = now()
    where id = v_promo_code_id;
  end if;

  /* -------------------------------------------------
   * Create order_items + reserve/sell stock
   * + build pg_temp._order_item_map for attendee allocation
   * ------------------------------------------------- */
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if (v_item ? 'event_product_id') is not true or (v_item ? 'quantity') is not true then
      raise exception 'VALIDATION_ERROR: invalid items';
    end if;

    begin
      v_event_product_id := (v_item->>'event_product_id')::uuid;
      v_qty := (v_item->>'quantity')::int;
    exception when others then
      raise exception 'VALIDATION_ERROR: invalid items';
    end;

    if v_qty is null or v_qty < 1 or v_qty > 100 then
      raise exception 'VALIDATION_ERROR: invalid quantity';
    end if;

    select
      ep.price_cents,
      ep.attendees_per_unit,
      ep.creates_attendees,
      ep.name
    into
      v_price_cents,
      v_attendees_per_unit,
      v_creates_attendees,
      v_product_name
    from public.event_products ep
    where ep.id = v_event_product_id
      and ep.event_id = p_event_id
      and ep.is_active = true
    for update;

    if not found then
      raise exception 'NOT_FOUND';
    end if;

    insert into public.order_items (
      id,
      order_id,
      product_id,
      product_name_snapshot,
      unit_price_cents_snapshot,
      quantity,
      created_at
    )
    values (
      gen_random_uuid(),
      v_order_id,
      v_event_product_id,
      v_product_name,
      v_price_cents,
      v_qty,
      now()
    )
    returning id into v_order_item_id;

    if v_requires_payment then
      update public.event_products
      set reserved_qty = coalesce(reserved_qty, 0) + v_qty
      where id = v_event_product_id;
    else
      update public.event_products
      set sold_qty = coalesce(sold_qty, 0) + v_qty
      where id = v_event_product_id;
    end if;

    if coalesce(v_creates_attendees, true) then
      insert into pg_temp._order_item_map(event_product_id, order_item_id, remaining_slots)
      values (
        v_event_product_id,
        v_order_item_id,
        v_qty * greatest(1, coalesce(v_attendees_per_unit, 1))
      );
    end if;
  end loop;

  /* -------------------------------------------------
   * Create attendees + answers
   * ------------------------------------------------- */
  v_attendee_index := 0;

  for v_att in select * from jsonb_array_elements(p_attendees)
  loop
    v_attendee_index := v_attendee_index + 1;

    if (v_att ? 'event_product_id') is not true then
      raise exception 'VALIDATION_ERROR: invalid attendees';
    end if;

    begin
      v_event_product_id := (v_att->>'event_product_id')::uuid;
    exception when others then
      raise exception 'VALIDATION_ERROR: invalid attendees';
    end;

    select m.order_item_id
    into v_order_item_id
    from pg_temp._order_item_map m
    where m.event_product_id = v_event_product_id
      and m.remaining_slots > 0
    order by m.order_item_id
    limit 1;

    if v_order_item_id is null then
      raise exception 'VALIDATION_ERROR: attendee allocation mismatch';
    end if;

    update pg_temp._order_item_map
    set remaining_slots = remaining_slots - 1
    where event_product_id = v_event_product_id
      and order_item_id = v_order_item_id;

    select ep.name
    into v_product_name
    from public.event_products ep
    where ep.id = v_event_product_id
    limit 1;

    insert into public.order_attendees (
      id,
      order_id,
      product_id,
      product_name_snapshot,
      attendee_index,
      status,
      details_completed_at,
      confirmed_at,
      canceled_at,
      created_at
    )
    values (
      gen_random_uuid(),
      v_order_id,
      v_event_product_id,
      v_product_name,
      v_attendee_index,
      case when v_requires_payment then 'reserved' else 'confirmed' end,
      null,
      case when v_requires_payment then null else now() end,
      null,
      now()
    )
    returning id into v_attendee_id;

    -- email
    if (v_att ? 'email') and nullif(trim(coalesce(v_att->>'email','')), '') is not null then
      select exists (
        select 1
        from public.event_form_fields eff
        where eff.event_id = p_event_id
          and eff.is_active = true
          and eff.field_key = 'email'
      ) into v_has_key;

      if v_has_key then
        insert into public.order_attendee_answers (
          id, attendee_id, field_key_snapshot, field_label_snapshot, field_type_snapshot, value, created_at, updated_at
        )
        select
          gen_random_uuid(),
          v_attendee_id,
          eff.field_key,
          eff.label,
          eff.field_type,
          jsonb_build_object('value_text', nullif(trim(v_att->>'email'), '')),
          now(),
          now()
        from public.event_form_fields eff
        where eff.event_id = p_event_id
          and eff.is_active = true
          and eff.field_key = 'email'
          and not exists (
            select 1
            from public.order_attendee_answers oa
            where oa.attendee_id = v_attendee_id
              and oa.field_key_snapshot = eff.field_key
          );
      end if;
    end if;

    -- phone
    if (v_att ? 'phone') and nullif(trim(coalesce(v_att->>'phone','')), '') is not null then
      select exists (
        select 1
        from public.event_form_fields eff
        where eff.event_id = p_event_id
          and eff.is_active = true
          and eff.field_key = 'phone'
      ) into v_has_key;

      if v_has_key then
        insert into public.order_attendee_answers (
          id, attendee_id, field_key_snapshot, field_label_snapshot, field_type_snapshot, value, created_at, updated_at
        )
        select
          gen_random_uuid(),
          v_attendee_id,
          eff.field_key,
          eff.label,
          eff.field_type,
          jsonb_build_object('value_text', nullif(trim(v_att->>'phone'), '')),
          now(),
          now()
        from public.event_form_fields eff
        where eff.event_id = p_event_id
          and eff.is_active = true
          and eff.field_key = 'phone'
          and not exists (
            select 1
            from public.order_attendee_answers oa
            where oa.attendee_id = v_attendee_id
              and oa.field_key_snapshot = eff.field_key
          );
      end if;
    end if;

    -- first_name
    if (v_att ? 'first_name') and nullif(trim(coalesce(v_att->>'first_name','')), '') is not null then
      select exists (
        select 1
        from public.event_form_fields eff
        where eff.event_id = p_event_id
          and eff.is_active = true
          and eff.field_key = 'first_name'
      ) into v_has_key;

      if v_has_key then
        insert into public.order_attendee_answers (
          id, attendee_id, field_key_snapshot, field_label_snapshot, field_type_snapshot, value, created_at, updated_at
        )
        select
          gen_random_uuid(),
          v_attendee_id,
          eff.field_key,
          eff.label,
          eff.field_type,
          jsonb_build_object('value_text', nullif(trim(v_att->>'first_name'), '')),
          now(),
          now()
        from public.event_form_fields eff
        where eff.event_id = p_event_id
          and eff.is_active = true
          and eff.field_key = 'first_name'
          and not exists (
            select 1
            from public.order_attendee_answers oa
            where oa.attendee_id = v_attendee_id
              and oa.field_key_snapshot = eff.field_key
          );
      end if;
    end if;

    -- last_name
    if (v_att ? 'last_name') and nullif(trim(coalesce(v_att->>'last_name','')), '') is not null then
      select exists (
        select 1
        from public.event_form_fields eff
        where eff.event_id = p_event_id
          and eff.is_active = true
          and eff.field_key = 'last_name'
      ) into v_has_key;

      if v_has_key then
        insert into public.order_attendee_answers (
          id, attendee_id, field_key_snapshot, field_label_snapshot, field_type_snapshot, value, created_at, updated_at
        )
        select
          gen_random_uuid(),
          v_attendee_id,
          eff.field_key,
          eff.label,
          eff.field_type,
          jsonb_build_object('value_text', nullif(trim(v_att->>'last_name'), '')),
          now(),
          now()
        from public.event_form_fields eff
        where eff.event_id = p_event_id
          and eff.is_active = true
          and eff.field_key = 'last_name'
          and not exists (
            select 1
            from public.order_attendee_answers oa
            where oa.attendee_id = v_attendee_id
              and oa.field_key_snapshot = eff.field_key
          );
      end if;
    end if;

    if (v_att ? 'answers') and jsonb_typeof(v_att->'answers') = 'array' then
      for v_ans in select * from jsonb_array_elements(v_att->'answers')
      loop
        v_field_key := null;
        v_field_id := null;

        v_field_key := nullif(
          trim(
            coalesce(
              v_ans->>'field_key',
              v_ans->>'fieldKey',
              ''
            )
          ),
          ''
        );

        if (v_ans ? 'event_form_field_id') or (v_ans ? 'eventFormFieldId') then
          begin
            v_field_id := nullif(
              trim(
                coalesce(
                  v_ans->>'event_form_field_id',
                  v_ans->>'eventFormFieldId',
                  ''
                )
              ),
              ''
            )::uuid;
          exception when others then
            raise exception 'VALIDATION_ERROR: invalid answers';
          end;
        end if;

        if v_field_key is null and v_field_id is null then
          raise exception 'VALIDATION_ERROR: invalid answers';
        end if;

        select eff.*
        into v_eff
        from public.event_form_fields eff
        where eff.event_id = p_event_id
          and eff.is_active = true
          and (
            (v_field_id is not null and eff.id = v_field_id)
            or
            (v_field_key is not null and eff.field_key = v_field_key)
          )
        limit 1;

        if not found then
          raise exception 'VALIDATION_ERROR: invalid answers';
        end if;

        insert into public.order_attendee_answers (
          id,
          attendee_id,
          field_key_snapshot,
          field_label_snapshot,
          field_type_snapshot,
          value,
          created_at,
          updated_at
        )
        values (
          gen_random_uuid(),
          v_attendee_id,
          v_eff.field_key,
          v_eff.label,
          v_eff.field_type,
          coalesce(
            v_ans->'value',
            jsonb_build_object(
              'value_text', nullif(trim(coalesce(v_ans->>'value_text','')), ''),
              'value_int',  case when (v_ans ? 'value_int') and nullif(trim(coalesce(v_ans->>'value_int','')), '') is not null
                                 then (v_ans->>'value_int')::int else null end,
              'value_bool', case when (v_ans ? 'value_bool') and nullif(trim(coalesce(v_ans->>'value_bool','')), '') is not null
                                 then (v_ans->>'value_bool')::boolean else null end,
              'value_date', nullif(trim(coalesce(v_ans->>'value_date','')), '')
            )
          ),
          now(),
          now()
        );
      end loop;
    end if;

  end loop;

  return jsonb_build_object(
    'order_id', v_order_id,
    'booking_token', v_booking_token,
    'payment_required', v_requires_payment,
    'total_cents', v_total_cents,
    'discount_cents', v_discount_cents,
    'promo_code_id', v_promo_code_id,
    'amount_due_now_cents', v_amount_due_now_cents,
    'deposit_due_cents_snapshot', v_amount_due_now_cents,
    'currency', v_currency,
    'status', case when v_requires_payment then 'awaiting_payment' else 'paid' end,
    'expires_at', (select o.expires_at from public.orders o where o.id = v_order_id)
  );
end;
$$;

revoke all on function public.create_order_intent(
  uuid,
  jsonb,
  jsonb,
  jsonb,
  text,
  text
) from public;

revoke all on function public.create_order_intent(
  uuid,
  jsonb,
  jsonb,
  jsonb,
  text,
  text
) from anon;

revoke all on function public.create_order_intent(
  uuid,
  jsonb,
  jsonb,
  jsonb,
  text,
  text
) from authenticated;

grant execute on function public.create_order_intent(
  uuid,
  jsonb,
  jsonb,
  jsonb,
  text,
  text
) to service_role;

commit;