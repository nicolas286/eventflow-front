-- 1. colonne
alter table public.events
add column registration_deadline timestamptz;

-- 2. contrainte logique
alter table public.events
add constraint events_registration_deadline_before_start
check (
  registration_deadline is null
  or registration_deadline <= starts_at
);

-- 3. fonction métier
create or replace function public.is_event_registration_open(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.events e
      where e.id = p_event_id
        and e.is_published = true
        and e.starts_at > now()
        and (
          e.registration_deadline is null
          or e.registration_deadline > now()
        )
    )
    and not public.is_event_sold_out(p_event_id);
$$;

-- 4. sécurité
revoke all on function public.is_event_registration_open(uuid) from public;
revoke all on function public.is_event_registration_open(uuid) from anon;
revoke all on function public.is_event_registration_open(uuid) from authenticated;

grant execute on function public.is_event_registration_open(uuid) to anon;
grant execute on function public.is_event_registration_open(uuid) to authenticated;

-- 5. adaptation get_public_org_events_overview

create or replace function public.get_public_org_events_overview(p_org_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slug text := nullif(trim(p_org_slug), '');
  v_org_id uuid;
  v_result jsonb;

  -- defaults globaux (storage public)
  v_default_banner_url text := 'https://dixirvllhfkvqoahhfqh.supabase.co/storage/v1/object/public/public-assets/defaults/default_banner.webp';

  -- org branding
  v_org_default_banner_url text;
begin
  if v_slug is null then
    raise exception 'VALIDATION_ERROR: org_slug is required';
  end if;

  perform public.assert_rate_limit('anon:org_events:' || v_slug, 120, 60);

  -- org id + default banner
  select
    op.org_id,
    nullif(trim(op.default_event_banner_url), '')
  into
    v_org_id,
    v_org_default_banner_url
  from public.organization_profile op
  join public.organizations o on o.id = op.org_id
  where op.slug = v_slug
    and o.status = 'active';

  if v_org_id is null then
    raise exception 'NOT_FOUND';
  end if;

  select jsonb_build_object(
    'orgSlug', v_slug,
    'events', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'slug', e.slug,
          'title', e.title,
          'location', e.location,
          'description', e.description,

          -- banner résolue (event -> org default -> global default)
          'bannerUrl', coalesce(
            nullif(trim(e.banner_url), ''),
            v_org_default_banner_url,
            v_default_banner_url
          ),

          'startsAt', e.starts_at,
          'endsAt', e.ends_at,
          'registrationDeadline', e.registration_deadline,

          'isSoldOut', public.is_event_sold_out(e.id),
          'isRegistrationOpen', public.is_event_registration_open(e.id)
        )
        order by e.starts_at asc nulls last, e.created_at desc
      ),
      '[]'::jsonb
    )
  )
  into v_result
  from public.events e
  where e.org_id = v_org_id
    and e.is_published = true;

  return v_result;
end;
$$;

-- sécurité
revoke all on function public.get_public_org_events_overview(text) from public;
revoke all on function public.get_public_org_events_overview(text) from anon;
revoke all on function public.get_public_org_events_overview(text) from authenticated;

grant execute on function public.get_public_org_events_overview(text) to anon;
grant execute on function public.get_public_org_events_overview(text) to authenticated;

-- 6. Adaptation get_public_event_detail

