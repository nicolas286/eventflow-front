create or replace function public.create_event_product(p_input jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_product_id uuid;

  v_event_id uuid;
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

  v_org_id uuid;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  /* ------------------------------
   * Parse input
   * ------------------------------ */
  v_event_id := nullif(trim(p_input->>'event_id'), '')::uuid;
  v_name := nullif(trim(p_input->>'name'), '');
  v_description := nullif(trim(p_input->>'description'), '');
  v_price_cents := nullif(trim(p_input->>'price_cents'), '')::int;
  v_currency := upper(coalesce(nullif(trim(p_input->>'currency'), ''), 'EUR'));

  v_stock_qty := nullif(trim(p_input->>'stock_qty'), '')::int;

    if v_stock_qty = 0 then
    v_stock_qty := null;
    end if;

  v_is_active := coalesce((p_input->>'is_active')::boolean, true);
  v_sort_order := coalesce(nullif(trim(p_input->>'sort_order'), '')::int, 0);
  v_creates_attendees := coalesce((p_input->>'creates_attendees')::boolean, true);
  v_attendees_per_unit := coalesce(nullif(trim(p_input->>'attendees_per_unit'), '')::int, 1);
  v_is_gatekeeper := coalesce((p_input->>'is_gatekeeper')::boolean, false);
  v_close_event_when_sold_out := coalesce((p_input->>'close_event_when_sold_out')::boolean, false);

  /* ------------------------------
   * Validations
   * ------------------------------ */
  if v_event_id is null then
    raise exception 'VALIDATION_ERROR: event_id is required';
  end if;

  if v_name is null then
    raise exception 'VALIDATION_ERROR: name is required';
  end if;

  if char_length(v_name) < 2 then
    raise exception 'VALIDATION_ERROR: name too short';
  end if;

  if char_length(v_name) > 80 then
    raise exception 'VALIDATION_ERROR: name too long';
  end if;

  if v_description is not null and char_length(v_description) > 500 then
    raise exception 'VALIDATION_ERROR: description too long';
  end if;

  if v_price_cents is null or v_price_cents < 0 or v_price_cents > 10000000 then
    raise exception 'VALIDATION_ERROR: price_cents must be between 0 and 10000000';
  end if;

  if v_currency <> 'EUR' then
    raise exception 'VALIDATION_ERROR: unsupported currency';
  end if;

  if v_stock_qty is not null and v_stock_qty < 0 then
    raise exception 'VALIDATION_ERROR: stock_qty must be >= 0';
  end if;

  if v_sort_order < 0 or v_sort_order > 1000 then
    raise exception 'VALIDATION_ERROR: sort_order must be between 0 and 1000';
  end if;

  if v_creates_attendees and (
    v_attendees_per_unit is null
    or v_attendees_per_unit < 1
    or v_attendees_per_unit > 20
  ) then
    raise exception 'VALIDATION_ERROR: attendees_per_unit must be between 1 and 20';
  end if;

  if v_close_event_when_sold_out and not v_is_gatekeeper then
    raise exception 'VALIDATION_ERROR: close_event_when_sold_out requires is_gatekeeper=true';
  end if;

  /* ------------------------------
   * Resolve org_id via event
   * ------------------------------ */
  select e.org_id
    into v_org_id
  from public.events e
  where e.id = v_event_id;

  if v_org_id is null then
    raise exception 'NOT_FOUND';
  end if;

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
    'create_product:org:' || v_org_id::text || ':user:' || v_user_id::text,
    100,
    3600
  );

  /* ------------------------------
   * Plan limits
   * ------------------------------ */
  perform public.assert_can_add_product(v_org_id, v_event_id);

  if v_price_cents > 0 then
    perform public.assert_can_create_paid_product(v_org_id, v_event_id);
  end if;

  /* ------------------------------
   * Insert
   * ------------------------------ */
  insert into public.event_products (
    id,
    event_id,
    name,
    description,
    price_cents,
    currency,
    stock_qty,
    is_active,
    sort_order,
    creates_attendees,
    attendees_per_unit,
    is_gatekeeper,
    close_event_when_sold_out,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    v_event_id,
    v_name,
    v_description,
    v_price_cents,
    v_currency,
    v_stock_qty,
    v_is_active,
    v_sort_order,
    v_creates_attendees,
    v_attendees_per_unit,
    v_is_gatekeeper,
    v_close_event_when_sold_out,
    now(),
    now()
  )
  returning id into v_product_id;

  return v_product_id;
end;
$$;

revoke all on function public.create_event_product(jsonb) from public;
revoke all on function public.create_event_product(jsonb) from anon;
revoke all on function public.create_event_product(jsonb) from authenticated;

grant execute on function public.create_event_product(jsonb) to authenticated;