insert into plan_limits (
  plan,
  max_events_per_year,
  max_registrations_per_event,
  max_products_per_event,
  max_form_fields,
  max_admins,
  branding_required,
  custom_domain_allowed,
  api_access,
  advanced_analytics,
  promo_codes,
  automated_emails
) values (
  'free',
  1,
  50,
  10,
  100,
  1,
  true,
  false,
  false,
  false,
  false,
  false
)
on conflict (plan) do update set
  max_events_per_year = excluded.max_events_per_year,
  max_registrations_per_event = excluded.max_registrations_per_event,
  max_products_per_event = excluded.max_products_per_event,
  max_form_fields = excluded.max_form_fields,
  max_admins = excluded.max_admins,
  branding_required = excluded.branding_required,
  custom_domain_allowed = excluded.custom_domain_allowed,
  api_access = excluded.api_access,
  advanced_analytics = excluded.advanced_analytics,
  promo_codes = excluded.promo_codes,
  automated_emails = excluded.automated_emails;