create or replace function public.get_public_event_detail(
  p_org_slug text,
  p_event_slug text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_slug text := nullif(trim(p_org_slug), '');
  v_event_slug text := nullif(trim(p_event_slug), '');
  v_org_id uuid;
  v_event_id uuid;

  v_org_profile jsonb;
  v_event jsonb;
  v_products jsonb;
  v_fields jsonb;
  v_field_groups jsonb;

  v_org_display_name text;
  v_org_primary_color text;
  v_default_primary_color text := '#e49d21';

  -- defaults globaux (storage public)
  v_default_logo_url text := 'https://dixirvllhfkvqoahhfqh.supabase.co/storage/v1/object/public/public-assets/defaults/default_logo.webp';
  v_default_banner_url text := 'https://dixirvllhfkvqoahhfqh.supabase.co/storage/v1/object/public/public-assets/defaults/default_banner.webp';

  v_org_logo_url text;
  v_org_default_banner_url text;
begin
  if v_org_slug is null or v_event_slug is null then
    raise exception 'VALIDATION_ERROR: org_slug and event_slug are required';
  end if;

  perform public.assert_rate_limit(
    'anon:event_detail:' || v_org_slug || ':' || v_event_slug,
    240,
    60
  );

  -- org id + branding (logo + default banner)
  select
    op.org_id,
    nullif(trim(op.logo_url), ''),
    nullif(trim(op.default_event_banner_url), ''),
    nullif(trim(op.display_name), ''),
    nullif(trim(op.primary_color), '')
  into
    v_org_id,
    v_org_logo_url,
    v_org_default_banner_url,
    v_org_display_name,
    v_org_primary_color
  from public.organization_profile op
  where op.slug = v_org_slug
  limit 1;

  if v_org_id is null then
    raise exception 'NOT_FOUND';
  end if;

  -- event id (published only)
  select e.id
  into v_event_id
  from public.events e
  where e.org_id = v_org_id
    and e.slug = v_event_slug
    and e.is_published = true
  limit 1;

  if v_event_id is null then
    raise exception 'NOT_FOUND';
  end if;

  -- org profile returned (public-safe)
  select jsonb_build_object(
    'slug', v_org_slug,
    'display_name', v_org_display_name,
    'primary_color', coalesce(v_org_primary_color, v_default_primary_color),
    'logo_url', coalesce(v_org_logo_url, v_default_logo_url),
    'default_event_banner_url', coalesce(v_org_default_banner_url, v_default_banner_url)
  )
  into v_org_profile;

  -- event (banner resolved with fallback)
  select jsonb_build_object(
    'id', e.id,
    'slug', e.slug,
    'title', e.title,
    'description', e.description,
    'location', e.location,
    'banner_url', coalesce(
      nullif(trim(e.banner_url), ''),
      v_org_default_banner_url,
      v_default_banner_url
    ),
    'starts_at', e.starts_at,
    'ends_at', e.ends_at,
    'deposit_cents', e.deposit_cents,
    'max_attendees', e.max_attendees,
    'registration_deadline', e.registration_deadline,
    'is_sold_out', public.is_event_sold_out(e.id),
    'is_registration_open', public.is_event_registration_open(e.id)
  )
  into v_event
  from public.events e
  where e.id = v_event_id;

  -- products
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ep.id,
        'name', ep.name,
        'description', ep.description,
        'price_cents', ep.price_cents,
        'currency', ep.currency,
        'stock_qty', ep.stock_qty,
        'sold_qty', ep.sold_qty,
        'reserved_qty', ep.reserved_qty,
        'creates_attendees', ep.creates_attendees,
        'attendees_per_unit', ep.attendees_per_unit,
        'sort_order', ep.sort_order
      )
      order by ep.sort_order asc, ep.created_at asc
    ),
    '[]'::jsonb
  )
  into v_products
  from public.event_products ep
  where ep.event_id = v_event_id
    and ep.is_active = true;

  -- field groups
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ffg.id,
        'label', ffg.label,
        'sort_order', ffg.sort_order
      )
      order by ffg.sort_order asc, ffg.created_at asc
    ),
    '[]'::jsonb
  )
  into v_field_groups
  from public.event_form_field_groups ffg
  where ffg.event_id = v_event_id
    and ffg.is_active = true;

  -- fields
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ff.id,
        'label', ff.label,
        'field_key', ff.field_key,
        'field_type', ff.field_type,
        'is_required', ff.is_required,
        'options', ff.options,
        'sort_order', ff.sort_order,
        'group_id', ff.group_id
      )
      order by ff.sort_order asc, ff.created_at asc
    ),
    '[]'::jsonb
  )
  into v_fields
  from public.event_form_fields ff
  where ff.event_id = v_event_id
    and ff.is_active = true;

  return jsonb_build_object(
    'org', v_org_profile,
    'event', v_event,
    'products', v_products,
    'form_fields', v_fields,
    'form_fields_groups', v_field_groups
  );
