create or replace function public.update_event_product(p_input jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();

  v_product_id uuid;
  v_cur record;

  v_event_id uuid;
  v_org_id uuid;

  v_name text;
  v_description text;
  v_price_cents int;
  v_currency text;
  v_stock_qty int;
  v_is_active boolean;
  v_sort_order int;
  v_creates_attendees boolean;
  v_attendees_per_unit int;

  v_is_gatekeeper boolean;
  v_close_event_when_sold_out boolean;

  v_description_provided boolean := false;
  v_stock_qty_provided boolean := false;

  v_new_price_cents int;
  v_new_currency text;
  v_new_creates_attendees boolean;
  v_new_attendees_per_unit int;
  v_new_is_gatekeeper boolean;
  v_new_close_event_when_sold_out boolean;

  v_event_paid_before boolean;
  v_event_paid_after boolean;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  /* ------------------------------
   * Parse
   * ------------------------------ */
  v_product_id := nullif(trim(p_input->>'product_id'), '')::uuid;

  if v_product_id is null then
    raise exception 'VALIDATION_ERROR: product product_id is required';
  end if;

  if p_input ? 'name' then
    v_name := nullif(trim(p_input->>'name'), '');
  end if;

  if p_input ? 'description' then
    v_description_provided := true;
    v_description := nullif(trim(p_input->>'description'), '');
  end if;

  if p_input ? 'price_cents' then
    v_price_cents := nullif(trim(p_input->>'price_cents'), '')::int;
  end if;

  if p_input ? 'currency' then
    v_currency := upper(coalesce(nullif(trim(p_input->>'currency'), ''), 'EUR'));
  end if;

  if p_input ? 'stock_qty' then
    v_stock_qty_provided := true;
    v_stock_qty := nullif(trim(p_input->>'stock_qty'), '')::int;

    if v_stock_qty = 0 then
      v_stock_qty := null;
    end if;
  end if;

  if p_input ? 'is_active' then
    v_is_active := (p_input->>'is_active')::boolean;
  end if;

  if p_input ? 'sort_order' then
    v_sort_order := nullif(trim(p_input->>'sort_order'), '')::int;
  end if;

  if p_input ? 'creates_attendees' then
    v_creates_attendees := (p_input->>'creates_attendees')::boolean;
  end if;

  if p_input ? 'attendees_per_unit' then
    v_attendees_per_unit := nullif(trim(p_input->>'attendees_per_unit'), '')::int;
  end if;

  if p_input ? 'is_gatekeeper' then
    v_is_gatekeeper := (p_input->>'is_gatekeeper')::boolean;
  end if;

  if p_input ? 'close_event_when_sold_out' then
    v_close_event_when_sold_out := (p_input->>'close_event_when_sold_out')::boolean;
  end if;

  /* ------------------------------
   * Load current product + event/org
   * ------------------------------ */
  select
    ep.id,
    ep.event_id,
    ep.name,
    ep.description,
    ep.price_cents,
    ep.currency,
    ep.stock_qty,
    ep.is_active,
    ep.sort_order,
    ep.creates_attendees,
    ep.attendees_per_unit,
    ep.is_gatekeeper,
    ep.close_event_when_sold_out,
    e.org_id
  into v_cur
  from public.event_products ep
  join public.events e on e.id = ep.event_id
  where ep.id = v_product_id
  limit 1;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  v_event_id := v_cur.event_id;
  v_org_id := v_cur.org_id;

  /* ------------------------------
   * Authorization
   * ------------------------------ */
  if not public.is_org_member(v_org_id) then
    raise exception 'FORBIDDEN';
  end if;

  /* ------------------------------
   * Rate limit
   * ------------------------------ */
  perform public.assert_rate_limit(
    'update_product:org:' || v_org_id::text || ':user:' || v_user_id::text,
    200,
    3600
  );

  /* ------------------------------
   * Compute final values
   * ------------------------------ */
  v_new_price_cents := coalesce(v_price_cents, v_cur.price_cents, 0);
  v_new_currency := coalesce(v_currency, v_cur.currency, 'EUR');
  v_new_creates_attendees := coalesce(v_creates_attendees, v_cur.creates_attendees, true);
  v_new_attendees_per_unit := coalesce(v_attendees_per_unit, v_cur.attendees_per_unit, 1);
  v_new_is_gatekeeper := coalesce(v_is_gatekeeper, v_cur.is_gatekeeper, false);
  v_new_close_event_when_sold_out :=
    coalesce(v_close_event_when_sold_out, v_cur.close_event_when_sold_out, false);

  /* ------------------------------
   * Validations
   * ------------------------------ */
  if p_input ? 'name' and v_name is null then
    raise exception 'VALIDATION_ERROR: product name is required';
  end if;

  if v_name is not null and char_length(v_name) < 2 then
    raise exception 'VALIDATION_ERROR: product name too short';
  end if;

  if v_name is not null and char_length(v_name) > 80 then
    raise exception 'VALIDATION_ERROR: product name too long';
  end if;

  if v_description is not null and char_length(v_description) > 500 then
    raise exception 'VALIDATION_ERROR: product description too long';
  end if;

  if v_new_price_cents < 0 or v_new_price_cents > 10000000 then
    raise exception 'VALIDATION_ERROR: product price_cents must be between 0 and 10000000';
  end if;

  if v_new_currency <> 'EUR' then
    raise exception 'VALIDATION_ERROR: product unsupported currency';
  end if;

  if v_stock_qty is not null and v_stock_qty < 0 then
    raise exception 'VALIDATION_ERROR: product stock_qty must be >= 0';
  end if;

  if v_sort_order is not null and (v_sort_order < 0 or v_sort_order > 1000) then
    raise exception 'VALIDATION_ERROR: product sort_order must be between 0 and 1000';
  end if;

  if v_new_creates_attendees and (
    v_new_attendees_per_unit is null
    or v_new_attendees_per_unit < 1
    or v_new_attendees_per_unit > 20
  ) then
    raise exception 'VALIDATION_ERROR: product attendees_per_unit must be between 1 and 20';
  end if;

  if v_new_close_event_when_sold_out and not v_new_is_gatekeeper then
    raise exception 'VALIDATION_ERROR: product close_event_when_sold_out requires is_gatekeeper=true';
  end if;

  /* ------------------------------
   * Plan limits
   * ------------------------------ */
  v_event_paid_before := public.is_event_paid(v_event_id);

  perform 1
  from public.events e
  where e.id = v_event_id
  for update;

  if v_new_price_cents > 0 then
    v_event_paid_after := true;
  else
    v_event_paid_after :=
      exists (
        select 1
        from public.events e
        where e.id = v_event_id
          and coalesce(e.deposit_cents, 0) > 0
      )
      or exists (
        select 1
        from public.event_products ep
        where ep.event_id = v_event_id
          and ep.id <> v_product_id
          and coalesce(ep.price_cents, 0) > 0
      );
  end if;

  if coalesce(v_event_paid_before, false) = false
     and coalesce(v_event_paid_after, false) = true
  then
    perform public.assert_can_create_paid_product(v_org_id, v_event_id);
  end if;

  /* ------------------------------
   * Update
   * ------------------------------ */
  update public.event_products ep
  set
    name = coalesce(v_name, ep.name),
    description = case
      when v_description_provided then v_description
      else ep.description
    end,
    price_cents = coalesce(v_price_cents, ep.price_cents),
    currency = coalesce(v_currency, ep.currency),
    stock_qty = case
      when v_stock_qty_provided then v_stock_qty
      else ep.stock_qty
    end,
    is_active = coalesce(v_is_active, ep.is_active),
    sort_order = coalesce(v_sort_order, ep.sort_order),
    creates_attendees = coalesce(v_creates_attendees, ep.creates_attendees),
    attendees_per_unit = coalesce(v_attendees_per_unit, ep.attendees_per_unit),
    is_gatekeeper = coalesce(v_is_gatekeeper, ep.is_gatekeeper),
    close_event_when_sold_out = coalesce(
      v_close_event_when_sold_out,
      ep.close_event_when_sold_out
    ),
    updated_at = now()
  where ep.id = v_product_id;

  return v_product_id;

exception
  when unique_violation then
    raise exception 'CONFLICT';
end;
$$;

revoke all on function public.update_event_product(jsonb) from public;
revoke all on function public.update_event_product(jsonb) from anon;
revoke all on function public.update_event_product(jsonb) from authenticated;

grant execute on function public.update_event_product(jsonb) to authenticated;