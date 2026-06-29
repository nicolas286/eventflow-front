begin;

create or replace function public.get_event_admin_orders_view(
  p_event_id uuid default null,
  p_org_id uuid default null,
  p_event_slug text default null,
  p_orders_limit integer default 200,
  p_orders_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;

  v_orders_total integer;
  v_orders jsonb;
  v_order_ids uuid[];

  v_order_items jsonb;
  v_payments jsonb;

  v_attendees jsonb;
  v_attendee_ids uuid[];
  v_attendee_answers jsonb;

  v_slug text := nullif(trim(p_event_slug), '');
begin
  perform set_config('search_path', 'pg_temp, public, extensions, private', true);

  /* ---------------- Auth ---------------- */

  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_orders_limit < 1 or p_orders_limit > 1000 then
    raise exception 'VALIDATION_ERROR: orders_limit out of range';
  end if;

  if p_orders_offset is null or p_orders_offset < 0 then
    raise exception 'VALIDATION_ERROR: orders_offset out of range';
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

  /* ---------------- Orders total ---------------- */

  select count(*)
  into v_orders_total
  from public.orders o
  where o.event_id = p_event_id;

  /* ---------------- Orders page ---------------- */

  with o_page as (
    select o.*
    from public.orders o
    where o.event_id = p_event_id
    order by o.created_at desc, o.id desc
    limit p_orders_limit
    offset p_orders_offset
  ),
  redemptions as (
    select
      pcr.order_id,
      pcr.discount_cents,
      jsonb_build_object(
        'id', pcr.id,
        'promoCodeId', pcr.promo_code_id,
        'code', pc.code,
        'discountCents', pcr.discount_cents,
        'createdAt', pcr.created_at
      ) as promo_redemption
    from public.promo_code_redemptions pcr
    left join public.promo_codes pc on pc.id = pcr.promo_code_id
    where pcr.order_id in (select id from o_page)
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', o_page.id,
          'orgId', o_page.org_id,
          'eventId', o_page.event_id,

          'currency', o_page.currency,

          'totalCents', coalesce(o_page.total_cents, 0),
          'paidCents', coalesce(o_page.paid_cents, 0),
          'discountCents', coalesce(redemptions.discount_cents, 0),
          'dueCents', greatest(
            coalesce(o_page.total_cents, 0)
            - coalesce(redemptions.discount_cents, 0)
            - coalesce(o_page.paid_cents, 0),
            0
          ),

          'promoRedemption', redemptions.promo_redemption,

          'status', o_page.status,

          'buyerEmail', o_page.buyer_email,
          'buyerName', o_page.buyer_name,
          'buyerPhone', o_page.buyer_phone,
          'buyerIsAttendee', coalesce(o_page.buyer_is_attendee, false),

          'depositDueCentsSnapshot', coalesce(o_page.deposit_due_cents_snapshot, 0),

          'createdAt', o_page.created_at,
          'updatedAt', o_page.updated_at,
          'expiresAt', o_page.expires_at,
          'confirmedAt', o_page.confirmed_at,
          'detailsCompletedAt', o_page.details_completed_at,
          'canceledAt', o_page.canceled_at
        )
        order by o_page.created_at desc, o_page.id desc
      ),
      '[]'::jsonb
    ),
    coalesce(array_agg(o_page.id), '{}'::uuid[])
  into v_orders, v_order_ids
  from o_page
  left join redemptions on redemptions.order_id = o_page.id;

  /* ---------------- Order items ---------------- */

  select coalesce(
    jsonb_agg(to_jsonb(oi) order by oi.created_at asc, oi.id asc),
    '[]'::jsonb
  )
  into v_order_items
  from public.order_items oi
  where oi.order_id = any(v_order_ids);

  /* ---------------- Payments ---------------- */

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'orderId', p.order_id,
        'provider', p.provider,
        'providerPaymentId', p.provider_payment_id,
        'amountCents', p.amount_cents,
        'currency', p.currency,
        'status', p.status,
        'type', p.type,
        'isRefund', p.is_refund,
        'parentPaymentId', p.parent_payment_id,
        'createdAt', p.created_at,
        'updatedAt', p.updated_at,
        'processedAt', p.processed_at
      )
      order by p.created_at asc, p.id asc
    ),
    '[]'::jsonb
  )
  into v_payments
  from public.payments p
  where p.order_id = any(v_order_ids);

  /* ---------------- Attendees ---------------- */

  with attendees_page_orders as (
    select oa.*
    from public.order_attendees oa
    where oa.order_id = any(v_order_ids)
    order by oa.created_at desc, oa.id desc
  )
  select
    coalesce(jsonb_agg(to_jsonb(attendees_page_orders)), '[]'::jsonb),
    coalesce(array_agg(attendees_page_orders.id), '{}'::uuid[])
  into v_attendees, v_attendee_ids
  from attendees_page_orders;

  /* ---------------- Attendee answers ---------------- */

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ans.id,
        'attendeeId', ans.attendee_id,
        'fieldKeySnapshot', ans.field_key_snapshot,
        'fieldTypeSnapshot', ans.field_type_snapshot,
        'fieldLabelSnapshot', ans.field_label_snapshot,
        'value',
          case ans.field_type_snapshot
            when 'checkbox' then
              case
                when ans.value ? 'value_bool' then (ans.value->>'value_bool')
                else coalesce(ans.value->>'value_text', ans.value #>> '{}')
              end
            when 'number' then
              case
                when ans.value ? 'value_int' then (ans.value->>'value_int')
                else coalesce(ans.value->>'value_text', ans.value #>> '{}')
              end
            when 'date' then
              coalesce(ans.value->>'value_date', ans.value->>'value_text', ans.value #>> '{}')
            else
              coalesce(ans.value->>'value_text', ans.value #>> '{}')
          end,
        'createdAt', ans.created_at,
        'updatedAt', ans.updated_at
      )
      order by ans.created_at asc, ans.id asc
    ),
    '[]'::jsonb
  )
  into v_attendee_answers
  from public.order_attendee_answers ans
  where ans.attendee_id = any(v_attendee_ids);

  /* ---------------- Final payload ---------------- */

  v_result := jsonb_build_object(
    'orders', jsonb_build_object(
      'limit', p_orders_limit,
      'offset', p_orders_offset,
      'total', v_orders_total,
      'rows', v_orders
    ),
    'orderItems', v_order_items,
    'payments', v_payments,
    'attendees', v_attendees,
    'attendeeAnswers', v_attendee_answers
  );

  return v_result;
end;
$$;

revoke all on function public.get_event_admin_orders_view(
  uuid,
  uuid,
  text,
  integer,
  integer
) from public;

revoke all on function public.get_event_admin_orders_view(
  uuid,
  uuid,
  text,
  integer,
  integer
) from anon;

revoke all on function public.get_event_admin_orders_view(
  uuid,
  uuid,
  text,
  integer,
  integer
) from authenticated;

grant execute on function public.get_event_admin_orders_view(
  uuid,
  uuid,
  text,
  integer,
  integer
) to authenticated;

commit;