end;
$$;

revoke all on function public.get_public_event_detail(text, text) from public;
revoke all on function public.get_public_event_detail(text, text) from anon;
revoke all on function public.get_public_event_detail(text, text) from authenticated;

grant execute on function public.get_public_event_detail(text, text) to anon;
grant execute on function public.get_public_event_detail(text, text) to authenticated;

-- 7. create_order_intent

create or replace function public.create_order_intent(
  p_event_id uuid,
  p_items jsonb,
  p_attendees jsonb,
  p_buyer jsonb,
  p_rate_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
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
    -- contexte "admin" (ou backend interne)
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

  -- secure gen_random_bytes via extensions schema
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

  v_requires_payment := (v_total_cents > 0);

  /* ---------------- Deposit snapshot ---------------- */
  v_deposit_cents := v_event.deposit_cents;

  v_amount_due_now_cents :=
    case
      when not v_requires_payment then 0
      when v_deposit_cents is null or v_deposit_cents <= 0 then v_total_cents
      else least(v_total_cents, v_deposit_cents)
    end;

  /* ---------------- Buyer (contact principal) ---------------- */
  -- p_buyer = { email?, name?, phone?, is_attendee? }
  v_buyer_email := nullif(trim(coalesce(p_buyer->>'email', '')), '');
  v_buyer_name  := nullif(trim(coalesce(p_buyer->>'name', '')), '');
  v_buyer_phone := nullif(trim(coalesce(p_buyer->>'phone', '')), '');

  if (p_buyer ? 'is_attendee') then
    v_buyer_is_attendee := (p_buyer->>'is_attendee')::boolean;
  end if;

  -- fallback si pas fourni
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
    case when v_requires_payment then 0 else v_total_cents end,
    case when v_requires_payment then 'awaiting_payment' else 'paid' end,
    case when v_requires_payment then now() + interval '20 minutes' else null end,
    case when v_requires_payment then null else now() end,
    v_amount_due_now_cents
  )
  returning id into v_order_id;

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

    /* -------------------------------------------------
     * Helper: insert answer by field_key (no duplicates)
     * ------------------------------------------------- */

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

    /* -------------------------------------------------
     * answers array: supports:
     * - { field_key: "x", value_text/... }
     * - { event_form_field_id: "uuid", value_text/... }
     * - { value: <jsonb> } (direct)
     * ------------------------------------------------- */
    if (v_att ? 'answers') and jsonb_typeof(v_att->'answers') = 'array' then
      for v_ans in select * from jsonb_array_elements(v_att->'answers')
      loop
        -- reset à CHAQUE answer
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
    'amount_due_now_cents', v_amount_due_now_cents,
    'deposit_due_cents_snapshot', v_amount_due_now_cents,
    'currency', v_currency,
    'status', case when v_requires_payment then 'awaiting_payment' else 'paid' end,
    'expires_at', (select o.expires_at from public.orders o where o.id = v_order_id)
  );
end;
$$;

revoke all on function public.create_order_intent(uuid, jsonb, jsonb, jsonb, text) from public;
revoke all on function public.create_order_intent(uuid, jsonb, jsonb, jsonb, text) from anon;
revoke all on function public.create_order_intent(uuid, jsonb, jsonb, jsonb, text) from authenticated;

grant execute on function public.create_order_intent(uuid, jsonb, jsonb, jsonb, text) to anon;
grant execute on function public.create_order_intent(uuid, jsonb, jsonb, jsonb, text) to authenticated;

-- 8. create_event

