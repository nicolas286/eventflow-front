alter table public.event_form_field_groups
add column description text;

-- optionnel : limiter à ±3 lignes (~300 caractères)
alter table public.event_form_field_groups
add constraint description_length_check
check (description is null or char_length(description) <= 300);

create or replace function public.create_event_form_field_group(p_input jsonb)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();

  v_event_id uuid;
  v_org_id uuid;

  v_label text;
  v_description text;
  v_sort_order int4;
  v_is_active boolean := true;

  v_now timestamptz := now();
  v_new_id uuid;
begin
  perform set_config('search_path', 'pg_temp, public, extensions, private', true);

  /* -------------------------------------------------- */
  /* 1) Auth                                            */
  /* -------------------------------------------------- */
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  /* -------------------------------------------------- */
  /* 2) Parse input                                     */
  /* -------------------------------------------------- */
  v_event_id := nullif(trim(p_input->>'event_id'), '')::uuid;
  v_label := nullif(trim(p_input->>'label'), '');
  v_description := nullif(trim(p_input->>'description'), '');
  v_sort_order := nullif(trim(p_input->>'sort_order'), '')::int4;

  if p_input ? 'is_active' then
    v_is_active := (p_input->>'is_active')::boolean;
  end if;

  /* -------------------------------------------------- */
  /* 3) Validation                                      */
  /* -------------------------------------------------- */
  if v_event_id is null then
    raise exception 'VALIDATION_ERROR: event_id is required';
  end if;

  if v_label is null then
    raise exception 'VALIDATION_ERROR: label is required';
  end if;

  if length(v_label) > 120 then
    raise exception 'VALIDATION_ERROR: label too long';
  end if;

  if v_description is not null and length(v_description) > 300 then
    raise exception 'VALIDATION_ERROR: description too long';
  end if;

  if v_sort_order is not null and (v_sort_order < 0 or v_sort_order > 1000) then
    raise exception 'VALIDATION_ERROR: sort_order invalid';
  end if;

  /* -------------------------------------------------- */
  /* 4) Resolve org via event                           */
  /* -------------------------------------------------- */
  select e.org_id
    into v_org_id
  from public.events e
  where e.id = v_event_id
  limit 1;

  if v_org_id is null then
    raise exception 'NOT_FOUND';
  end if;

  if not public.is_org_member(v_org_id) then
    raise exception 'FORBIDDEN';
  end if;

  perform public.assert_rate_limit(
    'create_form_field_group:event:' || v_event_id::text,
    60,
    3600
  );

  /* -------------------------------------------------- */
  /* 5) Default sort_order                              */
  /* -------------------------------------------------- */
  if v_sort_order is null then
    select coalesce(max(g.sort_order), 0) + 1
      into v_sort_order
    from public.event_form_field_groups g
    where g.event_id = v_event_id;
  end if;

  /* -------------------------------------------------- */
  /* 6) Insert                                          */
  /* -------------------------------------------------- */
  v_new_id := gen_random_uuid();

  insert into public.event_form_field_groups (
    id,
    event_id,
    label,
    description,
    sort_order,
    is_active,
    created_at,
    updated_at
  ) values (
    v_new_id,
    v_event_id,
    v_label,
    v_description,
    v_sort_order,
    v_is_active,
    v_now,
    v_now
  );

  /* -------------------------------------------------- */
  /* 7) Return                                          */
  /* -------------------------------------------------- */
  return jsonb_build_object(
    'id', v_new_id,
    'event_id', v_event_id,
    'label', v_label,
    'description', v_description,
    'sort_order', v_sort_order,
    'is_active', v_is_active,
    'created_at', v_now::text,
    'updated_at', v_now::text
  );

exception
  when unique_violation then
    raise exception 'CONFLICT';
end;
$$;

-- 🔒 on nettoie tout
revoke all on function public.create_event_form_field_group(jsonb) from public;
revoke all on function public.create_event_form_field_group(jsonb) from anon;
revoke all on function public.create_event_form_field_group(jsonb) from authenticated;

