-- =========================================================
-- public.get_public_event_detail(text, text)
-- - ajoute description dans form_fields_groups
-- - security definer
-- - search_path verrouillé
-- - grants/revokes propres
-- =========================================================

create or replace function public.get_public_event_detail(
  p_org_slug text,
  p_event_slug text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_org_slug text := nullif(trim(p_org_slug), '');
  v_event_slug text := nullif(trim(p_event_slug), '');
  v_org_id uuid;
  v_event_id uuid;

  v_org_profile jsonb;
  v_event jsonb;
  v_products jsonb;
  v_fields jsonb;
  v_field_groups jsonb;

  v_org_display_name text;
  v_org_primary_color text;
  v_default_primary_color text := '#e49d21';

  -- defaults globaux (storage public)
  v_default_logo_url text := 'https://dixirvllhfkvqoahhfqh.supabase.co/storage/v1/object/public/public-assets/defaults/default_logo.webp';
  v_default_banner_url text := 'https://dixirvllhfkvqoahhfqh.supabase.co/storage/v1/object/public/public-assets/defaults/default_banner.webp';

  v_org_logo_url text;
  v_org_default_banner_url text;
begin
  perform set_config('search_path', 'pg_temp, public, extensions, private', true);

  if v_org_slug is null or v_event_slug is null then
    raise exception 'VALIDATION_ERROR: org_slug and event_slug are required';
  end if;

  perform public.assert_rate_limit(
    'anon:event_detail:' || v_org_slug || ':' || v_event_slug,
    240,
    60
  );

  -- org id + branding (logo + default banner)
  select
    op.org_id,
    nullif(trim(op.logo_url), ''),
    nullif(trim(op.default_event_banner_url), ''),
    nullif(trim(op.display_name), ''),
    nullif(trim(op.primary_color), '')
  into
    v_org_id,
    v_org_logo_url,
    v_org_default_banner_url,
    v_org_display_name,
    v_org_primary_color
  from public.organization_profile op
  where op.slug = v_org_slug
  limit 1;

  if v_org_id is null then
    raise exception 'NOT_FOUND';
  end if;

  -- event id (published only)
  select e.id
  into v_event_id
  from public.events e
  where e.org_id = v_org_id
    and e.slug = v_event_slug
    and e.is_published = true
  limit 1;

  if v_event_id is null then
    raise exception 'NOT_FOUND';
  end if;

  -- org profile returned (public-safe)
  select jsonb_build_object(
    'slug', v_org_slug,
    'display_name', v_org_display_name,
    'primary_color', coalesce(v_org_primary_color, v_default_primary_color),
    'logo_url', coalesce(v_org_logo_url, v_default_logo_url),
    'default_event_banner_url', coalesce(v_org_default_banner_url, v_default_banner_url)
  )
  into v_org_profile;

  -- event (banner resolved with fallback)
  select jsonb_build_object(
    'id', e.id,
    'slug', e.slug,
    'title', e.title,
    'description', e.description,
    'location', e.location,
    'banner_url', coalesce(
      nullif(trim(e.banner_url), ''),
      v_org_default_banner_url,
      v_default_banner_url
    ),
    'starts_at', e.starts_at,
    'ends_at', e.ends_at,
    'deposit_cents', e.deposit_cents,
    'max_attendees', e.max_attendees,
    'registration_deadline', e.registration_deadline,
    'is_sold_out', public.is_event_sold_out(e.id),
    'is_registration_open', public.is_event_registration_open(e.id)
  )
  into v_event
  from public.events e
  where e.id = v_event_id;

  -- products
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ep.id,
        'name', ep.name,
        'description', ep.description,
        'price_cents', ep.price_cents,
        'currency', ep.currency,
        'stock_qty', ep.stock_qty,
        'sold_qty', ep.sold_qty,
        'reserved_qty', ep.reserved_qty,
        'creates_attendees', ep.creates_attendees,
        'attendees_per_unit', ep.attendees_per_unit,
        'sort_order', ep.sort_order
      )
      order by ep.sort_order asc, ep.created_at asc
    ),
    '[]'::jsonb
  )
  into v_products
  from public.event_products ep
  where ep.event_id = v_event_id
    and ep.is_active = true;

  -- field groups
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ffg.id,
        'label', ffg.label,
        'description', ffg.description,
        'sort_order', ffg.sort_order
      )
      order by ffg.sort_order asc, ffg.created_at asc
    ),
    '[]'::jsonb
  )
  into v_field_groups
  from public.event_form_field_groups ffg
  where ffg.event_id = v_event_id
    and ffg.is_active = true;

  -- fields
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ff.id,
        'label', ff.label,
        'field_key', ff.field_key,
        'field_type', ff.field_type,
        'is_required', ff.is_required,
        'options', ff.options,
        'sort_order', ff.sort_order,
        'group_id', ff.group_id
      )
      order by ff.sort_order asc, ff.created_at asc
    ),
    '[]'::jsonb
  )
  into v_fields
  from public.event_form_fields ff
  where ff.event_id = v_event_id
    and ff.is_active = true;

  return jsonb_build_object(
    'org', v_org_profile,
    'event', v_event,
    'products', v_products,
    'form_fields', v_fields,
    'form_fields_groups', v_field_groups
  );
end;
$$;

-- =========================================================
-- grants / revokes
-- =========================================================

revoke all on function public.get_public_event_detail(text, text) from public;
revoke all on function public.get_public_event_detail(text, text) from anon;
revoke all on function public.get_public_event_detail(text, text) from authenticated;

grant execute on function public.get_public_event_detail(text, text) to anon;
grant execute on function public.get_public_event_detail(text, text) to authenticated;