create or replace function public.create_event(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_event_id uuid;

  v_org_id uuid;
  v_title text;
  v_description text;
  v_location text;
  v_banner_url text;
  v_deposit_cents int4;
  v_max_attendees int4;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_registration_deadline timestamptz;

  v_slug text;

  v_now timestamptz := now();
begin
  -- 1) Auth
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- 2) Parse input (AVANT rights)
  v_org_id := nullif(trim(p_input->>'org_id'), '')::uuid;
  v_title := nullif(trim(p_input->>'title'), '');
  v_description := nullif(trim(p_input->>'description'), '');
  v_location := nullif(trim(p_input->>'location'), '');
  v_banner_url := nullif(trim(p_input->>'banner_url'), '');
  v_deposit_cents := nullif(trim(p_input->>'deposit_cents'), '')::int4;
  v_max_attendees := nullif(trim(p_input->>'max_attendees'), '')::int4;
  v_starts_at := nullif(trim(p_input->>'starts_at'), '')::timestamptz;
  v_ends_at := nullif(trim(p_input->>'ends_at'), '')::timestamptz;
  v_registration_deadline := nullif(trim(p_input->>'registration_deadline'), '')::timestamptz;

  if v_org_id is null then
    raise exception 'VALIDATION_ERROR: org_id is required';
  end if;

  -- 3) Rights (idéalement admin/owner)
  if not exists (
    select 1
    from public.organization_members om
    where om.org_id = v_org_id
      and om.user_id = v_user_id
      and om.role in ('owner', 'admin')
  ) then
    raise exception 'FORBIDDEN';
  end if;

  -- 4) Validations
  if v_title is null then
    raise exception 'VALIDATION_ERROR: title is required';
  end if;

  if length(v_title) > 120 then
    raise exception 'VALIDATION_ERROR: title too long';
  end if;

  if v_location is not null and length(v_location) > 180 then
    raise exception 'VALIDATION_ERROR: location too long';
  end if;

  if v_description is not null and length(v_description) > 5000 then
    raise exception 'VALIDATION_ERROR: description too long';
  end if;

  if v_banner_url is not null and length(v_banner_url) > 500 then
    raise exception 'VALIDATION_ERROR: banner_url too long';
  end if;

  if v_deposit_cents is not null and v_deposit_cents < 0 then
    raise exception 'VALIDATION_ERROR: deposit_cents must be >= 0';
  end if;

  if v_max_attendees is not null and v_max_attendees < 0 then
    raise exception 'VALIDATION_ERROR: max_attendees must be >= 0';
  end if;

  if v_starts_at is not null and v_ends_at is not null and v_ends_at < v_starts_at then
    raise exception 'VALIDATION_ERROR: ends_at must be after starts_at';
  end if;

  if v_registration_deadline is not null
     and v_starts_at is not null
     and v_registration_deadline > v_starts_at then
    raise exception 'VALIDATION_ERROR: registration_deadline must be before or equal to starts_at';
  end if;

  -- 5) Rate limit
  perform public.assert_rate_limit('create_event:org:' || v_org_id::text, 20, 3600);

  -- 6) Plan limits
  v_slug := private.generate_unique_event_slug(v_org_id, v_title);

  insert into public.events (
    id,
    org_id,
    slug,
    title,
    description,
    location,
    banner_url,
    deposit_cents,
    max_attendees,
    starts_at,
    ends_at,
    registration_deadline,
    is_published,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    v_org_id,
    v_slug,
    v_title,
    v_description,
    v_location,
    v_banner_url,
    v_deposit_cents,
    v_max_attendees,
    v_starts_at,
    v_ends_at,
    v_registration_deadline,
    false,
    v_now,
    v_now
  )
  returning id into v_event_id;

  -- ✅ Plan limit: acompte => event payant
  if coalesce(v_deposit_cents, 0) > 0 then
    perform public.assert_can_create_paid_product(v_org_id, v_event_id);
  end if;

  perform public.assert_can_add_product(v_org_id, v_event_id);

  for i in 1..10 loop
    perform public.assert_can_add_form_field(v_org_id, v_event_id);
  end loop;

  insert into public.event_form_fields (
    event_id,
    label,
    field_key,
    field_type,
    is_required,
    sort_order,
    is_active,
    created_at,
    updated_at
  ) values
    (v_event_id, 'Nom', 'last_name', 'text', true, 1, true, v_now, v_now),
    (v_event_id, 'Prénom', 'first_name', 'text', true, 2, true, v_now, v_now),
    (v_event_id, 'Date de naissance', 'birth_date', 'date', false, 3, true, v_now, v_now),
    (v_event_id, 'Adresse', 'address_line1', 'text', false, 4, true, v_now, v_now),
    (v_event_id, 'Complément d’adresse', 'address_line2', 'text', false, 5, true, v_now, v_now),
    (v_event_id, 'Code postal', 'postal_code', 'text', false, 6, true, v_now, v_now),
    (v_event_id, 'Ville', 'city', 'text', false, 7, true, v_now, v_now),
    (v_event_id, 'Pays', 'country_code', 'country', false, 8, true, v_now, v_now),
    (v_event_id, 'Téléphone', 'phone', 'phone', false, 9, true, v_now, v_now),
    (v_event_id, 'Email', 'email', 'email', true, 10, true, v_now, v_now);

  insert into public.event_products (
    id,
    event_id,
    name,
    description,
    price_cents,
    currency,
    stock_qty,
    creates_attendees,
    attendees_per_unit,
    is_active,
    sort_order,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    v_event_id,
    'Ticket gratuit',
    'Accès à l’événement',
    0,
    'EUR',
    null,
    true,
    1,
    true,
    1,
    v_now,
    v_now
  );

  return jsonb_build_object(
    'id', v_event_id,
    'orgId', v_org_id,
    'slug', v_slug,
    'title', v_title,
    'description', v_description,
    'location', v_location,
    'bannerUrl', v_banner_url,
    'depositCents', v_deposit_cents,
    'maxAttendees', v_max_attendees,
    'startsAt', v_starts_at,
    'endsAt', v_ends_at,
    'registrationDeadline', v_registration_deadline,
    'isPublished', false,
    'createdAt', v_now,
    'updatedAt', v_now
  );
