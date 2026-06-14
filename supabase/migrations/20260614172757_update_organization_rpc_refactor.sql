CREATE OR REPLACE FUNCTION public.update_organization(p_input jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
declare
  v_user_id uuid := auth.uid();

  v_org_id uuid;

  -- current
  v_cur_name text;

  -- patch values
  v_type text;
  v_name text;
  v_status text;

  v_description text;
  v_public_email text;
  v_phone text;
  v_website text;
  v_email_reminder_days_before int;

  -- payments
  v_payments_status text;
  v_payments_live_ready boolean;

  -- flags presence
  has_type boolean := false;
  has_name boolean := false;
  has_status boolean := false;

  has_description boolean := false;
  has_public_email boolean := false;
  has_phone boolean := false;
  has_website boolean := false;

  has_payments_status boolean := false;
  has_payments_live_ready boolean := false;
  has_email_reminder_days_before boolean := false;

  v_new_slug text;

  v_is_owner boolean := false;
  v_is_member boolean := false;

  v_result jsonb;
begin
  -- 1) Auth
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- 2) org_id
  v_org_id := nullif(trim(p_input->>'org_id'), '')::uuid;

  if v_org_id is null then
    raise exception 'VALIDATION_ERROR: org_id is required';
  end if;

  -- 3) Membership / Role checks
  select true into v_is_member
  from public.organization_members m
  where m.org_id = v_org_id
    and m.user_id = v_user_id
  limit 1;

  if coalesce(v_is_member, false) = false then
    raise exception 'FORBIDDEN';
  end if;

  select true into v_is_owner
  from public.organization_members m
  where m.org_id = v_org_id
    and m.user_id = v_user_id
    and m.role in ('owner', 'admin')
  limit 1;

  -- 4) Rate limit
  perform private.assert_rate_limit(
    'update_org:user:' || v_user_id::text || ':org:' || v_org_id::text,
    60,
    60
  );

  -- 5) Load current
  select o.name into v_cur_name
  from public.organizations o
  where o.id = v_org_id
  limit 1;

  if v_cur_name is null then
    raise exception 'NOT_FOUND';
  end if;

  -- 6) Parse patch + mark present
  if p_input ? 'type' then
    has_type := true;
    v_type := nullif(trim(p_input->>'type'), '');
  end if;

  if p_input ? 'name' then
    has_name := true;
    v_name := nullif(trim(p_input->>'name'), '');
  end if;

  if p_input ? 'status' then
    has_status := true;
    v_status := nullif(trim(p_input->>'status'), '');
  end if;

  if p_input ? 'description' then
    has_description := true;
    v_description := nullif(trim(p_input->>'description'), '');
  end if;

  if p_input ? 'public_email' then
    has_public_email := true;
    v_public_email := nullif(trim(p_input->>'public_email'), '');
  end if;

  if p_input ? 'phone' then
    has_phone := true;
    v_phone := nullif(trim(p_input->>'phone'), '');
  end if;

  if p_input ? 'website' then
    has_website := true;
    v_website := nullif(trim(p_input->>'website'), '');
  end if;

  if p_input ? 'payment_status' then
    has_payments_status := true;
    v_payments_status := nullif(trim(p_input->>'payment_status'), '');
  end if;

  if p_input ? 'payments_live_ready' then
    has_payments_live_ready := true;
    v_payments_live_ready := (p_input->>'payments_live_ready')::boolean;
  end if;

  if p_input ? 'email_reminder_days_before' then
    has_email_reminder_days_before := true;

    if nullif(trim(p_input->>'email_reminder_days_before'), '') is null then
      v_email_reminder_days_before := null;
    else
      v_email_reminder_days_before := (p_input->>'email_reminder_days_before')::int;
    end if;
  end if;

  -- 7) Validations
  if (
    has_type
    or has_name
    or has_status
    or has_payments_status
    or has_payments_live_ready
  )
  and coalesce(v_is_owner, false) = false then
    raise exception 'FORBIDDEN';
  end if;

  if has_type then
    if v_type is null then
      raise exception 'VALIDATION_ERROR: type cannot be empty';
    end if;

    if v_type not in ('association', 'person') then
      raise exception 'VALIDATION_ERROR: invalid type';
    end if;
  end if;

  if has_name then
    if v_name is null then
      raise exception 'VALIDATION_ERROR: name cannot be empty';
    end if;

    if length(v_name) < 3 then
      raise exception 'VALIDATION_ERROR: name too short';
    end if;

    if length(v_name) > 120 then
      raise exception 'VALIDATION_ERROR: name too long';
    end if;
  end if;

  if has_status then
    if v_status is null then
      raise exception 'VALIDATION_ERROR: status cannot be empty';
    end if;

    if v_status not in ('active', 'suspended') then
      raise exception 'VALIDATION_ERROR: invalid status';
    end if;
  end if;

  if has_description and v_description is not null and length(v_description) > 1000 then
    raise exception 'VALIDATION_ERROR: description too long';
  end if;

  if has_public_email and v_public_email is not null and length(v_public_email) > 254 then
    raise exception 'VALIDATION_ERROR: public_email too long';
  end if;

  if has_phone and v_phone is not null then
    if length(v_phone) < 3 then
      raise exception 'VALIDATION_ERROR: phone too short';
    end if;

    if length(v_phone) > 32 then
      raise exception 'VALIDATION_ERROR: phone too long';
    end if;
  end if;

  if has_website and v_website is not null then
    if length(v_website) < 5 then
      raise exception 'VALIDATION_ERROR: website too short';
    end if;

    if length(v_website) > 2048 then
      raise exception 'VALIDATION_ERROR: website too long';
    end if;
  end if;

  if has_payments_status then
    if v_payments_status is null then
      raise exception 'VALIDATION_ERROR: payment_status cannot be empty';
    end if;

    if v_payments_status not in ('not_connected', 'pending', 'connected', 'revoked') then
      raise exception 'VALIDATION_ERROR: invalid payment_status';
    end if;
  end if;

  if has_email_reminder_days_before
    and v_email_reminder_days_before is not null
    and v_email_reminder_days_before < 0 then
    raise exception 'VALIDATION_ERROR: email_reminder_days_before must be >= 0';
  end if;

  -- 8) Update organizations
  if has_type or has_name or has_status or has_payments_status or has_payments_live_ready then
    update public.organizations o
    set
      type = case when has_type then v_type else o.type end,
      name = case when has_name then v_name else o.name end,
      status = case when has_status then v_status else o.status end,
      payments_status = case when has_payments_status then v_payments_status else o.payments_status end,
      payments_live_ready = case when has_payments_live_ready then v_payments_live_ready else o.payments_live_ready end,
      updated_at = now()
    where o.id = v_org_id;
  end if;

  -- 9) Slug recalculation
  if has_name and v_name is distinct from v_cur_name then
    v_new_slug := private.generate_unique_org_slug(v_name);
    perform set_config('app.allow_org_profile_slug_change', 'on', true);
  end if;

  -- 10) Update organization_profile
  if has_name
    or has_description
    or has_public_email
    or has_phone
    or has_website
    or has_email_reminder_days_before then

    update public.organization_profile op
    set
      slug = case
        when has_name and v_name is distinct from v_cur_name then v_new_slug
        else op.slug
      end,

      display_name = case
        when has_name then v_name
        else op.display_name
      end,

      description = case
        when has_description then v_description
        else op.description
      end,

      public_email = case
        when has_public_email then v_public_email
        else op.public_email
      end,

      phone = case
        when has_phone then v_phone
        else op.phone
      end,

      website = case
        when has_website then v_website
        else op.website
      end,

      email_reminder_days_before = case
        when has_email_reminder_days_before then v_email_reminder_days_before
        else op.email_reminder_days_before
      end,

      updated_at = now()
    where op.org_id = v_org_id;
  end if;

  -- 11) Return payload
  select jsonb_build_object(
    'orgId', o.id,
    'type', o.type,
    'name', o.name,
    'status', o.status,
    'paymentStatus', o.payments_status,
    'paymentsLiveReady', o.payments_live_ready,
    'profile', jsonb_build_object(
      'slug', op.slug,
      'displayName', op.display_name,
      'description', op.description,
      'publicEmail', op.public_email,
      'phone', op.phone,
      'website', op.website,
      'emailReminderDaysBefore', op.email_reminder_days_before
    )
  )
  into v_result
  from public.organizations o
  join public.organization_profile op on op.org_id = o.id
  where o.id = v_org_id;

  return v_result;

exception
  when unique_violation then
    raise exception 'CONFLICT';

  when invalid_text_representation then
    raise exception 'VALIDATION_ERROR: invalid input format';

  when invalid_parameter_value then
    raise exception 'VALIDATION_ERROR: invalid input value';
end;
$$;

REVOKE ALL ON FUNCTION public.update_organization(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_organization(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.update_organization(jsonb) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.update_organization(jsonb) TO authenticated;