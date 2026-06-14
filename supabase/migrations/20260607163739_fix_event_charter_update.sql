create or replace function public.update_event(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $function$
declare
  v_user_id uuid := auth.uid();
  v_event_id uuid;
  v_org_id uuid;

  v_cur_title text;
  v_cur_location text;
  v_cur_description text;
  v_cur_charter_text text;
  v_cur_banner_url text;
  v_cur_starts_at timestamptz;
  v_cur_ends_at timestamptz;
  v_cur_registration_deadline timestamptz;
  v_cur_is_published boolean;
  v_cur_deposit_cents int;
  v_cur_max_attendees int;

  v_title text;
  v_location text;
  v_description text;
  v_charter_text text;
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
  v_has_charter_text boolean := false;
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
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  v_event_id := (p_input->>'event_id')::uuid;
  if v_event_id is null then
    raise exception 'VALIDATION_ERROR: event_id is required';
  end if;

  select
    e.org_id,
    e.slug,
    e.title,
    e.location,
    e.description,
    e.charter_text,
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
    v_cur_charter_text,
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

  perform 1
  from public.organization_members om
  where om.org_id = v_org_id
    and om.user_id = v_user_id
    and om.role in ('owner','admin');

  if not found then
    raise exception 'FORBIDDEN';
  end if;

  perform public.assert_rate_limit(
    'update_event:' || v_event_id::text,
    120,
    3600
  );

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

  if p_input ? 'charter_text' then
    v_has_charter_text := true;
    v_charter_text := nullif(trim(p_input->>'charter_text'), '');
    if v_charter_text is not null and length(v_charter_text) > 10000 then
      raise exception 'VALIDATION_ERROR: charter_text too long';
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

  update public.events
  set
    slug = case when v_has_title and v_title is distinct from v_cur_title then v_new_slug else slug end,
    title = coalesce(v_title, title),
    location = case when v_has_location then v_location else location end,
    description = case when v_has_description then v_description else description end,
    charter_text = case when v_has_charter_text then v_charter_text else charter_text end,
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
    'charterText', v_row.charter_text,
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
$function$;

revoke all on function public.update_event(jsonb) from public;
revoke all on function public.update_event(jsonb) from anon;
revoke all on function public.update_event(jsonb) from authenticated;

grant execute on function public.update_event(jsonb) to authenticated;