exception
  when unique_violation then
    raise exception 'CONFLICT';
end;
$$;

revoke all on function public.create_event(jsonb) from public;
revoke all on function public.create_event(jsonb) from anon;
revoke all on function public.create_event(jsonb) from authenticated;

grant execute on function public.create_event(jsonb) to authenticated;

-- 9. update_event

create or replace function public.update_event(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_event_id uuid;
  v_org_id uuid;

  -- valeurs actuelles
  v_cur_title text;
  v_cur_location text;
  v_cur_description text;
  v_cur_banner_url text;
  v_cur_starts_at timestamptz;
  v_cur_ends_at timestamptz;
  v_cur_registration_deadline timestamptz;
  v_cur_is_published boolean;
  v_cur_deposit_cents int;
  v_cur_max_attendees int;

  -- patch
  v_title text;
  v_location text;
  v_description text;
  v_banner_url text;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_registration_deadline timestamptz;
  v_is_published boolean;
  v_deposit_cents int;
  v_max_attendees int;

  v_has_title boolean := false;
  v_has_location boolean := false;
  v_has_description boolean := false;
  v_has_banner boolean := false;
  v_has_starts boolean := false;
  v_has_ends boolean := false;
  v_has_registration_deadline boolean := false;
  v_has_published boolean := false;
  v_has_deposit boolean := false;
  v_has_max_attendees boolean := false;

  v_now timestamptz := now();
  v_row public.events%rowtype;

  v_cur_slug text;
  v_new_slug text;

  v_event_paid_before boolean;
  v_event_paid_after boolean;
  v_new_deposit int;
begin
  -- Auth
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- event_id (snake_case, car repo camelToSnake)
  v_event_id := (p_input->>'event_id')::uuid;
  if v_event_id is null then
    raise exception 'VALIDATION_ERROR: event_id is required';
  end if;

  -- Load event
  select
    e.org_id,
    e.slug,
    e.title,
    e.location,
    e.description,
    e.banner_url,
    e.starts_at,
    e.ends_at,
    e.registration_deadline,
    e.is_published,
    e.deposit_cents,
    e.max_attendees
  into
    v_org_id,
    v_cur_slug,
    v_cur_title,
    v_cur_location,
    v_cur_description,
    v_cur_banner_url,
    v_cur_starts_at,
    v_cur_ends_at,
    v_cur_registration_deadline,
    v_cur_is_published,
    v_cur_deposit_cents,
    v_cur_max_attendees
  from public.events e
  where e.id = v_event_id;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  -- Membership
  perform 1
  from public.organization_members om
  where om.org_id = v_org_id
    and om.user_id = v_user_id
    and om.role in ('owner','admin');

  if not found then
    raise exception 'FORBIDDEN';
  end if;

  -- Rate limit
  perform public.assert_rate_limit(
    'update_event:' || v_event_id::text,
    120,
    3600
  );

  -- Parse patch (snake_case, car repo camelToSnake)
  if p_input ? 'title' then
    v_has_title := true;
    v_title := nullif(trim(p_input->>'title'), '');
    if v_title is null then
      raise exception 'VALIDATION_ERROR: title is required';
    end if;
    if length(v_title) > 120 then
      raise exception 'VALIDATION_ERROR: title too long';
    end if;
  end if;

  if v_has_title and v_title is distinct from v_cur_title then
    v_new_slug := private.generate_unique_event_slug(v_org_id, v_title);
  end if;

  if p_input ? 'location' then
    v_has_location := true;
    v_location := nullif(trim(p_input->>'location'), '');
    if v_location is not null and length(v_location) > 180 then
      raise exception 'VALIDATION_ERROR: location too long';
    end if;
  end if;

  if p_input ? 'description' then
    v_has_description := true;
    v_description := nullif(trim(p_input->>'description'), '');
    if v_description is not null and length(v_description) > 5000 then
      raise exception 'VALIDATION_ERROR: description too long';
    end if;
  end if;

  if p_input ? 'banner_url' then
    v_has_banner := true;
    v_banner_url := nullif(trim(p_input->>'banner_url'), '');
    if v_banner_url is not null and length(v_banner_url) > 500 then
      raise exception 'VALIDATION_ERROR: banner_url too long';
    end if;
  end if;

  if p_input ? 'starts_at' then
    v_has_starts := true;
    v_starts_at := nullif(trim(p_input->>'starts_at'), '')::timestamptz;
  end if;

  if p_input ? 'ends_at' then
    v_has_ends := true;
    v_ends_at := nullif(trim(p_input->>'ends_at'), '')::timestamptz;
  end if;

  if p_input ? 'registration_deadline' then
    v_has_registration_deadline := true;
    v_registration_deadline := nullif(trim(p_input->>'registration_deadline'), '')::timestamptz;
  end if;

  if p_input ? 'is_published' then
    v_has_published := true;
    v_is_published := (p_input->>'is_published')::boolean;
  end if;

  if p_input ? 'deposit_cents' then
    v_has_deposit := true;
    v_deposit_cents := greatest(0, (p_input->>'deposit_cents')::int);
  end if;

  if p_input ? 'max_attendees' then
    v_has_max_attendees := true;
    v_max_attendees := nullif(trim(p_input->>'max_attendees'), '')::int;
    if v_max_attendees is not null and v_max_attendees < 0 then
      raise exception 'VALIDATION_ERROR: max_attendees must be >= 0';
    end if;
  end if;

  -- Validation dates sur état final
  if
    coalesce(case when v_has_ends then v_ends_at else v_cur_ends_at end, null) is not null
    and coalesce(case when v_has_starts then v_starts_at else v_cur_starts_at end, null) is not null
    and (case when v_has_ends then v_ends_at else v_cur_ends_at end)
        < (case when v_has_starts then v_starts_at else v_cur_starts_at end)
  then
    raise exception 'VALIDATION_ERROR: ends_at must be after starts_at';
  end if;

  if
    (case when v_has_registration_deadline then v_registration_deadline else v_cur_registration_deadline end) is not null
    and (case when v_has_starts then v_starts_at else v_cur_starts_at end) is not null
    and (case when v_has_registration_deadline then v_registration_deadline else v_cur_registration_deadline end)
        > (case when v_has_starts then v_starts_at else v_cur_starts_at end)
  then
    raise exception 'VALIDATION_ERROR: registration_deadline must be before or equal to starts_at';
  end if;

  /* ------------------------------
   * Plan limits (acompte)
   * ------------------------------ */

  -- lock event pour éviter courses
  perform 1
  from public.events e
  where e.id = v_event_id
  for update;

  v_event_paid_before := public.is_event_paid(v_event_id);

  v_new_deposit := case
    when v_has_deposit then coalesce(v_deposit_cents, 0)
    else coalesce(v_cur_deposit_cents, 0)
  end;

  v_event_paid_after :=
    (v_new_deposit > 0)
    or exists (
      select 1
      from public.event_products ep
      where ep.event_id = v_event_id
        and coalesce(ep.price_cents, 0) > 0
    );

  if coalesce(v_event_paid_before,false) = false
     and coalesce(v_event_paid_after,false) = true
  then
    perform public.assert_can_create_paid_product(v_org_id, v_event_id);
  end if;

  -- Update
  update public.events
  set
    slug = case when v_has_title and v_title is distinct from v_cur_title then v_new_slug else slug end,
    title = coalesce(v_title, title),
    location = case when v_has_location then v_location else location end,
    description = case when v_has_description then v_description else description end,
    banner_url = case when v_has_banner then v_banner_url else banner_url end,
    starts_at = case when v_has_starts then v_starts_at else starts_at end,
    ends_at = case when v_has_ends then v_ends_at else ends_at end,
    registration_deadline = case when v_has_registration_deadline then v_registration_deadline else registration_deadline end,
    is_published = case when v_has_published then v_is_published else is_published end,
    deposit_cents = case when v_has_deposit then v_deposit_cents else deposit_cents end,
    max_attendees = case when v_has_max_attendees then v_max_attendees else max_attendees end,
    updated_at = v_now
  where id = v_event_id;

  select *
  into v_row
  from public.events
  where id = v_event_id;

  return jsonb_build_object(
    'id', v_row.id,
    'orgId', v_row.org_id,
    'slug', v_row.slug,
    'title', v_row.title,
    'description', v_row.description,
    'location', v_row.location,
    'bannerUrl', v_row.banner_url,
    'depositCents', v_row.deposit_cents,
    'maxAttendees', v_row.max_attendees,
    'startsAt', v_row.starts_at,
    'endsAt', v_row.ends_at,
    'registrationDeadline', v_row.registration_deadline,
    'isPublished', v_row.is_published,
    'createdAt', v_row.created_at,
    'updatedAt', v_row.updated_at
  );
end;
$$;

revoke all on function public.update_event(jsonb) from public;
revoke all on function public.update_event(jsonb) from anon;
revoke all on function public.update_event(jsonb) from authenticated;

grant execute on function public.update_event(jsonb) to authenticated;

-- 10. get_event_detail_admin_core

create or replace function public.get_event_detail_admin_core(
  p_event_id uuid default null,
  p_org_id uuid default null,
  p_event_slug text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;

  v_event jsonb;
  v_products jsonb;
  v_form_fields_groups jsonb;
  v_form_fields jsonb;

  -- branding
  v_org_id uuid;
  v_org_logo_url text;
  v_org_default_banner_url text;

  v_default_logo_url text := 'https://dixirvllhfkvqoahhfqh.supabase.co/storage/v1/object/public/public-assets/defaults/default_logo.webp';
  v_default_banner_url text := 'https://dixirvllhfkvqoahhfqh.supabase.co/storage/v1/object/public/public-assets/defaults/default_banner.webp';

  v_slug text := nullif(trim(p_event_slug), '');
begin
  /* ---------------- Auth ---------------- */

  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  /* -------- Resolve event_id if needed -------- */

  if p_event_id is null then
    if p_org_id is null or v_slug is null then
      raise exception 'VALIDATION_ERROR: org_id + event_slug required';
    end if;

    select e.id
    into p_event_id
    from public.events e
    where e.org_id = p_org_id
      and e.slug = v_slug
    limit 1;

    if p_event_id is null then
      raise exception 'NOT_FOUND';
    end if;
  end if;

  /* ---------------- Membership ---------------- */

  if not public.is_event_org_member(p_event_id) then
    raise exception 'FORBIDDEN';
  end if;

  /* ---------------- Event + Branding ---------------- */

  select
    e.org_id,
    jsonb_build_object(
      'id', e.id,
      'orgId', e.org_id,
      'slug', e.slug,
      'title', e.title,
      'description', e.description,
      'location', e.location,
      'isPublished', e.is_published,
      'bannerUrlRaw', e.banner_url,
      'depositCents', e.deposit_cents,
      'maxAttendees', e.max_attendees,
      'createdAt', e.created_at::text,
      'updatedAt', e.updated_at::text,
      'startsAt', to_jsonb(e.starts_at::text),
      'endsAt', to_jsonb(e.ends_at::text),
      'registrationDeadline', to_jsonb(e.registration_deadline::text),
      'bannerUrlEffective',
        coalesce(
          nullif(trim(e.banner_url), ''),
          nullif(trim(op.default_event_banner_url), ''),
          v_default_banner_url
        )
    ),
    nullif(trim(op.logo_url), ''),
    nullif(trim(op.default_event_banner_url), '')
  into
    v_org_id,
    v_event,
    v_org_logo_url,
    v_org_default_banner_url
  from public.events e
  join public.organization_profile op
    on op.org_id = e.org_id
  where e.id = p_event_id;

  if v_event is null then
    raise exception 'NOT_FOUND';
  end if;

  /* ---------------- Products ---------------- */

  select coalesce(
    jsonb_agg(to_jsonb(ep) order by ep.sort_order asc, ep.created_at asc),
    '[]'::jsonb
  )
  into v_products
  from public.event_products ep
  where ep.event_id = p_event_id;

  /* ---------------- Form field groups ---------------- */

  select coalesce(
    jsonb_agg(to_jsonb(ffg) order by ffg.sort_order asc, ffg.created_at asc),
    '[]'::jsonb
  )
  into v_form_fields_groups
  from public.event_form_field_groups ffg
  where ffg.event_id = p_event_id;

  /* ---------------- Form fields ---------------- */

  select coalesce(
    jsonb_agg(to_jsonb(ff) order by ff.sort_order asc, ff.created_at asc),
    '[]'::jsonb
  )
  into v_form_fields
  from public.event_form_fields ff
  where ff.event_id = p_event_id;

  /* ---------------- Final payload ---------------- */

  v_result := jsonb_build_object(
    'event', v_event,
    'orgBranding', jsonb_build_object(
      'logoUrl', coalesce(v_org_logo_url, v_default_logo_url),
      'defaultEventBannerUrl', coalesce(v_org_default_banner_url, v_default_banner_url)
    ),
    'products', v_products,
    'formFields', v_form_fields,
    'formFieldsGroups', v_form_fields_groups
  );

  return v_result;
end;
$$;

revoke all on function public.get_event_detail_admin_core(uuid, uuid, text) from public;
revoke all on function public.get_event_detail_admin_core(uuid, uuid, text) from anon;
revoke all on function public.get_event_detail_admin_core(uuid, uuid, text) from authenticated;

grant execute on function public.get_event_detail_admin_core(uuid, uuid, text) to authenticated;