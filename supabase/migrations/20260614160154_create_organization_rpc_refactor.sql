create or replace function public.create_organization(
  p_input jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;

  v_type text;
  v_name text;
  v_slug text;
begin
  -- ---------------------------------------------------------------------------
  -- Auth
  -- ---------------------------------------------------------------------------

  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- ---------------------------------------------------------------------------
  -- Rate limit
  -- ---------------------------------------------------------------------------

  perform public.assert_rate_limit(
    'create_org:user:' || v_user_id::text,
    3,
    3600
  );

  -- ---------------------------------------------------------------------------
  -- Input parsing
  -- ---------------------------------------------------------------------------

  v_type := nullif(trim(p_input->>'type'), '');
  v_name := nullif(trim(p_input->>'name'), '');

  -- ---------------------------------------------------------------------------
  -- Validation
  -- ---------------------------------------------------------------------------

  if v_type is null then
    raise exception 'VALIDATION_ERROR: type is required';
  end if;

  if v_type not in ('association', 'person') then
    raise exception 'VALIDATION_ERROR: invalid type';
  end if;

  if v_name is null then
    raise exception 'VALIDATION_ERROR: name is required';
  end if;

  if length(v_name) < 3 or length(v_name) > 120 then
    raise exception 'VALIDATION_ERROR: name must be between 3 and 120 characters';
  end if;

  -- ---------------------------------------------------------------------------
  -- Slug
  -- ---------------------------------------------------------------------------

  v_slug := private.generate_unique_org_slug(v_name);

  -- ---------------------------------------------------------------------------
  -- Organization
  -- ---------------------------------------------------------------------------

  insert into public.organizations (
    type,
    name,
    created_by
  )
  values (
    v_type,
    v_name,
    v_user_id
  )
  returning id into v_org_id;

  -- ---------------------------------------------------------------------------
  -- Owner membership
  -- ---------------------------------------------------------------------------

  insert into public.organization_members (
    org_id,
    user_id,
    role
  )
  values (
    v_org_id,
    v_user_id,
    'owner'
  );

  -- ---------------------------------------------------------------------------
  -- Public profile
  -- ---------------------------------------------------------------------------

  insert into public.organization_profile (
    org_id,
    slug,
    display_name
  )
  values (
    v_org_id,
    v_slug,
    v_name
  );

  return v_org_id;

exception
  when unique_violation then
    raise exception 'CONFLICT';
end;
$$;

revoke all on function public.create_organization(jsonb) from public;
revoke all on function public.create_organization(jsonb) from anon;

grant execute on function public.create_organization(jsonb) to authenticated;