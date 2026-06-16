create or replace function public.create_event_form_field(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();

  v_event_id uuid;
  v_org_id uuid;
  v_group_id uuid;

  v_label text;
  v_field_key text;
  v_field_type text;
  v_is_required boolean := false;
  v_options jsonb;
  v_sort_order int4;
  v_is_active boolean := true;

  v_now timestamptz := now();
  v_new_id uuid;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  v_event_id := nullif(trim(p_input->>'event_id'), '')::uuid;
  v_label := nullif(trim(p_input->>'label'), '');
  v_field_key := nullif(trim(p_input->>'field_key'), '');
  v_field_type := nullif(trim(p_input->>'field_type'), '');
  v_sort_order := nullif(trim(p_input->>'sort_order'), '')::int4;
  v_group_id := nullif(trim(p_input->>'group_id'), '')::uuid;

  v_options := null;
  if p_input ? 'options' then
    v_options := p_input->'options';
  end if;

  if p_input ? 'is_required' then
    v_is_required := (p_input->>'is_required')::boolean;
  end if;

  if p_input ? 'is_active' then
    v_is_active := (p_input->>'is_active')::boolean;
  end if;

  if v_event_id is null then
    raise exception 'VALIDATION_ERROR: event_id is required';
  end if;

  if v_label is null or length(v_label) < 2 then
    raise exception 'VALIDATION_ERROR: label too short';
  end if;

  if length(v_label) > 120 then
    raise exception 'VALIDATION_ERROR: label too long';
  end if;

  if v_field_key is null or length(v_field_key) < 2 then
    raise exception 'VALIDATION_ERROR: field_key too short';
  end if;

  if length(v_field_key) > 100 then
    raise exception 'VALIDATION_ERROR: field_key too long';
  end if;

  if v_field_key !~ '^[a-z][a-z0-9_]*$' then
    raise exception 'VALIDATION_ERROR: field_key format invalid';
  end if;

  if v_field_type is null then
    raise exception 'VALIDATION_ERROR: field_type is required';
  end if;

  if v_field_type not in (
    'text', 'textarea', 'email', 'number', 'select',
    'checkbox', 'radio', 'date', 'country', 'phone'
  ) then
    raise exception 'VALIDATION_ERROR: field_type invalid';
  end if;

  if v_sort_order is not null and (v_sort_order < 0 or v_sort_order > 1000) then
    raise exception 'VALIDATION_ERROR: sort_order invalid';
  end if;

  if v_field_type in ('select', 'radio') then
    if v_options is null then
      raise exception 'VALIDATION_ERROR: options is required for %', v_field_type;
    end if;

    if jsonb_typeof(v_options) <> 'array' then
      raise exception 'VALIDATION_ERROR: options must be an array for %', v_field_type;
    end if;

    if jsonb_array_length(v_options) < 1 then
      raise exception 'VALIDATION_ERROR: options must contain at least one item';
    end if;

    if jsonb_array_length(v_options) > 100 then
      raise exception 'VALIDATION_ERROR: options must contain at most 100 items';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(v_options) as opt(value)
      where jsonb_typeof(opt.value) <> 'string'
         or length(trim(opt.value #>> '{}')) < 1
         or length(trim(opt.value #>> '{}')) > 80
    ) then
      raise exception 'VALIDATION_ERROR: each option must be a string between 1 and 80 characters';
    end if;
  else
    v_options := null;
  end if;

  select e.org_id
    into v_org_id
  from public.events e
  where e.id = v_event_id;

  if v_org_id is null then
    raise exception 'NOT_FOUND';
  end if;

  if not public.is_org_member(v_org_id) then
    raise exception 'FORBIDDEN';
  end if;

  if v_group_id is not null then
    if not exists (
      select 1
      from public.event_form_field_groups g
      where g.id = v_group_id
        and g.event_id = v_event_id
    ) then
      raise exception 'VALIDATION_ERROR: group_id invalid';
    end if;
  end if;

  perform public.assert_rate_limit(
    'create_form_field:event:' || v_event_id::text,
    60,
    3600
  );

  perform public.assert_can_add_form_field(v_org_id, v_event_id);

  if v_sort_order is null then
    select coalesce(max(f.sort_order), 0) + 1
      into v_sort_order
    from public.event_form_fields f
    where f.event_id = v_event_id;
  end if;

  if exists (
    select 1
    from public.event_form_fields f
    where f.event_id = v_event_id
      and f.field_key = v_field_key
  ) then
    raise exception 'CONFLICT: field_key already exists';
  end if;

  v_new_id := gen_random_uuid();

  insert into public.event_form_fields (
    id,
    event_id,
    group_id,
    label,
    field_key,
    field_type,
    is_required,
    options,
    sort_order,
    is_active,
    created_at,
    updated_at
  ) values (
    v_new_id,
    v_event_id,
    v_group_id,
    v_label,
    v_field_key,
    v_field_type,
    v_is_required,
    v_options,
    v_sort_order,
    v_is_active,
    v_now,
    v_now
  );

  return jsonb_build_object(
    'id', v_new_id,
    'eventId', v_event_id,
    'groupId', v_group_id,
    'label', v_label,
    'fieldKey', v_field_key,
    'fieldType', v_field_type,
    'isRequired', v_is_required,
    'options', v_options,
    'sortOrder', v_sort_order,
    'isActive', v_is_active,
    'createdAt', v_now,
    'updatedAt', v_now
  );

exception
  when unique_violation then
    raise exception 'CONFLICT';
end;
$$;

revoke all on function public.create_event_form_field(jsonb) from public;
revoke all on function public.create_event_form_field(jsonb) from anon;
revoke all on function public.create_event_form_field(jsonb) from authenticated;

grant execute on function public.create_event_form_field(jsonb) to authenticated;