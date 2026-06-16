create or replace function public.create_event_form_field_group(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
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

  if length(v_label) > 100 then
    raise exception 'VALIDATION_ERROR: label too long';
  end if;

  if v_description is not null and length(v_description) > 300 then
    raise exception 'VALIDATION_ERROR: description too long';
  end if;

  if v_sort_order is not null and (v_sort_order < 0 or v_sort_order > 10000) then
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

  if v_sort_order < 0 or v_sort_order > 10000 then
    raise exception 'VALIDATION_ERROR: sort_order invalid';
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

revoke all on function public.create_event_form_field_group(jsonb)
from public;

grant execute on function public.create_event_form_field_group(jsonb)
to authenticated;