-- ✅ on autorise uniquement les users loggés
grant execute on function public.create_event_form_field_group(jsonb) to authenticated;

create or replace function public.duplicate_event(p_input jsonb)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();

  v_source_event_id uuid;
  v_source_event public.events%rowtype;

  v_new_event_id uuid;
  v_new_slug text;
  v_title text;

  v_now timestamptz := now();

  v_form_fields_count int := 0;
  v_products_count int := 0;
  v_form_field_groups_count int := 0;
begin
  perform set_config('search_path', 'pg_temp, public, extensions, private', true);

  /* 1) Auth */
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  /* 2) Parse input */
  v_source_event_id := nullif(trim(p_input->>'source_event_id'), '')::uuid;
  v_title := nullif(trim(p_input->>'title'), '');

  if v_source_event_id is null then
    raise exception 'VALIDATION_ERROR: source_event_id is required';
  end if;

  if v_title is not null and length(v_title) > 120 then
    raise exception 'VALIDATION_ERROR: title too long';
  end if;

  /* 3) Load source event */
  select e.*
    into v_source_event
  from public.events e
  where e.id = v_source_event_id;

  if v_source_event.id is null then
    raise exception 'NOT_FOUND';
  end if;

  /* 4) Rights */
  if not exists (
    select 1
    from public.organization_members om
    where om.org_id = v_source_event.org_id
      and om.user_id = v_user_id
      and om.role in ('owner', 'admin')
  ) then
    raise exception 'FORBIDDEN';
  end if;

  /* 5) Derived values */
  v_title := coalesce(v_title, v_source_event.title || ' (copie)');

  /* 6) Validations */
  if v_title is null then
    raise exception 'VALIDATION_ERROR: title is required';
  end if;

  if length(v_title) > 120 then
    raise exception 'VALIDATION_ERROR: title too long';
  end if;

  if v_source_event.location is not null and length(v_source_event.location) > 180 then
    raise exception 'VALIDATION_ERROR: location too long';
  end if;

  if v_source_event.description is not null and length(v_source_event.description) > 5000 then
    raise exception 'VALIDATION_ERROR: description too long';
  end if;

  if v_source_event.banner_url is not null and length(v_source_event.banner_url) > 500 then
    raise exception 'VALIDATION_ERROR: banner_url too long';
  end if;

  if v_source_event.deposit_cents is not null and v_source_event.deposit_cents < 0 then
    raise exception 'VALIDATION_ERROR: deposit_cents must be >= 0';
  end if;

  if v_source_event.max_attendees is not null and v_source_event.max_attendees < 0 then
    raise exception 'VALIDATION_ERROR: max_attendees must be >= 0';
  end if;

  if v_source_event.starts_at is not null
     and v_source_event.ends_at is not null
     and v_source_event.ends_at < v_source_event.starts_at then
    raise exception 'VALIDATION_ERROR: ends_at must be after starts_at';
  end if;

  /* 7) Rate limit */
  perform public.assert_rate_limit(
    'duplicate_event:org:' || v_source_event.org_id::text,
    20,
    3600
  );

  /* 8) Count children for plan checks */
  select count(*)
    into v_form_fields_count
  from public.event_form_fields f
  where f.event_id = v_source_event_id;

  select count(*)
    into v_products_count
  from public.event_products p
  where p.event_id = v_source_event_id;

  select count(*)
    into v_form_field_groups_count
  from public.event_form_field_groups g
  where g.event_id = v_source_event_id;

  /* 9) Create target event */
  v_new_slug := private.generate_unique_event_slug(v_source_event.org_id, v_title);

  insert into public.events (
    id,
    org_id,
    slug,
    title,
    description,
    banner_url,
    starts_at,
    ends_at,
    registration_deadline,
    is_published,
    created_at,
    updated_at,
    deposit_cents,
    max_attendees,
    location
  )
  values (
    gen_random_uuid(),
    v_source_event.org_id,
    v_new_slug,
    v_title,
    v_source_event.description,
    v_source_event.banner_url,
    v_source_event.starts_at,
    v_source_event.ends_at,
    v_source_event.registration_deadline,
    false,
    v_now,
    v_now,
    v_source_event.deposit_cents,
    v_source_event.max_attendees,
    v_source_event.location
  )
  returning id into v_new_event_id;

  /* 10) Plan checks on cloned event */
  if coalesce(v_source_event.deposit_cents, 0) > 0 then
    perform public.assert_can_create_paid_product(v_source_event.org_id, v_new_event_id);
  end if;

  for i in 1..greatest(v_products_count, 0) loop
    perform public.assert_can_add_product(v_source_event.org_id, v_new_event_id);
  end loop;

  for i in 1..greatest(v_form_fields_count, 0) loop
    perform public.assert_can_add_form_field(v_source_event.org_id, v_new_event_id);
  end loop;

  /* 11) Clone form field groups + mapping */
  create temporary table tmp_event_form_field_group_map (
    old_group_id uuid primary key,
    new_group_id uuid not null
  ) on commit drop;

  insert into tmp_event_form_field_group_map (old_group_id, new_group_id)
  select
    g.id,
    gen_random_uuid()
  from public.event_form_field_groups g
  where g.event_id = v_source_event_id;

  insert into public.event_form_field_groups (
    id,
    event_id,
    label,
    description,
    sort_order,
    is_active,
    created_at,
    updated_at
  )
  select
    m.new_group_id,
    v_new_event_id,
    g.label,
    g.description,
    g.sort_order,
    g.is_active,
    v_now,
    v_now
  from public.event_form_field_groups g
  join tmp_event_form_field_group_map m
    on m.old_group_id = g.id
  where g.event_id = v_source_event_id
  order by g.sort_order asc, g.created_at asc;

  /* 12) Clone form fields */
  insert into public.event_form_fields (
    id,
    event_id,
    label,
    field_key,
    field_type,
    is_required,
    options,
    sort_order,
    is_active,
    created_at,
    updated_at,
    group_id
  )
  select
    gen_random_uuid(),
    v_new_event_id,
    f.label,
    f.field_key,
    f.field_type,
    f.is_required,
    f.options,
    f.sort_order,
    f.is_active,
    v_now,
    v_now,
    m.new_group_id
  from public.event_form_fields f
  left join tmp_event_form_field_group_map m
    on m.old_group_id = f.group_id
  where f.event_id = v_source_event_id
  order by f.sort_order asc, f.created_at asc;

  /* 13) Clone products */
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
    created_at,
    updated_at,
    reserved_qty,
    sold_qty,
    is_gatekeeper,
    close_event_when_sold_out
  )
  select
    gen_random_uuid(),
    v_new_event_id,
    p.name,
    p.description,
    p.price_cents,
    p.currency,
    p.stock_qty,
    p.is_active,
    p.sort_order,
    p.creates_attendees,
    p.attendees_per_unit,
    v_now,
    v_now,
    0,
    0,
    coalesce(p.is_gatekeeper, false),
    coalesce(p.close_event_when_sold_out, false)
  from public.event_products p
  where p.event_id = v_source_event_id
  order by p.sort_order asc, p.created_at asc;

  /* 14) Response */
  return jsonb_build_object(
    'id', v_new_event_id,
    'orgId', v_source_event.org_id,
    'slug', v_new_slug,
    'title', v_title,
    'description', v_source_event.description,
    'location', v_source_event.location,
    'bannerUrl', v_source_event.banner_url,
    'depositCents', v_source_event.deposit_cents,
    'maxAttendees', v_source_event.max_attendees,
    'startsAt', v_source_event.starts_at,
    'endsAt', v_source_event.ends_at,
    'registrationDeadline', v_source_event.registration_deadline,
    'isPublished', false,
    'createdAt', v_now,
    'updatedAt', v_now,
    'sourceEventId', v_source_event_id,
    'clonedFormFieldGroupsCount', v_form_field_groups_count,
    'clonedFormFieldsCount', v_form_fields_count,
    'clonedProductsCount', v_products_count
  );

exception
  when unique_violation then
    raise exception 'CONFLICT';
end;
$$;

