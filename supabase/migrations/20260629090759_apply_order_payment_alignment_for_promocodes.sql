begin;

create or replace function public.apply_order_payment(
  p_order_id uuid,
  p_provider text,
  p_amount_cents integer,
  p_currency text,
  p_provider_payment_id text,
  p_raw jsonb default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_order record;
  v_existing_payment record;

  v_new_paid int;
  v_first_payment boolean := false;

  v_currency text := upper(nullif(trim(p_currency), ''));
  v_provider text := lower(nullif(trim(p_provider), ''));

  v_already_paid boolean := false;

  v_discount_cents int := 0;
  v_effective_total_cents int := 0;
  v_new_status text;
begin
  perform set_config('search_path', 'pg_temp, public, extensions, private', true);

  if p_order_id is null then
    raise exception 'VALIDATION_ERROR: order_id is required';
  end if;

  if v_provider is null then
    raise exception 'VALIDATION_ERROR: provider is required';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'VALIDATION_ERROR: amount must be > 0';
  end if;

  if v_currency is null then
    raise exception 'VALIDATION_ERROR: currency is required';
  end if;

  if p_provider_payment_id is null or trim(p_provider_payment_id) = '' then
    raise exception 'VALIDATION_ERROR: provider_payment_id is required';
  end if;

  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if v_order.status in ('cancelled','expired') then
    raise exception 'ORDER_NOT_PAYABLE';
  end if;

  if v_order.currency is not null and upper(v_order.currency) <> v_currency then
    raise exception 'CURRENCY_MISMATCH';
  end if;

  select coalesce(sum(pcr.discount_cents), 0)::int
  into v_discount_cents
  from public.promo_code_redemptions pcr
  where pcr.order_id = p_order_id;

  v_effective_total_cents := greatest(
    coalesce(v_order.total_cents, 0) - coalesce(v_discount_cents, 0),
    0
  );

  v_first_payment := coalesce(v_order.paid_cents, 0) = 0;

  select *
  into v_existing_payment
  from public.payments
  where provider = v_provider
    and provider_payment_id = p_provider_payment_id
  for update;

  if found then
    if v_existing_payment.order_id is distinct from p_order_id then
      raise exception 'PAYMENT_ORDER_MISMATCH';
    end if;

    if v_existing_payment.currency is not null and upper(v_existing_payment.currency) <> v_currency then
      raise exception 'PAYMENT_CURRENCY_MISMATCH';
    end if;

    v_already_paid := (coalesce(v_existing_payment.status, '') = 'paid')
                      and (v_existing_payment.processed_at is not null);

    if v_already_paid then
      update public.payments
      set
        raw = coalesce(p_raw, raw),
        updated_at = v_now
      where id = v_existing_payment.id;

      return jsonb_build_object(
        'ok', true,
        'order_id', p_order_id,
        'paid_cents', coalesce(v_order.paid_cents, 0),
        'total_cents', v_order.total_cents,
        'discount_cents', v_discount_cents,
        'effective_total_cents', v_effective_total_cents,
        'status', v_order.status,
        'idempotent', true
      );
    end if;

    update public.payments
    set
      amount_cents = p_amount_cents,
      currency = v_currency,
      status = 'paid',
      processed_at = v_now,
      raw = p_raw,
      type = 'payment',
      updated_at = v_now
    where id = v_existing_payment.id;

  else
    insert into public.payments (
      order_id,
      provider,
      provider_payment_id,
      amount_cents,
      currency,
      status,
      processed_at,
      raw,
      type,
      created_at,
      updated_at
    )
    values (
      p_order_id,
      v_provider,
      p_provider_payment_id,
      p_amount_cents,
      v_currency,
      'paid',
      v_now,
      p_raw,
      'payment',
      v_now,
      v_now
    );
  end if;

  v_new_paid := least(
    v_effective_total_cents,
    coalesce(v_order.paid_cents, 0) + p_amount_cents
  );

  v_new_status := case
    when v_new_paid >= v_effective_total_cents then 'paid'
    else 'partially_paid'
  end;

  update public.orders
  set
    paid_cents = v_new_paid,
    status = v_new_status,
    confirmed_at = coalesce(confirmed_at, v_now),
    updated_at = v_now
  where id = p_order_id;

  if v_first_payment then
    update public.order_attendees
    set
      status = 'confirmed',
      confirmed_at = coalesce(confirmed_at, v_now)
    where order_id = p_order_id
      and status = 'reserved';
  end if;

  if v_first_payment then
    update public.event_products ep
    set
      reserved_qty = greatest(0, coalesce(ep.reserved_qty, 0) - x.qty),
      sold_qty     = coalesce(ep.sold_qty, 0) + x.qty
    from (
      select product_id, sum(quantity)::int as qty
      from public.order_items
      where order_id = p_order_id
      group by product_id
    ) x
    where ep.id = x.product_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'order_id', p_order_id,
    'paid_cents', v_new_paid,
    'total_cents', v_order.total_cents,
    'discount_cents', v_discount_cents,
    'effective_total_cents', v_effective_total_cents,
    'status', v_new_status,
    'idempotent', false
  );
end;
$$;

revoke all on function public.apply_order_payment(
  uuid,
  text,
  integer,
  text,
  text,
  jsonb,
  text
) from public;

revoke all on function public.apply_order_payment(
  uuid,
  text,
  integer,
  text,
  text,
  jsonb,
  text
) from anon;

revoke all on function public.apply_order_payment(
  uuid,
  text,
  integer,
  text,
  text,
  jsonb,
  text
) from authenticated;

grant execute on function public.apply_order_payment(
  uuid,
  text,
  integer,
  text,
  text,
  jsonb,
  text
) to service_role;

commit;