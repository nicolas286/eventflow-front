create extension if not exists "pg_cron" with schema "pg_catalog";

create schema if not exists "private";

create extension if not exists "unaccent" with schema "public";

create type "public"."invoice_peppol_status" as enum ('not_sent', 'queued', 'sending', 'sent', 'accepted', 'rejected', 'failed');

create type "public"."invoice_status" as enum ('draft', 'issued', 'paid', 'void');

create sequence "public"."invoice_number_seq";


  create table "private"."mollie_connect_states" (
    "state" text not null,
    "org_id" uuid not null,
    "user_id" uuid not null,
    "expires_at" timestamp with time zone not null,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "mode" text not null default 'test'::text,
    "return_base_url" text
      );


alter table "private"."mollie_connect_states" enable row level security;


  create table "private"."organization_mollie_connect" (
    "org_id" uuid not null,
    "status" text not null default 'pending'::text,
    "mode" text not null default 'test'::text,
    "access_token_expires_at" timestamp with time zone,
    "scopes" text,
    "mollie_organization_id" text,
    "mollie_profile_id" text,
    "connected_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "access_token_enc" text,
    "refresh_token_enc" text,
    "enc_kid" text,
    "enc_alg" text
      );


alter table "private"."organization_mollie_connect" enable row level security;


  create table "private"."rate_limit_hits" (
    "key" text not null,
    "window_start" timestamp with time zone not null,
    "hits" integer not null default 1,
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."allowed_return_origins" (
    "origin" text not null,
    "is_enabled" boolean not null default true,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."allowed_return_origins" enable row level security;


  create table "public"."event_form_field_groups" (
    "id" uuid not null default gen_random_uuid(),
    "event_id" uuid not null,
    "label" text not null,
    "sort_order" integer not null default 0,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."event_form_field_groups" enable row level security;


  create table "public"."event_form_fields" (
    "id" uuid not null default gen_random_uuid(),
    "event_id" uuid not null,
    "label" text not null,
    "field_key" text not null,
    "field_type" text not null,
    "is_required" boolean not null default false,
    "options" jsonb,
    "sort_order" integer not null default 0,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "group_id" uuid
      );


alter table "public"."event_form_fields" enable row level security;


  create table "public"."event_products" (
    "id" uuid not null default gen_random_uuid(),
    "event_id" uuid not null,
    "name" text not null,
    "description" text,
    "price_cents" integer not null,
    "currency" text not null default 'EUR'::text,
    "stock_qty" integer,
    "is_active" boolean not null default true,
    "sort_order" integer not null default 0,
    "creates_attendees" boolean not null default false,
    "attendees_per_unit" integer default 1,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "reserved_qty" integer not null default 0,
    "sold_qty" integer not null default 0,
    "is_gatekeeper" boolean not null default false,
    "close_event_when_sold_out" boolean not null default false
      );


alter table "public"."event_products" enable row level security;


  create table "public"."events" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "slug" text not null,
    "title" text not null,
    "description" text,
    "banner_url" text,
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "is_published" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "deposit_cents" integer,
    "location" text,
    "max_attendees" integer
      );


alter table "public"."events" enable row level security;


  create table "public"."invoice_peppol" (
    "invoice_id" uuid not null,
    "provider" text not null default 'billit'::text,
    "status" public.invoice_peppol_status not null default 'not_sent'::public.invoice_peppol_status,
    "provider_invoice_id" text,
    "provider_message_id" text,
    "sent_at" timestamp with time zone,
    "last_status_at" timestamp with time zone,
    "attempt_count" integer not null default 0,
    "error_code" text,
    "error_message" text,
    "payload_hash" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."invoice_peppol" enable row level security;


  create table "public"."invoices" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "number" text not null,
    "status" public.invoice_status not null default 'draft'::public.invoice_status,
    "issued_at" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "period_start" timestamp with time zone,
    "period_end" timestamp with time zone,
    "currency" character(3) not null default 'EUR'::bpchar,
    "subtotal_cents" integer not null default 0,
    "vat_cents" integer not null default 0,
    "total_cents" integer not null default 0,
    "vat_rate" numeric(6,4) default '0'::numeric,
    "billing_snapshot" jsonb not null default '{}'::jsonb,
    "provider" text,
    "mollie_payment_id" text,
    "mollie_subscription_id" text,
    "pdf_path" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."invoices" enable row level security;


  create table "public"."order_attendee_answers" (
    "id" uuid not null default gen_random_uuid(),
    "attendee_id" uuid not null,
    "field_key_snapshot" text not null,
    "field_label_snapshot" text not null,
    "field_type_snapshot" text not null,
    "value" jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."order_attendee_answers" enable row level security;


  create table "public"."order_attendees" (
    "id" uuid not null default gen_random_uuid(),
    "order_id" uuid not null,
    "product_id" uuid,
    "product_name_snapshot" text not null,
    "attendee_index" integer not null,
    "created_at" timestamp with time zone not null default now(),
    "status" text not null default 'reserved'::text,
    "confirmed_at" timestamp with time zone,
    "canceled_at" timestamp with time zone,
    "details_completed_at" timestamp with time zone
      );


alter table "public"."order_attendees" enable row level security;


  create table "public"."order_email_logs" (
    "id" uuid not null default gen_random_uuid(),
    "order_id" uuid not null,
    "kind" text not null,
    "sent_at" timestamp with time zone not null default now()
      );


alter table "public"."order_email_logs" enable row level security;


  create table "public"."order_items" (
    "id" uuid not null default gen_random_uuid(),
    "order_id" uuid not null,
    "product_id" uuid,
    "product_name_snapshot" text not null,
    "unit_price_cents_snapshot" integer not null,
    "quantity" integer not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."order_items" enable row level security;


  create table "public"."orders" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "event_id" uuid not null,
    "currency" text not null default 'EUR'::text,
    "total_cents" integer not null,
    "paid_cents" integer not null default 0,
    "buyer_email" text,
    "buyer_name" text,
    "booking_token" text not null,
    "canceled_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "status" text not null default 'pending'::text,
    "expires_at" timestamp with time zone,
    "confirmed_at" timestamp with time zone,
    "details_completed_at" timestamp with time zone,
    "deposit_due_cents_snapshot" integer not null default 0,
    "buyer_phone" text,
    "buyer_is_attendee" boolean not null default false,
    "confirmation_email_sent_at" timestamp with time zone,
    "confirmation_email_claimed_at" timestamp with time zone,
    "confirmation_email_error" text
      );


alter table "public"."orders" enable row level security;


  create table "public"."organization_billing" (
    "org_id" uuid not null,
    "legal_name" text not null,
    "vat_country_code" text,
    "vat_number" text,
    "address_line1" text not null,
    "address_line2" text,
    "postal_code" text not null,
    "city" text not null,
    "country_code" text not null,
    "billing_email" text,
    "invoice_reference" text,
    "is_vat_validated" boolean not null default false,
    "vat_validated_at" timestamp with time zone,
    "vat_validation_source" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."organization_billing" enable row level security;


  create table "public"."organization_members" (
    "org_id" uuid not null,
    "user_id" uuid not null,
    "role" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."organization_members" enable row level security;


  create table "public"."organization_profile" (
    "org_id" uuid not null,
    "slug" text not null,
    "display_name" text not null,
    "description" text,
    "public_email" text,
    "phone" text,
    "website" text,
    "logo_url" text default 'https://dixirvllhfkvqoahhfqh.supabase.co/storage/v1/object/public/public-assets/defaults/default_logo.webp'::text,
    "primary_color" text not null default '#3b82f6'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "default_event_banner_url" text default 'https://dixirvllhfkvqoahhfqh.supabase.co/storage/v1/object/public/public-assets/defaults/default_banner.webp'::text,
    "email_reminder_days_before" smallint default 3,
    "widget_bg" text default '#0f172a'::text,
    "widget_card" text default '#1e293b'::text,
    "widget_text" text default '#ffffff'::text,
    "widget_button" text default '#2563eb'::text
      );


alter table "public"."organization_profile" enable row level security;


  create table "public"."organizations" (
    "id" uuid not null default gen_random_uuid(),
    "type" text not null,
    "name" text not null,
    "status" text not null default '''active''::text'::text,
    "created_at" timestamp with time zone not null default now(),
    "created_by" uuid,
    "payments_provider" text not null default 'mollie'::text,
    "payments_status" text not null default 'not_connected'::text,
    "payments_live_ready" boolean not null default false,
    "plan" text not null default 'free'::text,
    "plan_started_at" timestamp with time zone not null default now(),
    "plan_expires_at" timestamp with time zone,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."organizations" enable row level security;


  create table "public"."payments" (
    "id" uuid not null default gen_random_uuid(),
    "order_id" uuid not null,
    "provider" text not null default 'mollie'::text,
    "provider_payment_id" text not null,
    "amount_cents" integer not null,
    "currency" text not null default 'EUR'::text,
    "status" text not null,
    "is_refund" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "processed_at" timestamp with time zone,
    "raw" jsonb,
    "type" text not null default 'payment'::text,
    "parent_payment_id" uuid
      );


alter table "public"."payments" enable row level security;


  create table "public"."plan_limits" (
    "plan" text not null,
    "max_events_per_year" integer,
    "max_registrations_per_event" integer,
    "max_products_per_event" integer,
    "max_form_fields" integer,
    "max_admins" integer,
    "branding_required" boolean not null,
    "custom_domain_allowed" boolean not null,
    "api_access" boolean not null,
    "advanced_analytics" boolean not null,
    "promo_codes" boolean not null,
    "automated_emails" boolean not null
      );


alter table "public"."plan_limits" enable row level security;


  create table "public"."subscriptions" (
    "org_id" uuid not null,
    "provider" text not null default 'mollie'::text,
    "mollie_customer_id" text,
    "mollie_subscription_id" text,
    "status" text not null default 'inactive'::text,
    "current_period_end" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "plan" text,
    "promo_code" text,
    "discount_percent" integer,
    "billing_price_value" text,
    "billing_currency" text default 'EUR'::text
      );


alter table "public"."subscriptions" enable row level security;


  create table "public"."tickets" (
    "id" uuid not null default gen_random_uuid(),
    "order_id" uuid not null,
    "order_item_id" uuid not null,
    "event_id" uuid not null,
    "product_id" uuid not null,
    "ticket_index" integer not null,
    "qr_token" text not null,
    "admits_count" integer not null default 1,
    "status" text not null default 'valid'::text,
    "checked_in_at" timestamp with time zone,
    "checked_in_by" uuid,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."tickets" enable row level security;


  create table "public"."user_profile" (
    "user_id" uuid not null,
    "first_name" text,
    "last_name" text,
    "phone" text,
    "address_line1" text,
    "address_line2" text,
    "postal_code" text,
    "city" text,
    "country_code" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."user_profile" enable row level security;

CREATE INDEX idx_mollie_connect_states_expires_at ON private.mollie_connect_states USING btree (expires_at);

CREATE INDEX idx_mollie_connect_states_org_id ON private.mollie_connect_states USING btree (org_id);

CREATE INDEX idx_mollie_connect_states_user_id ON private.mollie_connect_states USING btree (user_id);

CREATE INDEX idx_org_mollie_connect_org_id ON private.organization_mollie_connect USING btree (org_id);

CREATE UNIQUE INDEX mollie_connect_states_pkey ON private.mollie_connect_states USING btree (state);

CREATE UNIQUE INDEX organization_mollie_connect_pkey ON private.organization_mollie_connect USING btree (org_id);

CREATE UNIQUE INDEX rate_limit_hits_pkey ON private.rate_limit_hits USING btree (key, window_start);

CREATE INDEX rate_limit_hits_updated_at_idx ON private.rate_limit_hits USING btree (updated_at);

CREATE UNIQUE INDEX allowed_return_origins_pkey ON public.allowed_return_origins USING btree (origin);

CREATE UNIQUE INDEX event_form_field_groups_pkey ON public.event_form_field_groups USING btree (id);

CREATE UNIQUE INDEX event_form_fields_event_id_field_key_key ON public.event_form_fields USING btree (event_id, field_key);

CREATE UNIQUE INDEX event_form_fields_pkey ON public.event_form_fields USING btree (id);

CREATE UNIQUE INDEX event_products_pkey ON public.event_products USING btree (id);

CREATE UNIQUE INDEX events_org_id_slug_key ON public.events USING btree (org_id, slug);

CREATE UNIQUE INDEX events_org_id_slug_uidx ON public.events USING btree (org_id, slug);

CREATE UNIQUE INDEX events_pkey ON public.events USING btree (id);

CREATE INDEX idx_event_form_field_groups_event_id ON public.event_form_field_groups USING btree (event_id);

CREATE INDEX idx_event_form_field_groups_event_sort ON public.event_form_field_groups USING btree (event_id, sort_order);

CREATE INDEX idx_event_form_fields_event_group_sort ON public.event_form_fields USING btree (event_id, group_id, sort_order);

CREATE INDEX idx_event_form_fields_event_id ON public.event_form_fields USING btree (event_id);

CREATE INDEX idx_event_form_fields_event_id_sort ON public.event_form_fields USING btree (event_id, sort_order);

CREATE INDEX idx_event_form_fields_group_id ON public.event_form_fields USING btree (group_id);

CREATE INDEX idx_event_products_event_id ON public.event_products USING btree (event_id);

CREATE INDEX idx_events_is_published ON public.events USING btree (is_published);

CREATE INDEX idx_events_org_id ON public.events USING btree (org_id);

CREATE INDEX idx_events_org_id_starts_at ON public.events USING btree (org_id, starts_at);

CREATE INDEX idx_order_attendee_answers_attendee_id ON public.order_attendee_answers USING btree (attendee_id);

CREATE INDEX idx_order_attendees_order_id ON public.order_attendees USING btree (order_id);

CREATE INDEX idx_order_attendees_status ON public.order_attendees USING btree (status);

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);

CREATE INDEX idx_orders_booking_token ON public.orders USING btree (booking_token);

CREATE INDEX idx_orders_event_id_created_at ON public.orders USING btree (event_id, created_at);

CREATE INDEX idx_orders_expires_at ON public.orders USING btree (expires_at) WHERE (expires_at IS NOT NULL);

CREATE INDEX idx_orders_org_id_created_at ON public.orders USING btree (org_id, created_at);

CREATE INDEX idx_orders_status ON public.orders USING btree (status);

CREATE INDEX idx_org_members_user_id ON public.organization_members USING btree (user_id);

CREATE INDEX idx_organizations_created_by ON public.organizations USING btree (created_by);

CREATE INDEX idx_organizations_payments_status ON public.organizations USING btree (payments_status);

CREATE INDEX idx_payments_order_id ON public.payments USING btree (order_id);

CREATE INDEX idx_payments_processed_at ON public.payments USING btree (processed_at);

CREATE INDEX idx_payments_status ON public.payments USING btree (status);

CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);

CREATE INDEX idx_tickets_event ON public.tickets USING btree (event_id);

CREATE INDEX idx_tickets_order ON public.tickets USING btree (order_id);

CREATE INDEX idx_tickets_order_item ON public.tickets USING btree (order_item_id);

CREATE INDEX idx_tickets_qr_token ON public.tickets USING btree (qr_token);

CREATE INDEX invoice_peppol_last_status_at_idx ON public.invoice_peppol USING btree (last_status_at DESC);

CREATE UNIQUE INDEX invoice_peppol_pkey ON public.invoice_peppol USING btree (invoice_id);

CREATE UNIQUE INDEX invoice_peppol_provider_invoice_id_uniq ON public.invoice_peppol USING btree (provider_invoice_id) WHERE (provider_invoice_id IS NOT NULL);

CREATE UNIQUE INDEX invoice_peppol_provider_message_id_uniq ON public.invoice_peppol USING btree (provider_message_id) WHERE (provider_message_id IS NOT NULL);

CREATE INDEX invoice_peppol_status_idx ON public.invoice_peppol USING btree (status);

CREATE INDEX invoices_mollie_payment_id_idx ON public.invoices USING btree (mollie_payment_id);

CREATE UNIQUE INDEX invoices_mollie_payment_id_uk ON public.invoices USING btree (mollie_payment_id);

CREATE UNIQUE INDEX invoices_mollie_payment_id_unique ON public.invoices USING btree (mollie_payment_id) WHERE (mollie_payment_id IS NOT NULL);

CREATE INDEX invoices_mollie_subscription_id_idx ON public.invoices USING btree (mollie_subscription_id);

CREATE UNIQUE INDEX invoices_number_unique ON public.invoices USING btree (number);

CREATE INDEX invoices_org_id_idx ON public.invoices USING btree (org_id);

CREATE INDEX invoices_org_status_issued_at_idx ON public.invoices USING btree (org_id, status, issued_at DESC);

CREATE UNIQUE INDEX invoices_pkey ON public.invoices USING btree (id);

CREATE UNIQUE INDEX order_attendee_answers_attendee_id_field_key_snapshot_key ON public.order_attendee_answers USING btree (attendee_id, field_key_snapshot);

CREATE UNIQUE INDEX order_attendee_answers_pkey ON public.order_attendee_answers USING btree (id);

CREATE UNIQUE INDEX order_attendee_answers_unique ON public.order_attendee_answers USING btree (attendee_id, field_key_snapshot);

CREATE UNIQUE INDEX order_attendees_order_id_attendee_index_key ON public.order_attendees USING btree (order_id, attendee_index);

CREATE UNIQUE INDEX order_attendees_pkey ON public.order_attendees USING btree (id);

CREATE UNIQUE INDEX order_email_logs_pkey ON public.order_email_logs USING btree (id);

CREATE UNIQUE INDEX order_email_logs_unique ON public.order_email_logs USING btree (order_id, kind);

CREATE UNIQUE INDEX order_items_pkey ON public.order_items USING btree (id);

CREATE UNIQUE INDEX orders_booking_token_key ON public.orders USING btree (booking_token);

CREATE INDEX orders_buyer_phone_idx ON public.orders USING btree (buyer_phone);

CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id);

CREATE INDEX organization_billing_country_code_idx ON public.organization_billing USING btree (country_code);

CREATE UNIQUE INDEX organization_billing_pkey ON public.organization_billing USING btree (org_id);

CREATE UNIQUE INDEX organization_members_pkey ON public.organization_members USING btree (org_id, user_id);

CREATE UNIQUE INDEX organization_profile_org_unique ON public.organization_profile USING btree (org_id);

CREATE UNIQUE INDEX organization_profile_pkey ON public.organization_profile USING btree (org_id);

CREATE UNIQUE INDEX organization_profile_slug_key ON public.organization_profile USING btree (slug);

CREATE UNIQUE INDEX organizations_one_per_creator ON public.organizations USING btree (created_by);

CREATE UNIQUE INDEX organizations_pkey ON public.organizations USING btree (id);

CREATE UNIQUE INDEX payments_pkey ON public.payments USING btree (id);

CREATE UNIQUE INDEX payments_provider_payment_id_unique_payment ON public.payments USING btree (provider, provider_payment_id) WHERE ((provider_payment_id IS NOT NULL) AND (type = 'payment'::text));

CREATE UNIQUE INDEX payments_provider_payment_uidx ON public.payments USING btree (provider, provider_payment_id) WHERE (provider_payment_id IS NOT NULL);

CREATE UNIQUE INDEX plan_limits_pkey ON public.plan_limits USING btree (plan);

CREATE INDEX subscriptions_mollie_subscription_id_idx ON public.subscriptions USING btree (mollie_subscription_id);

CREATE INDEX subscriptions_org_id_idx ON public.subscriptions USING btree (org_id);

CREATE UNIQUE INDEX subscriptions_org_unique ON public.subscriptions USING btree (org_id);

CREATE UNIQUE INDEX subscriptions_pkey ON public.subscriptions USING btree (org_id);

CREATE INDEX subscriptions_status_idx ON public.subscriptions USING btree (status);

CREATE UNIQUE INDEX tickets_pkey ON public.tickets USING btree (id);

CREATE UNIQUE INDEX tickets_qr_token_key ON public.tickets USING btree (qr_token);

CREATE UNIQUE INDEX tickets_unique_per_item ON public.tickets USING btree (order_item_id, ticket_index);

CREATE UNIQUE INDEX uq_event_products_event_id_name ON public.event_products USING btree (event_id, name);

CREATE UNIQUE INDEX user_profile_pkey ON public.user_profile USING btree (user_id);

CREATE UNIQUE INDEX ux_payments_provider_provider_payment_id ON public.payments USING btree (provider, provider_payment_id) WHERE (provider_payment_id IS NOT NULL);

alter table "private"."mollie_connect_states" add constraint "mollie_connect_states_pkey" PRIMARY KEY using index "mollie_connect_states_pkey";

alter table "private"."organization_mollie_connect" add constraint "organization_mollie_connect_pkey" PRIMARY KEY using index "organization_mollie_connect_pkey";

alter table "private"."rate_limit_hits" add constraint "rate_limit_hits_pkey" PRIMARY KEY using index "rate_limit_hits_pkey";

alter table "public"."allowed_return_origins" add constraint "allowed_return_origins_pkey" PRIMARY KEY using index "allowed_return_origins_pkey";

alter table "public"."event_form_field_groups" add constraint "event_form_field_groups_pkey" PRIMARY KEY using index "event_form_field_groups_pkey";

alter table "public"."event_form_fields" add constraint "event_form_fields_pkey" PRIMARY KEY using index "event_form_fields_pkey";

alter table "public"."event_products" add constraint "event_products_pkey" PRIMARY KEY using index "event_products_pkey";

alter table "public"."events" add constraint "events_pkey" PRIMARY KEY using index "events_pkey";

alter table "public"."invoice_peppol" add constraint "invoice_peppol_pkey" PRIMARY KEY using index "invoice_peppol_pkey";

alter table "public"."invoices" add constraint "invoices_pkey" PRIMARY KEY using index "invoices_pkey";

alter table "public"."order_attendee_answers" add constraint "order_attendee_answers_pkey" PRIMARY KEY using index "order_attendee_answers_pkey";

alter table "public"."order_attendees" add constraint "order_attendees_pkey" PRIMARY KEY using index "order_attendees_pkey";

alter table "public"."order_email_logs" add constraint "order_email_logs_pkey" PRIMARY KEY using index "order_email_logs_pkey";

alter table "public"."order_items" add constraint "order_items_pkey" PRIMARY KEY using index "order_items_pkey";

alter table "public"."orders" add constraint "orders_pkey" PRIMARY KEY using index "orders_pkey";

alter table "public"."organization_billing" add constraint "organization_billing_pkey" PRIMARY KEY using index "organization_billing_pkey";

alter table "public"."organization_members" add constraint "organization_members_pkey" PRIMARY KEY using index "organization_members_pkey";

alter table "public"."organization_profile" add constraint "organization_profile_pkey" PRIMARY KEY using index "organization_profile_pkey";

alter table "public"."organizations" add constraint "organizations_pkey" PRIMARY KEY using index "organizations_pkey";

alter table "public"."payments" add constraint "payments_pkey" PRIMARY KEY using index "payments_pkey";

alter table "public"."plan_limits" add constraint "plan_limits_pkey" PRIMARY KEY using index "plan_limits_pkey";

alter table "public"."subscriptions" add constraint "subscriptions_pkey" PRIMARY KEY using index "subscriptions_pkey";

alter table "public"."tickets" add constraint "tickets_pkey" PRIMARY KEY using index "tickets_pkey";

alter table "public"."user_profile" add constraint "user_profile_pkey" PRIMARY KEY using index "user_profile_pkey";

alter table "private"."mollie_connect_states" add constraint "mollie_connect_states_check" CHECK ((expires_at > created_at)) not valid;

alter table "private"."mollie_connect_states" validate constraint "mollie_connect_states_check";

alter table "private"."mollie_connect_states" add constraint "mollie_connect_states_check1" CHECK (((used_at IS NULL) OR (used_at >= created_at))) not valid;

alter table "private"."mollie_connect_states" validate constraint "mollie_connect_states_check1";

alter table "private"."mollie_connect_states" add constraint "mollie_connect_states_mode_check" CHECK ((mode = ANY (ARRAY['test'::text, 'live'::text]))) not valid;

alter table "private"."mollie_connect_states" validate constraint "mollie_connect_states_mode_check";

alter table "private"."mollie_connect_states" add constraint "mollie_connect_states_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "private"."mollie_connect_states" validate constraint "mollie_connect_states_org_id_fkey";

alter table "private"."mollie_connect_states" add constraint "mollie_connect_states_state_check" CHECK (((char_length(state) >= 16) AND (char_length(state) <= 256))) not valid;

alter table "private"."mollie_connect_states" validate constraint "mollie_connect_states_state_check";

alter table "private"."mollie_connect_states" add constraint "mollie_connect_states_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "private"."mollie_connect_states" validate constraint "mollie_connect_states_user_id_fkey";

alter table "private"."organization_mollie_connect" add constraint "organization_mollie_connect_enc_alg_chk" CHECK (((enc_alg IS NULL) OR (enc_alg = 'A256GCM'::text))) not valid;

alter table "private"."organization_mollie_connect" validate constraint "organization_mollie_connect_enc_alg_chk";

alter table "private"."organization_mollie_connect" add constraint "organization_mollie_connect_enc_fields_when_connected" CHECK (((status <> 'connected'::text) OR ((enc_kid IS NOT NULL) AND (enc_kid <> ''::text) AND (enc_alg IS NOT NULL) AND (enc_alg <> ''::text)))) not valid;

alter table "private"."organization_mollie_connect" validate constraint "organization_mollie_connect_enc_fields_when_connected";

alter table "private"."organization_mollie_connect" add constraint "organization_mollie_connect_mode_check" CHECK ((mode = ANY (ARRAY['test'::text, 'live'::text]))) not valid;

alter table "private"."organization_mollie_connect" validate constraint "organization_mollie_connect_mode_check";

alter table "private"."organization_mollie_connect" add constraint "organization_mollie_connect_mollie_organization_id_check" CHECK (((mollie_organization_id IS NULL) OR ((char_length(mollie_organization_id) >= 3) AND (char_length(mollie_organization_id) <= 100)))) not valid;

alter table "private"."organization_mollie_connect" validate constraint "organization_mollie_connect_mollie_organization_id_check";

alter table "private"."organization_mollie_connect" add constraint "organization_mollie_connect_mollie_profile_id_check" CHECK (((mollie_profile_id IS NULL) OR ((char_length(mollie_profile_id) >= 3) AND (char_length(mollie_profile_id) <= 100)))) not valid;

alter table "private"."organization_mollie_connect" validate constraint "organization_mollie_connect_mollie_profile_id_check";

alter table "private"."organization_mollie_connect" add constraint "organization_mollie_connect_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "private"."organization_mollie_connect" validate constraint "organization_mollie_connect_org_id_fkey";

alter table "private"."organization_mollie_connect" add constraint "organization_mollie_connect_scopes_check" CHECK (((scopes IS NULL) OR (char_length(scopes) <= 2000))) not valid;

alter table "private"."organization_mollie_connect" validate constraint "organization_mollie_connect_scopes_check";

alter table "private"."organization_mollie_connect" add constraint "organization_mollie_connect_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'connected'::text, 'revoked'::text]))) not valid;

alter table "private"."organization_mollie_connect" validate constraint "organization_mollie_connect_status_check";

alter table "public"."event_form_field_groups" add constraint "event_form_field_groups_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE not valid;

alter table "public"."event_form_field_groups" validate constraint "event_form_field_groups_event_id_fkey";

alter table "public"."event_form_field_groups" add constraint "event_form_field_groups_label_not_blank" CHECK ((length(TRIM(BOTH FROM label)) >= 1)) not valid;

alter table "public"."event_form_field_groups" validate constraint "event_form_field_groups_label_not_blank";

alter table "public"."event_form_fields" add constraint "event_form_fields_event_id_field_key_key" UNIQUE using index "event_form_fields_event_id_field_key_key";

alter table "public"."event_form_fields" add constraint "event_form_fields_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE not valid;

alter table "public"."event_form_fields" validate constraint "event_form_fields_event_id_fkey";

alter table "public"."event_form_fields" add constraint "event_form_fields_field_key_check" CHECK (((char_length(field_key) >= 2) AND (char_length(field_key) <= 50))) not valid;

alter table "public"."event_form_fields" validate constraint "event_form_fields_field_key_check";

alter table "public"."event_form_fields" add constraint "event_form_fields_field_type_check" CHECK ((field_type = ANY (ARRAY['text'::text, 'textarea'::text, 'email'::text, 'number'::text, 'select'::text, 'checkbox'::text, 'radio'::text, 'date'::text, 'country'::text, 'phone'::text]))) not valid;

alter table "public"."event_form_fields" validate constraint "event_form_fields_field_type_check";

alter table "public"."event_form_fields" add constraint "event_form_fields_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public.event_form_field_groups(id) ON DELETE SET NULL not valid;

alter table "public"."event_form_fields" validate constraint "event_form_fields_group_id_fkey";

alter table "public"."event_form_fields" add constraint "event_form_fields_label_check" CHECK (((char_length(label) >= 2) AND (char_length(label) <= 120))) not valid;

alter table "public"."event_form_fields" validate constraint "event_form_fields_label_check";

alter table "public"."event_form_fields" add constraint "event_form_fields_options_check" CHECK (((options IS NULL) OR (jsonb_typeof(options) = 'array'::text))) not valid;

alter table "public"."event_form_fields" validate constraint "event_form_fields_options_check";

alter table "public"."event_form_fields" add constraint "event_form_fields_sort_order_check" CHECK (((sort_order >= 0) AND (sort_order <= 1000))) not valid;

alter table "public"."event_form_fields" validate constraint "event_form_fields_sort_order_check";

alter table "public"."event_products" add constraint "event_products_attendees_per_unit_check" CHECK (((attendees_per_unit >= 1) AND (attendees_per_unit <= 20))) not valid;

alter table "public"."event_products" validate constraint "event_products_attendees_per_unit_check";

alter table "public"."event_products" add constraint "event_products_currency_check" CHECK ((char_length(currency) = 3)) not valid;

alter table "public"."event_products" validate constraint "event_products_currency_check";

alter table "public"."event_products" add constraint "event_products_description_check" CHECK (((description IS NULL) OR (char_length(description) <= 500))) not valid;

alter table "public"."event_products" validate constraint "event_products_description_check";

alter table "public"."event_products" add constraint "event_products_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE not valid;

alter table "public"."event_products" validate constraint "event_products_event_id_fkey";

alter table "public"."event_products" add constraint "event_products_name_check" CHECK (((char_length(name) >= 2) AND (char_length(name) <= 80))) not valid;

alter table "public"."event_products" validate constraint "event_products_name_check";

alter table "public"."event_products" add constraint "event_products_price_cents_check" CHECK (((price_cents >= 0) AND (price_cents <= 10000000))) not valid;

alter table "public"."event_products" validate constraint "event_products_price_cents_check";

alter table "public"."event_products" add constraint "event_products_reserved_qty_nonneg" CHECK ((reserved_qty >= 0)) not valid;

alter table "public"."event_products" validate constraint "event_products_reserved_qty_nonneg";

alter table "public"."event_products" add constraint "event_products_sold_qty_nonneg" CHECK ((sold_qty >= 0)) not valid;

alter table "public"."event_products" validate constraint "event_products_sold_qty_nonneg";

alter table "public"."event_products" add constraint "event_products_sort_order_check" CHECK (((sort_order >= 0) AND (sort_order <= 1000))) not valid;

alter table "public"."event_products" validate constraint "event_products_sort_order_check";

alter table "public"."event_products" add constraint "event_products_stock_not_exceeded" CHECK (((reserved_qty + sold_qty) <= stock_qty)) not valid;

alter table "public"."event_products" validate constraint "event_products_stock_not_exceeded";

alter table "public"."event_products" add constraint "event_products_stock_qty_check" CHECK (((stock_qty IS NULL) OR (stock_qty >= 0))) not valid;

alter table "public"."event_products" validate constraint "event_products_stock_qty_check";

alter table "public"."event_products" add constraint "event_products_stock_qty_nonneg" CHECK ((stock_qty >= 0)) not valid;

alter table "public"."event_products" validate constraint "event_products_stock_qty_nonneg";

alter table "public"."events" add constraint "events_banner_url_check" CHECK (((banner_url IS NULL) OR ((char_length(banner_url) >= 10) AND (char_length(banner_url) <= 2048)))) not valid;

alter table "public"."events" validate constraint "events_banner_url_check";

alter table "public"."events" add constraint "events_check" CHECK ((ends_at > starts_at)) not valid;

alter table "public"."events" validate constraint "events_check";

alter table "public"."events" add constraint "events_deposit_cents_nonneg" CHECK (((deposit_cents IS NULL) OR (deposit_cents >= 0))) not valid;

alter table "public"."events" validate constraint "events_deposit_cents_nonneg";

alter table "public"."events" add constraint "events_description_check" CHECK (((description IS NULL) OR (char_length(description) <= 5000))) not valid;

alter table "public"."events" validate constraint "events_description_check";

alter table "public"."events" add constraint "events_location_check" CHECK (((location IS NULL) OR (char_length(location) <= 5000))) not valid;

alter table "public"."events" validate constraint "events_location_check";

alter table "public"."events" add constraint "events_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."events" validate constraint "events_org_id_fkey";

alter table "public"."events" add constraint "events_org_id_slug_key" UNIQUE using index "events_org_id_slug_key";

alter table "public"."events" add constraint "events_slug_check" CHECK (((char_length(slug) >= 3) AND (char_length(slug) <= 80))) not valid;

alter table "public"."events" validate constraint "events_slug_check";

alter table "public"."events" add constraint "events_title_check" CHECK (((char_length(title) >= 3) AND (char_length(title) <= 120))) not valid;

alter table "public"."events" validate constraint "events_title_check";

alter table "public"."invoice_peppol" add constraint "invoice_peppol_attempt_chk" CHECK (((attempt_count >= 0) AND (attempt_count <= 50))) not valid;

alter table "public"."invoice_peppol" validate constraint "invoice_peppol_attempt_chk";

alter table "public"."invoice_peppol" add constraint "invoice_peppol_error_code_len_chk" CHECK (((error_code IS NULL) OR ((char_length(error_code) >= 1) AND (char_length(error_code) <= 60)))) not valid;

alter table "public"."invoice_peppol" validate constraint "invoice_peppol_error_code_len_chk";

alter table "public"."invoice_peppol" add constraint "invoice_peppol_error_message_len_chk" CHECK (((error_message IS NULL) OR ((char_length(error_message) >= 1) AND (char_length(error_message) <= 500)))) not valid;

alter table "public"."invoice_peppol" validate constraint "invoice_peppol_error_message_len_chk";

alter table "public"."invoice_peppol" add constraint "invoice_peppol_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE not valid;

alter table "public"."invoice_peppol" validate constraint "invoice_peppol_invoice_id_fkey";

alter table "public"."invoice_peppol" add constraint "invoice_peppol_payload_hash_len_chk" CHECK (((payload_hash IS NULL) OR ((char_length(payload_hash) >= 16) AND (char_length(payload_hash) <= 128)))) not valid;

alter table "public"."invoice_peppol" validate constraint "invoice_peppol_payload_hash_len_chk";

alter table "public"."invoice_peppol" add constraint "invoice_peppol_provider_chk" CHECK ((provider = 'billit'::text)) not valid;

alter table "public"."invoice_peppol" validate constraint "invoice_peppol_provider_chk";

alter table "public"."invoice_peppol" add constraint "invoice_peppol_provider_invoice_id_len_chk" CHECK (((provider_invoice_id IS NULL) OR ((char_length(provider_invoice_id) >= 1) AND (char_length(provider_invoice_id) <= 120)))) not valid;

alter table "public"."invoice_peppol" validate constraint "invoice_peppol_provider_invoice_id_len_chk";

alter table "public"."invoice_peppol" add constraint "invoice_peppol_provider_message_id_len_chk" CHECK (((provider_message_id IS NULL) OR ((char_length(provider_message_id) >= 1) AND (char_length(provider_message_id) <= 120)))) not valid;

alter table "public"."invoice_peppol" validate constraint "invoice_peppol_provider_message_id_len_chk";

alter table "public"."invoices" add constraint "invoices_amounts_non_negative" CHECK (((subtotal_cents >= 0) AND (vat_cents >= 0) AND (total_cents >= 0))) not valid;

alter table "public"."invoices" validate constraint "invoices_amounts_non_negative";

alter table "public"."invoices" add constraint "invoices_billing_snapshot_is_object" CHECK ((jsonb_typeof(billing_snapshot) = 'object'::text)) not valid;

alter table "public"."invoices" validate constraint "invoices_billing_snapshot_is_object";

alter table "public"."invoices" add constraint "invoices_currency_format" CHECK ((currency ~ '^[A-Z]{3}$'::text)) not valid;

alter table "public"."invoices" validate constraint "invoices_currency_format";

alter table "public"."invoices" add constraint "invoices_issued_requires_issued_at" CHECK (((status <> ALL (ARRAY['issued'::public.invoice_status, 'paid'::public.invoice_status])) OR (issued_at IS NOT NULL))) not valid;

alter table "public"."invoices" validate constraint "invoices_issued_requires_issued_at";

alter table "public"."invoices" add constraint "invoices_mollie_payment_id_len" CHECK (((mollie_payment_id IS NULL) OR (char_length(TRIM(BOTH FROM mollie_payment_id)) <= 80))) not valid;

alter table "public"."invoices" validate constraint "invoices_mollie_payment_id_len";

alter table "public"."invoices" add constraint "invoices_mollie_payment_id_uk" UNIQUE using index "invoices_mollie_payment_id_uk";

alter table "public"."invoices" add constraint "invoices_mollie_subscription_id_len" CHECK (((mollie_subscription_id IS NULL) OR (char_length(TRIM(BOTH FROM mollie_subscription_id)) <= 80))) not valid;

alter table "public"."invoices" validate constraint "invoices_mollie_subscription_id_len";

alter table "public"."invoices" add constraint "invoices_number_len" CHECK (((char_length(TRIM(BOTH FROM number)) >= 3) AND (char_length(TRIM(BOTH FROM number)) <= 40))) not valid;

alter table "public"."invoices" validate constraint "invoices_number_len";

alter table "public"."invoices" add constraint "invoices_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."invoices" validate constraint "invoices_org_id_fkey";

alter table "public"."invoices" add constraint "invoices_paid_requires_paid_at" CHECK (((status <> 'paid'::public.invoice_status) OR (paid_at IS NOT NULL))) not valid;

alter table "public"."invoices" validate constraint "invoices_paid_requires_paid_at";

alter table "public"."invoices" add constraint "invoices_pdf_path_len" CHECK (((pdf_path IS NULL) OR (char_length(TRIM(BOTH FROM pdf_path)) <= 300))) not valid;

alter table "public"."invoices" validate constraint "invoices_pdf_path_len";

alter table "public"."invoices" add constraint "invoices_provider_len" CHECK (((provider IS NULL) OR (char_length(TRIM(BOTH FROM provider)) <= 30))) not valid;

alter table "public"."invoices" validate constraint "invoices_provider_len";

alter table "public"."invoices" add constraint "invoices_total_consistency" CHECK ((total_cents = (subtotal_cents + vat_cents))) not valid;

alter table "public"."invoices" validate constraint "invoices_total_consistency";

alter table "public"."order_attendee_answers" add constraint "order_attendee_answers_attendee_id_field_key_snapshot_key" UNIQUE using index "order_attendee_answers_attendee_id_field_key_snapshot_key";

alter table "public"."order_attendee_answers" add constraint "order_attendee_answers_attendee_id_fkey" FOREIGN KEY (attendee_id) REFERENCES public.order_attendees(id) ON DELETE CASCADE not valid;

alter table "public"."order_attendee_answers" validate constraint "order_attendee_answers_attendee_id_fkey";

alter table "public"."order_attendee_answers" add constraint "order_attendee_answers_field_key_snapshot_check" CHECK (((char_length(field_key_snapshot) >= 2) AND (char_length(field_key_snapshot) <= 50))) not valid;

alter table "public"."order_attendee_answers" validate constraint "order_attendee_answers_field_key_snapshot_check";

alter table "public"."order_attendee_answers" add constraint "order_attendee_answers_field_label_snapshot_check" CHECK (((char_length(field_label_snapshot) >= 2) AND (char_length(field_label_snapshot) <= 120))) not valid;

alter table "public"."order_attendee_answers" validate constraint "order_attendee_answers_field_label_snapshot_check";

alter table "public"."order_attendee_answers" add constraint "order_attendee_answers_field_type_snapshot_check" CHECK ((field_type_snapshot = ANY (ARRAY['text'::text, 'textarea'::text, 'email'::text, 'number'::text, 'select'::text, 'checkbox'::text, 'date'::text, 'phone'::text, 'country'::text]))) not valid;

alter table "public"."order_attendee_answers" validate constraint "order_attendee_answers_field_type_snapshot_check";

alter table "public"."order_attendee_answers" add constraint "order_attendee_answers_value_check" CHECK (((value IS NULL) OR ((jsonb_typeof(value) = ANY (ARRAY['object'::text, 'string'::text, 'number'::text, 'boolean'::text, 'null'::text])) AND (length((value)::text) <= 5000) AND ((jsonb_typeof(value) <> 'string'::text) OR (length((value #>> '{}'::text[])) <= 2000)) AND ((jsonb_typeof(value) <> 'object'::text) OR (NOT (value ? 'value_text'::text)) OR ((value -> 'value_text'::text) = 'null'::jsonb) OR (length((value ->> 'value_text'::text)) <= 2000))))) not valid;

alter table "public"."order_attendee_answers" validate constraint "order_attendee_answers_value_check";

alter table "public"."order_attendees" add constraint "order_attendees_attendee_index_check" CHECK (((attendee_index >= 1) AND (attendee_index <= 500))) not valid;

alter table "public"."order_attendees" validate constraint "order_attendees_attendee_index_check";

alter table "public"."order_attendees" add constraint "order_attendees_order_id_attendee_index_key" UNIQUE using index "order_attendees_order_id_attendee_index_key";

alter table "public"."order_attendees" add constraint "order_attendees_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE not valid;

alter table "public"."order_attendees" validate constraint "order_attendees_order_id_fkey";

alter table "public"."order_attendees" add constraint "order_attendees_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.event_products(id) ON DELETE SET NULL not valid;

alter table "public"."order_attendees" validate constraint "order_attendees_product_id_fkey";

alter table "public"."order_attendees" add constraint "order_attendees_product_name_snapshot_check" CHECK (((char_length(product_name_snapshot) >= 2) AND (char_length(product_name_snapshot) <= 80))) not valid;

alter table "public"."order_attendees" validate constraint "order_attendees_product_name_snapshot_check";

alter table "public"."order_attendees" add constraint "order_attendees_status_allowed" CHECK ((status = ANY (ARRAY['reserved'::text, 'confirmed'::text, 'cancelled'::text, 'expired'::text]))) not valid;

alter table "public"."order_attendees" validate constraint "order_attendees_status_allowed";

alter table "public"."order_email_logs" add constraint "order_email_logs_kind_check" CHECK ((kind = ANY (ARRAY['reminder_v1'::text, 'confirmation_v1'::text]))) not valid;

alter table "public"."order_email_logs" validate constraint "order_email_logs_kind_check";

alter table "public"."order_email_logs" add constraint "order_email_logs_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE not valid;

alter table "public"."order_email_logs" validate constraint "order_email_logs_order_id_fkey";

alter table "public"."order_items" add constraint "order_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE not valid;

alter table "public"."order_items" validate constraint "order_items_order_id_fkey";

alter table "public"."order_items" add constraint "order_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.event_products(id) ON DELETE SET NULL not valid;

alter table "public"."order_items" validate constraint "order_items_product_id_fkey";

alter table "public"."order_items" add constraint "order_items_product_name_snapshot_check" CHECK (((char_length(product_name_snapshot) >= 2) AND (char_length(product_name_snapshot) <= 80))) not valid;

alter table "public"."order_items" validate constraint "order_items_product_name_snapshot_check";

alter table "public"."order_items" add constraint "order_items_quantity_check" CHECK (((quantity >= 1) AND (quantity <= 1000))) not valid;

alter table "public"."order_items" validate constraint "order_items_quantity_check";

alter table "public"."order_items" add constraint "order_items_unit_price_cents_snapshot_check" CHECK (((unit_price_cents_snapshot >= 0) AND (unit_price_cents_snapshot <= 10000000))) not valid;

alter table "public"."order_items" validate constraint "order_items_unit_price_cents_snapshot_check";

alter table "public"."orders" add constraint "orders_booking_token_check" CHECK (((char_length(booking_token) >= 32) AND (char_length(booking_token) <= 128))) not valid;

alter table "public"."orders" validate constraint "orders_booking_token_check";

alter table "public"."orders" add constraint "orders_booking_token_key" UNIQUE using index "orders_booking_token_key";

alter table "public"."orders" add constraint "orders_buyer_email_check" CHECK (((char_length(buyer_email) >= 3) AND (char_length(buyer_email) <= 254))) not valid;

alter table "public"."orders" validate constraint "orders_buyer_email_check";

alter table "public"."orders" add constraint "orders_buyer_name_check" CHECK (((char_length(buyer_name) >= 2) AND (char_length(buyer_name) <= 120))) not valid;

alter table "public"."orders" validate constraint "orders_buyer_name_check";

alter table "public"."orders" add constraint "orders_buyer_phone_check" CHECK (((buyer_phone IS NULL) OR (((length(buyer_phone) >= 7) AND (length(buyer_phone) <= 20)) AND (buyer_phone ~ '^[0-9+()\- ]+$'::text)))) not valid;

alter table "public"."orders" validate constraint "orders_buyer_phone_check";

alter table "public"."orders" add constraint "orders_check" CHECK ((paid_cents <= total_cents)) not valid;

alter table "public"."orders" validate constraint "orders_check";

alter table "public"."orders" add constraint "orders_currency_check" CHECK ((char_length(currency) = 3)) not valid;

alter table "public"."orders" validate constraint "orders_currency_check";

alter table "public"."orders" add constraint "orders_deposit_due_cents_snapshot_check" CHECK (((deposit_due_cents_snapshot >= 0) AND (deposit_due_cents_snapshot <= total_cents))) not valid;

alter table "public"."orders" validate constraint "orders_deposit_due_cents_snapshot_check";

alter table "public"."orders" add constraint "orders_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE not valid;

alter table "public"."orders" validate constraint "orders_event_id_fkey";

alter table "public"."orders" add constraint "orders_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."orders" validate constraint "orders_org_id_fkey";

alter table "public"."orders" add constraint "orders_paid_cents_check" CHECK (((paid_cents >= 0) AND (paid_cents <= 100000000))) not valid;

alter table "public"."orders" validate constraint "orders_paid_cents_check";

alter table "public"."orders" add constraint "orders_paid_cents_nonneg" CHECK ((paid_cents >= 0)) not valid;

alter table "public"."orders" validate constraint "orders_paid_cents_nonneg";

alter table "public"."orders" add constraint "orders_paid_lte_total" CHECK ((paid_cents <= total_cents)) not valid;

alter table "public"."orders" validate constraint "orders_paid_lte_total";

alter table "public"."orders" add constraint "orders_status_allowed" CHECK ((status = ANY (ARRAY['pending'::text, 'awaiting_payment'::text, 'partially_paid'::text, 'paid'::text, 'cancelled'::text, 'expired'::text]))) not valid;

alter table "public"."orders" validate constraint "orders_status_allowed";

alter table "public"."orders" add constraint "orders_total_cents_check" CHECK (((total_cents >= 0) AND (total_cents <= 100000000))) not valid;

alter table "public"."orders" validate constraint "orders_total_cents_check";

alter table "public"."orders" add constraint "orders_total_cents_nonneg" CHECK ((total_cents >= 0)) not valid;

alter table "public"."orders" validate constraint "orders_total_cents_nonneg";

alter table "public"."organization_billing" add constraint "organization_billing_address_line1_len" CHECK (((char_length(TRIM(BOTH FROM address_line1)) >= 2) AND (char_length(TRIM(BOTH FROM address_line1)) <= 200))) not valid;

alter table "public"."organization_billing" validate constraint "organization_billing_address_line1_len";

alter table "public"."organization_billing" add constraint "organization_billing_address_line2_len" CHECK (((address_line2 IS NULL) OR (char_length(TRIM(BOTH FROM address_line2)) <= 200))) not valid;

alter table "public"."organization_billing" validate constraint "organization_billing_address_line2_len";

alter table "public"."organization_billing" add constraint "organization_billing_billing_email_format" CHECK (((billing_email IS NULL) OR (billing_email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'::text))) not valid;

alter table "public"."organization_billing" validate constraint "organization_billing_billing_email_format";

alter table "public"."organization_billing" add constraint "organization_billing_billing_email_len" CHECK (((billing_email IS NULL) OR (char_length(TRIM(BOTH FROM billing_email)) <= 254))) not valid;

alter table "public"."organization_billing" validate constraint "organization_billing_billing_email_len";

alter table "public"."organization_billing" add constraint "organization_billing_city_len" CHECK (((char_length(TRIM(BOTH FROM city)) >= 2) AND (char_length(TRIM(BOTH FROM city)) <= 120))) not valid;

alter table "public"."organization_billing" validate constraint "organization_billing_city_len";

alter table "public"."organization_billing" add constraint "organization_billing_country_code_format" CHECK ((country_code ~ '^[A-Z]{2}$'::text)) not valid;

alter table "public"."organization_billing" validate constraint "organization_billing_country_code_format";

alter table "public"."organization_billing" add constraint "organization_billing_invoice_reference_len" CHECK (((invoice_reference IS NULL) OR (char_length(TRIM(BOTH FROM invoice_reference)) <= 64))) not valid;

alter table "public"."organization_billing" validate constraint "organization_billing_invoice_reference_len";

alter table "public"."organization_billing" add constraint "organization_billing_legal_name_len" CHECK (((char_length(TRIM(BOTH FROM legal_name)) >= 2) AND (char_length(TRIM(BOTH FROM legal_name)) <= 160))) not valid;

alter table "public"."organization_billing" validate constraint "organization_billing_legal_name_len";

alter table "public"."organization_billing" add constraint "organization_billing_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."organization_billing" validate constraint "organization_billing_org_id_fkey";

alter table "public"."organization_billing" add constraint "organization_billing_postal_len" CHECK (((char_length(TRIM(BOTH FROM postal_code)) >= 2) AND (char_length(TRIM(BOTH FROM postal_code)) <= 20))) not valid;

alter table "public"."organization_billing" validate constraint "organization_billing_postal_len";

alter table "public"."organization_billing" add constraint "organization_billing_vat_country_code_format" CHECK (((vat_country_code IS NULL) OR (vat_country_code ~ '^[A-Z]{2}$'::text))) not valid;

alter table "public"."organization_billing" validate constraint "organization_billing_vat_country_code_format";

alter table "public"."organization_billing" add constraint "organization_billing_vat_number_len" CHECK (((vat_number IS NULL) OR ((char_length(regexp_replace(vat_number, '\s+'::text, ''::text, 'g'::text)) >= 6) AND (char_length(regexp_replace(vat_number, '\s+'::text, ''::text, 'g'::text)) <= 20)))) not valid;

alter table "public"."organization_billing" validate constraint "organization_billing_vat_number_len";

alter table "public"."organization_members" add constraint "organization_members_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."organization_members" validate constraint "organization_members_org_id_fkey";

alter table "public"."organization_members" add constraint "organization_members_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text]))) not valid;

alter table "public"."organization_members" validate constraint "organization_members_role_check";

alter table "public"."organization_members" add constraint "organization_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."organization_members" validate constraint "organization_members_user_id_fkey";

alter table "public"."organization_profile" add constraint "organization_profile_default_event_banner_url_check" CHECK (((default_event_banner_url IS NULL) OR ((char_length(default_event_banner_url) >= 10) AND (char_length(default_event_banner_url) <= 2048)))) not valid;

alter table "public"."organization_profile" validate constraint "organization_profile_default_event_banner_url_check";

alter table "public"."organization_profile" add constraint "organization_profile_description_check" CHECK (((description IS NULL) OR (char_length(description) <= 1000))) not valid;

alter table "public"."organization_profile" validate constraint "organization_profile_description_check";

alter table "public"."organization_profile" add constraint "organization_profile_display_name_check" CHECK (((char_length(display_name) >= 3) AND (char_length(display_name) <= 120))) not valid;

alter table "public"."organization_profile" validate constraint "organization_profile_display_name_check";

alter table "public"."organization_profile" add constraint "organization_profile_email_reminder_days_before_chk" CHECK (((email_reminder_days_before IS NULL) OR (email_reminder_days_before >= 0))) not valid;

alter table "public"."organization_profile" validate constraint "organization_profile_email_reminder_days_before_chk";

alter table "public"."organization_profile" add constraint "organization_profile_logo_url_check" CHECK (((logo_url IS NULL) OR ((char_length(logo_url) >= 10) AND (char_length(logo_url) <= 2048)))) not valid;

alter table "public"."organization_profile" validate constraint "organization_profile_logo_url_check";

alter table "public"."organization_profile" add constraint "organization_profile_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."organization_profile" validate constraint "organization_profile_org_id_fkey";

alter table "public"."organization_profile" add constraint "organization_profile_phone_check" CHECK (((phone IS NULL) OR ((char_length(phone) >= 3) AND (char_length(phone) <= 32)))) not valid;

alter table "public"."organization_profile" validate constraint "organization_profile_phone_check";

alter table "public"."organization_profile" add constraint "organization_profile_primary_color_check" CHECK (((char_length(primary_color) >= 4) AND (char_length(primary_color) <= 20))) not valid;

alter table "public"."organization_profile" validate constraint "organization_profile_primary_color_check";

alter table "public"."organization_profile" add constraint "organization_profile_public_email_check" CHECK (((public_email IS NULL) OR ((char_length(public_email) >= 3) AND (char_length(public_email) <= 254)))) not valid;

alter table "public"."organization_profile" validate constraint "organization_profile_public_email_check";

alter table "public"."organization_profile" add constraint "organization_profile_slug_check" CHECK (((char_length(slug) >= 3) AND (char_length(slug) <= 80))) not valid;

alter table "public"."organization_profile" validate constraint "organization_profile_slug_check";

alter table "public"."organization_profile" add constraint "organization_profile_slug_key" UNIQUE using index "organization_profile_slug_key";

alter table "public"."organization_profile" add constraint "organization_profile_website_check" CHECK (((website IS NULL) OR ((char_length(website) >= 5) AND (char_length(website) <= 2048)))) not valid;

alter table "public"."organization_profile" validate constraint "organization_profile_website_check";

alter table "public"."organization_profile" add constraint "organization_profile_widget_bg_check" CHECK (((widget_bg IS NULL) OR (("left"(widget_bg, 1) = '#'::text) AND (char_length(widget_bg) >= 4) AND (char_length(widget_bg) <= 20)))) not valid;

alter table "public"."organization_profile" validate constraint "organization_profile_widget_bg_check";

alter table "public"."organization_profile" add constraint "organization_profile_widget_button_check" CHECK (((widget_button IS NULL) OR (("left"(widget_button, 1) = '#'::text) AND (char_length(widget_button) >= 4) AND (char_length(widget_button) <= 20)))) not valid;

alter table "public"."organization_profile" validate constraint "organization_profile_widget_button_check";

alter table "public"."organization_profile" add constraint "organization_profile_widget_card_check" CHECK (((widget_card IS NULL) OR (("left"(widget_card, 1) = '#'::text) AND (char_length(widget_card) >= 4) AND (char_length(widget_card) <= 20)))) not valid;

alter table "public"."organization_profile" validate constraint "organization_profile_widget_card_check";

alter table "public"."organization_profile" add constraint "organization_profile_widget_text_check" CHECK (((widget_text IS NULL) OR (("left"(widget_text, 1) = '#'::text) AND (char_length(widget_text) >= 4) AND (char_length(widget_text) <= 20)))) not valid;

alter table "public"."organization_profile" validate constraint "organization_profile_widget_text_check";

alter table "public"."organizations" add constraint "organizations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."organizations" validate constraint "organizations_created_by_fkey";

alter table "public"."organizations" add constraint "organizations_name_check" CHECK (((char_length(name) >= 3) AND (char_length(name) <= 120))) not valid;

alter table "public"."organizations" validate constraint "organizations_name_check";

alter table "public"."organizations" add constraint "organizations_payments_provider_check" CHECK ((payments_provider = 'mollie'::text)) not valid;

alter table "public"."organizations" validate constraint "organizations_payments_provider_check";

alter table "public"."organizations" add constraint "organizations_payments_status_check" CHECK ((payments_status = ANY (ARRAY['not_connected'::text, 'pending'::text, 'connected'::text, 'revoked'::text]))) not valid;

alter table "public"."organizations" validate constraint "organizations_payments_status_check";

alter table "public"."organizations" add constraint "organizations_plan_check" CHECK ((plan = ANY (ARRAY['free'::text, 'starter'::text, 'pro'::text]))) not valid;

alter table "public"."organizations" validate constraint "organizations_plan_check";

alter table "public"."organizations" add constraint "organizations_status_check" CHECK ((status = ANY (ARRAY['trial'::text, 'active'::text, 'suspended'::text]))) not valid;

alter table "public"."organizations" validate constraint "organizations_status_check";

alter table "public"."organizations" add constraint "organizations_type_check" CHECK ((type = ANY (ARRAY['association'::text, 'person'::text]))) not valid;

alter table "public"."organizations" validate constraint "organizations_type_check";

alter table "public"."payments" add constraint "payments_amount_cents_check" CHECK (((amount_cents > 0) AND (amount_cents <= 100000000))) not valid;

alter table "public"."payments" validate constraint "payments_amount_cents_check";

alter table "public"."payments" add constraint "payments_currency_check" CHECK ((char_length(currency) = 3)) not valid;

alter table "public"."payments" validate constraint "payments_currency_check";

alter table "public"."payments" add constraint "payments_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE not valid;

alter table "public"."payments" validate constraint "payments_order_id_fkey";

alter table "public"."payments" add constraint "payments_parent_payment_fk" FOREIGN KEY (parent_payment_id) REFERENCES public.payments(id) ON DELETE SET NULL not valid;

alter table "public"."payments" validate constraint "payments_parent_payment_fk";

alter table "public"."payments" add constraint "payments_provider_check" CHECK ((provider = ANY (ARRAY['mollie'::text, 'offline'::text]))) not valid;

alter table "public"."payments" validate constraint "payments_provider_check";

alter table "public"."payments" add constraint "payments_provider_payment_id_check" CHECK (((char_length(provider_payment_id) >= 3) AND (char_length(provider_payment_id) <= 100))) not valid;

alter table "public"."payments" validate constraint "payments_provider_payment_id_check";

alter table "public"."payments" add constraint "payments_status_check" CHECK ((status = ANY (ARRAY['created'::text, 'pending'::text, 'open'::text, 'authorized'::text, 'paid'::text, 'failed'::text, 'canceled'::text, 'expired'::text]))) not valid;

alter table "public"."payments" validate constraint "payments_status_check";

alter table "public"."payments" add constraint "payments_type_allowed" CHECK ((type = ANY (ARRAY['payment'::text, 'refund'::text]))) not valid;

alter table "public"."payments" validate constraint "payments_type_allowed";

alter table "public"."subscriptions" add constraint "subscriptions_mollie_customer_id_check" CHECK (((mollie_customer_id IS NULL) OR ((char_length(mollie_customer_id) >= 3) AND (char_length(mollie_customer_id) <= 100)))) not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_mollie_customer_id_check";

alter table "public"."subscriptions" add constraint "subscriptions_mollie_subscription_id_check" CHECK (((mollie_subscription_id IS NULL) OR ((char_length(mollie_subscription_id) >= 3) AND (char_length(mollie_subscription_id) <= 100)))) not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_mollie_subscription_id_check";

alter table "public"."subscriptions" add constraint "subscriptions_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_org_id_fkey";

alter table "public"."subscriptions" add constraint "subscriptions_org_unique" UNIQUE using index "subscriptions_org_unique";

alter table "public"."subscriptions" add constraint "subscriptions_provider_check" CHECK ((provider = ANY (ARRAY['mollie'::text, 'manual'::text]))) not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_provider_check";

alter table "public"."subscriptions" add constraint "subscriptions_status_check" CHECK ((status = ANY (ARRAY['inactive'::text, 'pending'::text, 'active'::text, 'suspended'::text, 'canceled'::text, 'cancelled'::text, 'completed'::text, 'expired'::text]))) not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_status_check";

alter table "public"."tickets" add constraint "tickets_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE not valid;

alter table "public"."tickets" validate constraint "tickets_event_id_fkey";

alter table "public"."tickets" add constraint "tickets_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE not valid;

alter table "public"."tickets" validate constraint "tickets_order_id_fkey";

alter table "public"."tickets" add constraint "tickets_order_item_id_fkey" FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE CASCADE not valid;

alter table "public"."tickets" validate constraint "tickets_order_item_id_fkey";

alter table "public"."tickets" add constraint "tickets_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.event_products(id) ON DELETE RESTRICT not valid;

alter table "public"."tickets" validate constraint "tickets_product_id_fkey";

alter table "public"."tickets" add constraint "tickets_qr_token_key" UNIQUE using index "tickets_qr_token_key";

alter table "public"."tickets" add constraint "tickets_status_check" CHECK ((status = ANY (ARRAY['valid'::text, 'checked_in'::text, 'cancelled'::text, 'refunded'::text, 'blocked'::text]))) not valid;

alter table "public"."tickets" validate constraint "tickets_status_check";

alter table "public"."tickets" add constraint "tickets_unique_per_item" UNIQUE using index "tickets_unique_per_item";

alter table "public"."user_profile" add constraint "user_profile_address_line1_check" CHECK (((address_line1 IS NULL) OR ((char_length(address_line1) >= 3) AND (char_length(address_line1) <= 120)))) not valid;

alter table "public"."user_profile" validate constraint "user_profile_address_line1_check";

alter table "public"."user_profile" add constraint "user_profile_address_line2_check" CHECK (((address_line2 IS NULL) OR ((char_length(address_line2) >= 3) AND (char_length(address_line2) <= 120)))) not valid;

alter table "public"."user_profile" validate constraint "user_profile_address_line2_check";

alter table "public"."user_profile" add constraint "user_profile_city_check" CHECK (((city IS NULL) OR ((char_length(city) >= 2) AND (char_length(city) <= 80)))) not valid;

alter table "public"."user_profile" validate constraint "user_profile_city_check";

alter table "public"."user_profile" add constraint "user_profile_country_code_check" CHECK (((country_code IS NULL) OR (char_length(country_code) = 2))) not valid;

alter table "public"."user_profile" validate constraint "user_profile_country_code_check";

alter table "public"."user_profile" add constraint "user_profile_first_name_check" CHECK (((first_name IS NULL) OR ((char_length(first_name) >= 2) AND (char_length(first_name) <= 80)))) not valid;

alter table "public"."user_profile" validate constraint "user_profile_first_name_check";

alter table "public"."user_profile" add constraint "user_profile_last_name_check" CHECK (((last_name IS NULL) OR ((char_length(last_name) >= 2) AND (char_length(last_name) <= 80)))) not valid;

alter table "public"."user_profile" validate constraint "user_profile_last_name_check";

alter table "public"."user_profile" add constraint "user_profile_phone_check" CHECK (((phone IS NULL) OR ((char_length(phone) >= 3) AND (char_length(phone) <= 32)))) not valid;

alter table "public"."user_profile" validate constraint "user_profile_phone_check";

alter table "public"."user_profile" add constraint "user_profile_postal_code_check" CHECK (((postal_code IS NULL) OR ((char_length(postal_code) >= 2) AND (char_length(postal_code) <= 20)))) not valid;

alter table "public"."user_profile" validate constraint "user_profile_postal_code_check";

alter table "public"."user_profile" add constraint "user_profile_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_profile" validate constraint "user_profile_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION private.assert_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'private', 'public'
AS $function$
declare
  v_window_start timestamptz;
  v_hits int;
begin
  if p_limit is null or p_limit <= 0 then
    return;
  end if;

  -- fenêtre courante (arrondie)
  v_window_start :=
    to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into private.rate_limit_hits(key, window_start, hits, updated_at)
  values (p_key, v_window_start, 1, now())
  on conflict (key, window_start)
  do update set
    hits = private.rate_limit_hits.hits + 1,
    updated_at = now()
  returning hits into v_hits;

  if v_hits > p_limit then
    raise exception 'RATE_LIMITED'
      using errcode = '42901',
            detail = format('key=%s limit=%s window=%ss', p_key, p_limit, p_window_seconds);
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.can_create_event(p_org_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'private', 'public'
AS $function$
declare
  v_plan text;
  v_max_events integer;
  v_current_count integer;
begin
  -- Récupère le plan de l'org
  select o.plan
    into v_plan
  from public.organizations o
  where o.id = p_org_id;

  -- Org inexistante → refuse
  if v_plan is null then
    return false;
  end if;

  -- Récupère la limite (NULL = illimité)
  select pl.max_events_per_year
    into v_max_events
  from public.plan_limits pl
  where pl.plan = v_plan;

  -- Plan inconnu → refuse par sécurité
  if v_max_events is null
     and not exists (
       select 1 from public.plan_limits where plan = v_plan
     ) then
    return false;
  end if;

  -- Illimité
  if v_max_events is null then
    return true;
  end if;

  -- Compte les events créés cette année
  select count(*)
    into v_current_count
  from public.events e
  where e.org_id = p_org_id
    and date_part('year', e.created_at) = date_part('year', now());

  return v_current_count < v_max_events;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.generate_unique_event_slug(p_org_id uuid, base_title text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'private', 'public', 'pg_temp'
AS $function$
declare
  base_slug text := public.slugify(base_title);
  candidate text := base_slug;
  i int := 2;
begin
  if candidate is null or candidate = '' then
    candidate := 'event';
  end if;

  while exists (
    select 1
    from public.events e
    where e.org_id = p_org_id
      and e.slug = candidate
  ) loop
    candidate := base_slug || '-' || i::text;
    i := i + 1;
  end loop;

  return candidate;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.generate_unique_org_slug(base_name text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  base_slug text := public.slugify(base_name);
  candidate text := base_slug;
  i int := 2;
begin
  if candidate is null or candidate = '' then
    candidate := 'org';
  end if;

  while exists (select 1 from public.organization_profile where slug = candidate) loop
    candidate := base_slug || '-' || i::text;
    i := i + 1;
  end loop;

  return candidate;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.prune_rate_limits(p_older_than interval DEFAULT '7 days'::interval)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'private'
AS $function$
  delete from private.rate_limit_hits
  where updated_at < now() - p_older_than;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_delete_order(p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_uid uuid := auth.uid();
  v_order record;

  v_is_sold boolean := false;
  v_dec_reserved int := 0;
  v_dec_sold int := 0;
begin
  perform set_config('search_path', 'pg_temp, public, extensions, private', true);

  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_order_id is null then
    raise exception 'VALIDATION_ERROR: order_id is required';
  end if;

  /* lock order */
  select id, org_id, status
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'NOT_FOUND: order';
  end if;

  if not public.is_org_member(v_order.org_id) then
    raise exception 'FORBIDDEN';
  end if;

  /*
    Détermine si on libère du sold ou du reserved.
    ✅ adapte la liste selon tes statuts réels.
  */
  v_is_sold := (v_order.status in ('paid', 'confirmed'));

  /*
    Libération stock basée sur les order_items (unités de tickets),
    pas sur les attendees (sinon impossible avec attendees_per_unit).
  */
  if v_is_sold then
    update public.event_products ep
    set sold_qty = greatest(0, ep.sold_qty - x.qty)
    from (
      select product_id, sum(quantity)::int as qty
      from public.order_items
      where order_id = p_order_id
      group by product_id
    ) x
    where ep.id = x.product_id;

    v_dec_sold := coalesce((
      select sum(quantity)::int from public.order_items where order_id = p_order_id
    ), 0);

  else
    update public.event_products ep
    set reserved_qty = greatest(0, ep.reserved_qty - x.qty)
    from (
      select product_id, sum(quantity)::int as qty
      from public.order_items
      where order_id = p_order_id
      group by product_id
    ) x
    where ep.id = x.product_id;

    v_dec_reserved := coalesce((
      select sum(quantity)::int from public.order_items where order_id = p_order_id
    ), 0);
  end if;

  /* delete order (cascades attendees/answers/items etc.) */
  delete from public.orders
  where id = p_order_id;

  return jsonb_build_object(
    'deleted_order_id', p_order_id,
    'released', jsonb_build_object(
      'reserved_units', v_dec_reserved,
      'sold_units', v_dec_sold
    )
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_grant_subscription(p_org uuid, p_plan text, p_days integer DEFAULT 30, p_period_end timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(org_id uuid, plan text, status text, provider text, current_period_end timestamp with time zone, org_plan text, plan_started_at timestamp with time zone, plan_expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plan text;
  v_now timestamptz := now();
  v_end timestamptz;
begin
  if p_org is null then
    raise exception 'ORG_ID_REQUIRED';
  end if;

  if not exists (select 1 from public.organizations o where o.id = p_org) then
    raise exception 'ORG_NOT_FOUND';
  end if;

  v_plan := lower(trim(coalesce(p_plan,'')));
  if v_plan not in ('starter','pro') then
    raise exception 'BAD_PLAN';
  end if;

  if p_period_end is not null then
    v_end := p_period_end;
  else
    if p_days is null or p_days <= 0 or p_days > 3650 then
      raise exception 'BAD_DAYS';
    end if;
    v_end := v_now + make_interval(days => p_days);
  end if;

  insert into public.subscriptions (
    org_id,
    provider,
    mollie_customer_id,
    mollie_subscription_id,
    status,
    current_period_end,
    created_at,
    updated_at,
    plan
  )
  values (
    p_org,
    'manual',
    null,
    null,
    'active',
    v_end,
    v_now,
    v_now,
    v_plan
  )
  on conflict on constraint subscriptions_pkey do update
    set provider = 'manual',
        mollie_customer_id = null,
        mollie_subscription_id = null,
        status = 'active',
        current_period_end = excluded.current_period_end,
        updated_at = v_now,
        plan = excluded.plan;

  update public.organizations
     set plan = v_plan,
         plan_started_at = v_now,
         plan_expires_at = v_end,
         updated_at = v_now
   where id = p_org;

  return query
  select
    s.org_id,
    s.plan,
    s.status,
    s.provider,
    s.current_period_end,
    o.plan as org_plan,
    o.plan_started_at,
    o.plan_expires_at
  from public.subscriptions s
  join public.organizations o on o.id = s.org_id
  where s.org_id = p_org;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_update_order_attendee(p_attendee_id uuid, p_attendee jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$declare
  v_user_id uuid := auth.uid();

  v_attendee record;
  v_order record;
  v_event record;

  v_ans jsonb;
  v_field_key text;
  v_field_id uuid;
  v_eff record;

  v_updated_count int := 0;

  v_has_answers boolean := false;
  v_is_empty boolean;
begin
  /* ---------------- Hardening ---------------- */
  perform set_config('search_path', 'pg_temp, public, extensions, private', true);

  /* ---------------- Auth ---------------- */
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_attendee_id is null then
    raise exception 'VALIDATION_ERROR: attendee_id is required';
  end if;

  if p_attendee is null or jsonb_typeof(p_attendee) <> 'object' then
    raise exception 'VALIDATION_ERROR: attendee payload is required';
  end if;

  perform public.assert_rate_limit(
    'svc:admin_update_attendee:' || p_attendee_id::text,
    300,
    60
  );

  /* ---------------- Lock attendee ---------------- */
  select *
  into v_attendee
  from public.order_attendees oa
  where oa.id = p_attendee_id
  for update;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  /* ---------------- Load order ---------------- */
  select *
  into v_order
  from public.orders o
  where o.id = v_attendee.order_id;

  /* ---------------- Rights ---------------- */
  if not exists (
    select 1
    from public.organization_members om
    where om.org_id = v_order.org_id
      and om.user_id = v_user_id
      and om.role in ('owner','admin')
  ) then
    raise exception 'FORBIDDEN';
  end if;

  /* ---------------- Load event ---------------- */
  select *
  into v_event
  from public.events e
  where e.id = v_order.event_id;

  /* =========================================================
     ✏️ Update answers (upsert + delete if empty)
     ========================================================= */

  if (p_attendee ? 'answers')
     and jsonb_typeof(p_attendee->'answers') = 'array'
  then
    v_has_answers := true;

    for v_ans in select * from jsonb_array_elements(p_attendee->'answers')
    loop
      v_field_key := nullif(trim(coalesce(v_ans->>'field_key','')), '');
      v_field_id := null;

      if (v_ans ? 'event_form_field_id') then
        begin
          v_field_id := nullif(trim(v_ans->>'event_form_field_id'), '')::uuid;
        exception when others then
          raise exception 'VALIDATION_ERROR: invalid field id';
        end;
      end if;

      if v_field_key is null and v_field_id is null then
        raise exception 'VALIDATION_ERROR: field_key or event_form_field_id required';
      end if;

      /* Resolve form field (must belong to same event) */
      select eff.*
      into v_eff
      from public.event_form_fields eff
      where eff.event_id = v_event.id
        and eff.is_active = true
        and (
          (v_field_id is not null and eff.id = v_field_id)
          or
          (v_field_key is not null and eff.field_key = v_field_key)
        )
      limit 1;

      if not found then
        raise exception 'VALIDATION_ERROR: invalid form field';
      end if;

      /*
        Detect empty value => delete answer so UI can "clear" a field.
        Rules:
        - if v_ans contains "value" object: empty if it's {} OR all known subfields empty/null
        - else use value_text/value_int/value_bool/value_date
      */
      v_is_empty :=
        (
          /* explicit value object */
          (v_ans ? 'value') and (
            jsonb_typeof(v_ans->'value') <> 'object'
            or v_ans->'value' = '{}'::jsonb
            or (
              nullif(trim(coalesce(v_ans->'value'->>'value_text','')), '') is null
              and (v_ans->'value'->>'value_int') is null
              and (v_ans->'value'->>'value_bool') is null
              and nullif(trim(coalesce(v_ans->'value'->>'value_date','')), '') is null
            )
          )
        )
        or
        (
          /* fallback fields */
          (not (v_ans ? 'value')) and
          nullif(trim(coalesce(v_ans->>'value_text','')), '') is null
          and nullif(trim(coalesce(v_ans->>'value_date','')), '') is null
          and (v_ans->>'value_int') is null
          and (v_ans->>'value_bool') is null
        );

      if v_is_empty then
        delete from public.order_attendee_answers oaa
        where oaa.attendee_id = p_attendee_id
          and oaa.field_key_snapshot = v_eff.field_key;

        v_updated_count := v_updated_count + 1;
      else
        insert into public.order_attendee_answers (
          id,
          attendee_id,
          field_key_snapshot,
          field_label_snapshot,
          field_type_snapshot,
          value,
          created_at,
          updated_at
        )
        values (
          gen_random_uuid(),
          p_attendee_id,
          v_eff.field_key,
          v_eff.label,
          v_eff.field_type,
          coalesce(
            v_ans->'value',
            jsonb_build_object(
              'value_text', nullif(trim(coalesce(v_ans->>'value_text','')), ''),
              'value_int',  case
                when (v_ans ? 'value_int')
                  and nullif(trim(coalesce(v_ans->>'value_int','')), '') is not null
                then (v_ans->>'value_int')::int else null end,
              'value_bool', case
                when (v_ans ? 'value_bool')
                  and nullif(trim(coalesce(v_ans->>'value_bool','')), '') is not null
                then (v_ans->>'value_bool')::boolean else null end,
              'value_date', nullif(trim(coalesce(v_ans->>'value_date','')), '')
            )
          ),
          now(),
          now()
        )
        on conflict (attendee_id, field_key_snapshot)
        do update set
          value = excluded.value,
          field_label_snapshot = excluded.field_label_snapshot,
          field_type_snapshot = excluded.field_type_snapshot,
          updated_at = now();

        v_updated_count := v_updated_count + 1;
      end if;
    end loop;
  end if;

  if not v_has_answers then
    raise exception 'VALIDATION_ERROR: answers array is required';
  end if;

  return jsonb_build_object(
    'attendee_id', p_attendee_id,
    'updated_answers_count', v_updated_count
  );
end;$function$
;

CREATE OR REPLACE FUNCTION public.apply_order_payment(p_order_id uuid, p_provider text, p_amount_cents integer, p_currency text, p_provider_payment_id text, p_raw jsonb, p_note text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$declare
  v_now timestamptz := now();
  v_order record;
  v_existing_payment record;

  v_new_paid int;
  v_first_payment boolean := false;

  v_currency text := upper(nullif(trim(p_currency), ''));
  v_provider text := lower(nullif(trim(p_provider), ''));

  v_already_paid boolean := false;
begin
  /* ---------------- Hardening ---------------- */
  perform set_config('search_path', 'pg_temp, public, extensions, private', true);

  /* ---------------- Validations minimales ---------------- */
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

  /* ---------------- Lock order ---------------- */
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

  v_first_payment := coalesce(v_order.paid_cents, 0) = 0;

  /* ---------------- Lock/get existing payment ---------------- */
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

    /* ✅ IDEMPOTENCE: si déjà payé et déjà processé, on ne re-crédite pas l'order */
    v_already_paid := (coalesce(v_existing_payment.status, '') = 'paid')
                      and (v_existing_payment.processed_at is not null);

    if v_already_paid then
      -- (optionnel) rafraîchir raw/updated_at
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
        'status', v_order.status,
        'idempotent', true
      );
    end if;

    -- finalize existing intent (ou transition vers paid)
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
    -- direct insert (fallback)
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

  /* ---------------- Compute new paid amount ---------------- */
  v_new_paid := least(
    v_order.total_cents,
    coalesce(v_order.paid_cents, 0) + p_amount_cents
  );

  /* ---------------- Update order ---------------- */
  update public.orders
  set
    paid_cents = v_new_paid,
    status = case
      when v_new_paid >= total_cents then 'paid'
      else 'partially_paid'
    end,
    confirmed_at = coalesce(confirmed_at, v_now),
    updated_at = v_now
  where id = p_order_id;

  /* ---------------- Confirm attendees on first payment ---------------- */
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
    'status', case
      when v_new_paid >= v_order.total_cents then 'paid'
      else 'partially_paid'
    end,
    'idempotent', false
  );
end;$function$
;

CREATE OR REPLACE FUNCTION public.apply_subscription_state(p_org_id uuid, p_provider text, p_customer_id text, p_subscription_id text, p_status text, p_current_period_end timestamp with time zone, p_raw jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$declare
  v_now timestamptz := now();

  v_status text := lower(trim(coalesce(p_status, '')));
  v_provider text := lower(trim(coalesce(p_provider, '')));

  v_meta_plan text := nullif(lower(trim(coalesce(p_raw #>> '{metadata,plan}', ''))), '');
  v_db_plan   text := null;
  v_plan      text := null;

  v_new_end timestamptz := p_current_period_end;
  v_rows_org int := 0;
begin
  if p_org_id is null then
    raise exception 'VALIDATION_ERROR: org_id is required';
  end if;

  if v_provider <> 'mollie' then
    raise exception 'VALIDATION_ERROR: unsupported provider';
  end if;

  if p_subscription_id is null or trim(p_subscription_id) = '' then
    raise exception 'VALIDATION_ERROR: subscription_id required';
  end if;

  -- plan DB actuel
  select nullif(lower(trim(coalesce(s.plan, ''))), '')
    into v_db_plan
  from public.subscriptions s
  where s.org_id = p_org_id
  limit 1;

  -- priorité: metadata.plan -> subscriptions.plan
  v_plan := coalesce(v_meta_plan, v_db_plan);

  if v_plan not in ('free', 'starter', 'pro') then
    raise exception 'VALIDATION_ERROR: invalid plan "%"', coalesce(v_plan, 'null');
  end if;

  -- ✅ Update subscriptions avec anti-régression sur current_period_end
  update public.subscriptions s
  set
    provider             = v_provider,
    mollie_customer_id   = nullif(trim(p_customer_id), ''),
    mollie_subscription_id = nullif(trim(p_subscription_id), ''),
    status               = nullif(v_status, ''),
    plan                 = v_plan,
    current_period_end   = case
      when v_new_end is null then s.current_period_end
      when s.current_period_end is null then v_new_end
      else greatest(s.current_period_end, v_new_end)
    end,
    updated_at           = v_now
  where s.org_id = p_org_id;

  if not found then
    raise exception 'SUBSCRIPTION_ROW_NOT_FOUND';
  end if;

  /*
    ✅ Update org:
    - on met à jour plan_expires_at dès qu’on a une date (même si status pas "active")
    - on peut appliquer plan dès qu’on a une subscription “payante” connue
      (ajuste la liste si tu veux plus strict)
  */
  update public.organizations o
  set
    plan = case
      when v_plan = 'free' then o.plan
      when v_status in ('active','pending','canceled','cancelled','suspended','paused') then v_plan
      else o.plan
    end,

    plan_started_at = case
      when v_plan in ('starter','pro') and o.plan_started_at is null then v_now
      else o.plan_started_at
    end,

    plan_expires_at = case
      when v_plan in ('starter','pro') and v_new_end is not null then
        case
          when o.plan_expires_at is null then v_new_end
          else greatest(o.plan_expires_at, v_new_end)
        end
      else o.plan_expires_at
    end,

    updated_at = v_now
  where o.id = p_org_id;

  get diagnostics v_rows_org = row_count;

  return jsonb_build_object(
    'ok', true,
    'org_id', p_org_id,
    'status', v_status,
    'resolved_plan', v_plan,
    'org_rows', v_rows_org,
    'applied_period_end', v_new_end
  );
end;$function$
;

CREATE OR REPLACE FUNCTION public.assert_can_add_form_field(p_org_id uuid, p_event_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$declare
  v_plan text;
  v_limits public.plan_limits%rowtype;
  v_max int;
  v_count int;
begin
  -- (optionnel mais propre) check existence event (évite de compter “dans le vide”)
  if not exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and e.org_id = p_org_id
  ) then
    raise exception 'NOT_FOUND: event';
  end if;

  v_plan := public.get_org_plan(p_org_id);

  select *
    into v_limits
  from public.plan_limits pl
  where pl.plan = v_plan;

  if not found then
    raise exception 'PLAN_LIMIT: unknown plan';
  end if;

  v_max := v_limits.max_form_fields;

  if v_max is null then
    return;
  end if;

  select count(*)::int
    into v_count
  from public.event_form_fields f
  where f.event_id = p_event_id
    and f.is_active is true;

  if v_count >= v_max then
    raise exception 'PLAN_LIMIT: max_form_fields exceeded';
  end if;
end;$function$
;

CREATE OR REPLACE FUNCTION public.assert_can_add_product(p_org_id uuid, p_event_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$declare
  v_plan text;
  v_limits public.plan_limits%rowtype;
  v_max int;
  v_count int;
begin
  -- (recommandé) éviter de compter sur un event qui n'existe pas / pas lié à l'org
  if not exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and e.org_id = p_org_id
  ) then
    raise exception 'NOT_FOUND: event';
  end if;

  v_plan := public.get_org_plan(p_org_id);

  select *
    into v_limits
  from public.plan_limits pl
  where pl.plan = v_plan;

  if not found then
    raise exception 'PLAN_LIMIT: unknown plan';
  end if;

  v_max := v_limits.max_products_per_event;

  -- illimité
  if v_max is null then
    return;
  end if;

  select count(*)::int
    into v_count
  from public.event_products ep
  where ep.event_id = p_event_id;

  if v_count >= v_max then
    raise exception 'PLAN_LIMIT: max_products_per_event exceeded';
  end if;
end;$function$
;

CREATE OR REPLACE FUNCTION public.assert_can_create_paid_product(p_org_id uuid, p_event_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if not public.can_create_paid_product(p_org_id, p_event_id) then
    raise exception 'PLAN_LIMIT: paid_events_per_year exceeded';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.assert_event_registrations_limit_bulk(p_org_id uuid, p_event_id uuid, p_new_attendees integer)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$declare
  v_plan text;
  v_limits public.plan_limits%rowtype;
  v_max int;
  v_current int;
begin
  if p_new_attendees is null or p_new_attendees <= 0 then
    raise exception 'VALIDATION_ERROR: p_new_attendees must be > 0';
  end if;

  -- event doit exister + appartenir à l'org
  if not exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and e.org_id = p_org_id
  ) then
    raise exception 'NOT_FOUND: event';
  end if;

  -- (optionnel mais recommandé si appelé dans un flow d'insertion)
  -- sérialise les checks concurrents sur le même event
  perform 1
  from public.events e
  where e.id = p_event_id
  for update;

  v_plan := public.get_org_plan(p_org_id);

  select *
    into v_limits
  from public.plan_limits pl
  where pl.plan = v_plan;

  if not found then
    raise exception 'PLAN_LIMIT: unknown plan';
  end if;

  v_max := v_limits.max_registrations_per_event;

  -- illimité
  if v_max is null then
    return;
  end if;

  v_current := public.get_event_registrations_count(p_event_id);

  if v_current + p_new_attendees > v_max then
    raise exception
      'PLAN_LIMIT: registrations_per_event exceeded (limit %, current %, adding %)',
      v_max, v_current, p_new_attendees;
  end if;
end;$function$
;

CREATE OR REPLACE FUNCTION public.assert_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  perform private.assert_rate_limit(
    p_key,
    p_limit,
    p_window_seconds
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.can_create_paid_product(p_org_id uuid, p_event_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  v_plan text;
  v_limits public.plan_limits%rowtype;
  v_is_event_paid boolean;
  v_paid_events_count int;
  v_max_paid_events int;
begin
  -- éviter appels croisés
  if not exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and e.org_id = p_org_id
  ) then
    return false;
  end if;

  v_plan := public.get_org_plan(p_org_id);

  select * into v_limits
  from public.plan_limits pl
  where pl.plan = v_plan;

  if not found then
    return false;
  end if;

  -- déjà payant (acompte OU produit payant) => ne consomme rien de plus
  v_is_event_paid := public.is_event_paid(p_event_id);
  if v_is_event_paid then
    return true;
  end if;

  v_max_paid_events := v_limits.max_events_per_year;

  if v_max_paid_events is null then
    return true;
  end if;

  -- Compter les events payants sur l'année calendrier courante (dans cette org)
  select count(*)::int
    into v_paid_events_count
  from public.events e
  where e.org_id = p_org_id
    and date_part('year', e.created_at) = date_part('year', now())
    and public.is_event_paid(e.id);

  return v_paid_events_count < v_max_paid_events;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.check_in_ticket_internal(p_ticket_id uuid, p_event_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_ticket record;
  v_checked_in_at timestamptz := now();
begin
  /* ---------------- Validation ---------------- */

  if p_ticket_id is null then
    raise exception 'VALIDATION_ERROR: ticket_id required';
  end if;

  if p_event_id is null then
    raise exception 'VALIDATION_ERROR: event_id required';
  end if;

  /* ---------------- Auth ---------------- */

  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  /* ---------------- Lock + load ticket ---------------- */

  select
    t.id,
    t.event_id,
    t.order_id,
    t.order_item_id,
    t.product_id,
    t.ticket_index,
    t.qr_token,
    t.status,
    t.checked_in_at,
    t.checked_in_by,
    t.created_at
  into v_ticket
  from public.tickets t
  where t.id = p_ticket_id
  for update;

  if not found then
    raise exception 'TICKET_NOT_FOUND';
  end if;

  /* ---------------- Event scope guard ---------------- */

  if v_ticket.event_id is distinct from p_event_id then
    raise exception 'EVENT_MISMATCH';
  end if;

  /* ---------------- Membership ---------------- */

  if not public.is_event_org_member(v_ticket.event_id) then
    raise exception 'FORBIDDEN';
  end if;

  /* ---------------- Guards ---------------- */

  if coalesce(v_ticket.status, '') = 'invalid' then
    raise exception 'TICKET_INVALID';
  end if;

  if coalesce(v_ticket.status, '') = 'cancelled' then
    raise exception 'TICKET_CANCELLED';
  end if;

  if v_ticket.checked_in_at is not null then
    return jsonb_build_object(
      'ok', true,
      'outcome', 'already_checked',
      'ticketId', v_ticket.id,
      'eventId', v_ticket.event_id,
      'orderId', v_ticket.order_id,
      'ticketIndex', v_ticket.ticket_index,
      'qrToken', v_ticket.qr_token,
      'status', v_ticket.status,
      'checkedInAt', v_ticket.checked_in_at,
      'checkedInBy', v_ticket.checked_in_by
    );
  end if;

  /* ---------------- Update ---------------- */

  update public.tickets
  set
    status = 'checked_in',
    checked_in_at = v_checked_in_at,
    checked_in_by = v_user_id
  where id = p_ticket_id;

  /* ---------------- Return ---------------- */

  return jsonb_build_object(
    'ok', true,
    'outcome', 'validated',
    'ticketId', v_ticket.id,
    'eventId', v_ticket.event_id,
    'orderId', v_ticket.order_id,
    'ticketIndex', v_ticket.ticket_index,
    'qrToken', v_ticket.qr_token,
    'status', 'checked_in',
    'checkedInAt', v_checked_in_at,
    'checkedInBy', v_user_id
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.claim_order_confirmation_email(p_order_id uuid)
 RETURNS TABLE(ok boolean, order_id uuid, buyer_email text, booking_token text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_temp', 'private', 'public'
AS $function$
declare
  v_claimed uuid;
begin
  update public.orders o
  set confirmation_email_claimed_at = now(),
      confirmation_email_error = null
  where o.id = p_order_id
    and o.confirmation_email_sent_at is null
    and o.confirmation_email_claimed_at is null
  returning o.id into v_claimed;

  if v_claimed is null then
    return query select false, p_order_id, null, null;
    return;
  end if;

  return query
  select true, o.id, o.buyer_email, o.booking_token
  from public.orders o
  where o.id = p_order_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.consume_mollie_connect_state(p_state text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_row record;
  v_now timestamptz := now();
  v_exists boolean := false;
  v_used boolean := false;
  v_expired boolean := false;
begin
  /* ---------------- Hardening ---------------- */
  perform set_config('search_path', 'pg_temp, public, extensions, private', true);

  if p_state is null or btrim(p_state) = '' then
    raise exception 'VALIDATION_ERROR: state required';
  end if;

  update private.mollie_connect_states
     set used_at = v_now
   where state = p_state
     and used_at is null
     and expires_at > v_now
  returning org_id, user_id, mode, return_base_url
    into v_row;

  if not found then
    select
      exists(select 1 from private.mollie_connect_states s where s.state = p_state),
      exists(select 1 from private.mollie_connect_states s where s.state = p_state and s.used_at is not null),
      exists(select 1 from private.mollie_connect_states s where s.state = p_state and s.expires_at <= v_now)
    into v_exists, v_used, v_expired;

    raise exception 'INVALID_STATE: exists=% used=% expired=%', v_exists, v_used, v_expired;
  end if;

  return jsonb_build_object(
    'org_id', v_row.org_id,
    'user_id', v_row.user_id,
    'mode', v_row.mode,
    'return_base_url', v_row.return_base_url
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_event(p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$declare
  v_user_id uuid := auth.uid();
  v_event_id uuid;

  v_org_id uuid;
  v_title text;
  v_description text;
  v_location text;
  v_banner_url text;
  v_deposit_cents int4;
  v_max_attendees int4;
  v_starts_at timestamptz;
  v_ends_at timestamptz;

  v_slug text;

  v_now timestamptz := now();
begin
  -- 1) Auth
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- 2) Parse input (AVANT rights)
  v_org_id := nullif(trim(p_input->>'org_id'), '')::uuid;
  v_title := nullif(trim(p_input->>'title'), '');
  v_description := nullif(trim(p_input->>'description'), '');
  v_location := nullif(trim(p_input->>'location'), '');
  v_banner_url := nullif(trim(p_input->>'banner_url'), '');
  v_deposit_cents := nullif(trim(p_input->>'deposit_cents'), '')::int4;
  v_max_attendees := nullif(trim(p_input->>'max_attendees'), '')::int4;
  v_starts_at := nullif(trim(p_input->>'starts_at'), '')::timestamptz;
  v_ends_at := nullif(trim(p_input->>'ends_at'), '')::timestamptz;

  if v_org_id is null then
    raise exception 'VALIDATION_ERROR: org_id is required';
  end if;

  -- 3) Rights (idéalement admin/owner)
  if not exists (
    select 1
    from public.organization_members om
    where om.org_id = v_org_id
      and om.user_id = v_user_id
      and om.role in ('owner','admin')
  ) then
    raise exception 'FORBIDDEN';
  end if;

  -- 4) Validations
  if v_title is null then
    raise exception 'VALIDATION_ERROR: title is required';
  end if;

  if length(v_title) > 120 then
    raise exception 'VALIDATION_ERROR: title too long';
  end if;

  if v_location is not null and length(v_location) > 180 then
    raise exception 'VALIDATION_ERROR: location too long';
  end if;

  if v_description is not null and length(v_description) > 5000 then
    raise exception 'VALIDATION_ERROR: description too long';
  end if;

  if v_banner_url is not null and length(v_banner_url) > 500 then
    raise exception 'VALIDATION_ERROR: banner_url too long';
  end if;

  if v_deposit_cents is not null and v_deposit_cents < 0 then
    raise exception 'VALIDATION_ERROR: deposit_cents must be >= 0';
  end if;

  if v_max_attendees is not null and v_max_attendees < 0 then
    raise exception 'VALIDATION_ERROR: max_attendees must be >= 0';
  end if;

  if v_starts_at is not null and v_ends_at is not null and v_ends_at < v_starts_at then
    raise exception 'VALIDATION_ERROR: ends_at must be after starts_at';
  end if;

  -- 5) Rate limit
  perform public.assert_rate_limit('create_event:org:' || v_org_id::text, 20, 3600);

  -- 6) Plan limits
  v_slug := private.generate_unique_event_slug(v_org_id, v_title);

  insert into public.events (
    id, org_id, slug, title, description, location, banner_url,
    deposit_cents, max_attendees, starts_at, ends_at, is_published, created_at, updated_at
  )
  values (
    gen_random_uuid(), v_org_id, v_slug, v_title, v_description, v_location, v_banner_url,
    v_deposit_cents, v_max_attendees, v_starts_at, v_ends_at, false, v_now, v_now
  )
  returning id into v_event_id;

  -- ✅ Plan limit: acompte => event payant
  if coalesce(v_deposit_cents, 0) > 0 then
    perform public.assert_can_create_paid_product(v_org_id, v_event_id);
  end if;

  perform public.assert_can_add_product(v_org_id, v_event_id);

  for i in 1..10 loop
    perform public.assert_can_add_form_field(v_org_id, v_event_id);
  end loop;

  insert into public.event_form_fields (
    event_id, label, field_key, field_type, is_required,
    sort_order, is_active, created_at, updated_at
  ) values
    (v_event_id, 'Nom', 'last_name', 'text', true, 1, true, v_now, v_now),
    (v_event_id, 'Prénom', 'first_name', 'text', true, 2, true, v_now, v_now),
    (v_event_id, 'Date de naissance', 'birth_date', 'date', false, 3, true, v_now, v_now),
    (v_event_id, 'Adresse', 'address_line1', 'text', false, 4, true, v_now, v_now),
    (v_event_id, 'Complément d’adresse', 'address_line2', 'text', false, 5, true, v_now, v_now),
    (v_event_id, 'Code postal', 'postal_code', 'text', false, 6, true, v_now, v_now),
    (v_event_id, 'Ville', 'city', 'text', false, 7, true, v_now, v_now),
    (v_event_id, 'Pays', 'country_code', 'country', false, 8, true, v_now, v_now),
    (v_event_id, 'Téléphone', 'phone', 'phone', false, 9, true, v_now, v_now),
    (v_event_id, 'Email', 'email', 'email', true, 10, true, v_now, v_now);

  insert into public.event_products (
    id, event_id, name, description, price_cents, currency,
    stock_qty, creates_attendees, attendees_per_unit,
    is_active, sort_order, created_at, updated_at
  )
  values (
    gen_random_uuid(),
    v_event_id,
    'Ticket gratuit',
    'Accès à l’événement',
    0,
    'EUR',
    null,
    true,
    1,
    true,
    1,
    v_now,
    v_now
  );

  return jsonb_build_object(
    'id', v_event_id,
    'orgId', v_org_id,
    'slug', v_slug,
    'title', v_title,
    'description', v_description,
    'location', v_location,
    'bannerUrl', v_banner_url,
    'depositCents', v_deposit_cents,
    'maxAttendees', v_max_attendees,
    'startsAt', v_starts_at,
    'endsAt', v_ends_at,
    'isPublished', false,
    'createdAt', v_now,
    'updatedAt', v_now
  );
exception
  when unique_violation then
    raise exception 'CONFLICT';
end;$function$
;

CREATE OR REPLACE FUNCTION public.create_event_form_field(p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$declare
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

  if v_field_key is null then
    raise exception 'VALIDATION_ERROR: field_key is required';
  end if;

  if length(v_field_key) > 64 then
    raise exception 'VALIDATION_ERROR: field_key too long';
  end if;

  if v_field_key !~ '^[a-z][a-z0-9_]*$' then
    raise exception 'VALIDATION_ERROR: field_key format invalid';
  end if;

  if v_field_type is null then
    raise exception 'VALIDATION_ERROR: field_type is required';
  end if;

  if v_field_type not in (
    'text','email','phone','date','country','select','checkbox','textarea','radio','number'
  ) then
    raise exception 'VALIDATION_ERROR: field_type invalid';
  end if;

  if v_sort_order is not null and (v_sort_order < 0 or v_sort_order > 1000) then
    raise exception 'VALIDATION_ERROR: sort_order invalid';
  end if;

  /* -------------------------------------------------- */
  /* 4) Options rules                                   */
  /* -------------------------------------------------- */
  if v_field_type in ('select','radio') then
    if v_options is null then
      raise exception 'VALIDATION_ERROR: options is required for %', v_field_type;
    end if;

    if jsonb_typeof(v_options) <> 'array' then
      raise exception 'VALIDATION_ERROR: options must be an array for %', v_field_type;
    end if;

    if jsonb_array_length(v_options) < 1 then
      raise exception 'VALIDATION_ERROR: options must contain at least one item';
    end if;
  else
    v_options := null;
  end if;

  /* -------------------------------------------------- */
  /* 5) Resolve org via event                           */
  /* -------------------------------------------------- */
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

  /* -------------------------------------------------- */
  /* 6) Validate group ownership                        */
  /* -------------------------------------------------- */
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

  /* -------------------------------------------------- */
  /* 7) Default sort_order                              */
  /* -------------------------------------------------- */
  if v_sort_order is null then
    select coalesce(max(f.sort_order), 0) + 1
      into v_sort_order
    from public.event_form_fields f
    where f.event_id = v_event_id;
  end if;

  /* -------------------------------------------------- */
  /* 8) Uniqueness field_key per event                  */
  /* -------------------------------------------------- */
  if exists (
    select 1
    from public.event_form_fields f
    where f.event_id = v_event_id
      and f.field_key = v_field_key
  ) then
    raise exception 'CONFLICT: field_key already exists';
  end if;

  /* -------------------------------------------------- */
  /* 9) Insert                                          */
  /* -------------------------------------------------- */
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
end;$function$
;

CREATE OR REPLACE FUNCTION public.create_event_form_field_group(p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_user_id uuid := auth.uid();

  v_event_id uuid;
  v_org_id uuid;

  v_label text;
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
    sort_order,
    is_active,
    created_at,
    updated_at
  ) values (
    v_new_id,
    v_event_id,
    v_label,
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
    'sort_order', v_sort_order,
    'is_active', v_is_active,
    'created_at', v_now::text,
    'updated_at', v_now::text
  );

exception
  when unique_violation then
    raise exception 'CONFLICT';
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_event_product(p_input jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$declare
  v_user_id uuid := auth.uid();
  v_product_id uuid;

  v_event_id uuid;
  v_name text;
  v_description text;
  v_price_cents int;
  v_currency text;
  v_stock_qty int;
  v_is_active boolean;
  v_sort_order int;
  v_creates_attendees boolean;
  v_attendees_per_unit int;

  v_is_gatekeeper boolean;
  v_close_event_when_sold_out boolean;

  v_org_id uuid;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  /* ------------------------------
   * Parse input
   * ------------------------------ */
  v_event_id := nullif(trim(p_input->>'event_id'), '')::uuid;
  v_name := nullif(trim(p_input->>'name'), '');
  v_description := nullif(trim(p_input->>'description'), '');
  v_price_cents := nullif(trim(p_input->>'price_cents'), '')::int;
  v_currency := upper(coalesce(nullif(trim(p_input->>'currency'), ''), 'EUR'));

  v_stock_qty := nullif(trim(p_input->>'stock_qty'), '')::int;
if v_stock_qty = 0 then
  v_stock_qty := null;
end if;

if v_stock_qty is not null and v_stock_qty < 0 then
  raise exception 'VALIDATION_ERROR: stock_qty must be >= 0';
end if;

v_is_active := coalesce((p_input->>'is_active')::boolean, true);  v_sort_order := coalesce(nullif(trim(p_input->>'sort_order'), '')::int, 1);
  v_creates_attendees := coalesce((p_input->>'creates_attendees')::boolean, true);
  v_attendees_per_unit := coalesce(nullif(trim(p_input->>'attendees_per_unit'), '')::int, 1);
  v_is_gatekeeper := coalesce((p_input->>'is_gatekeeper')::boolean, false);
  v_close_event_when_sold_out := coalesce((p_input->>'close_event_when_sold_out')::boolean, false);

  /* ------------------------------
   * Validations
   * ------------------------------ */
  if v_event_id is null then
    raise exception 'VALIDATION_ERROR: event_id is required';
  end if;

  if v_name is null then
    raise exception 'VALIDATION_ERROR: name is required';
  end if;

  if length(v_name) > 80 then
    raise exception 'VALIDATION_ERROR: name too long';
  end if;

  if v_price_cents is null or v_price_cents < 0 then
    raise exception 'VALIDATION_ERROR: price_cents must be >= 0';
  end if;

  if v_currency <> 'EUR' then
    raise exception 'VALIDATION_ERROR: unsupported currency';
  end if;

  if v_creates_attendees and (v_attendees_per_unit is null or v_attendees_per_unit < 1) then
    raise exception 'VALIDATION_ERROR: attendees_per_unit must be >= 1';
  end if;

  if v_close_event_when_sold_out and not v_is_gatekeeper then
    raise exception 'VALIDATION_ERROR: close_event_when_sold_out requires is_gatekeeper=true';
  end if;

  /* ------------------------------
   * Resolve org_id via event
   * ------------------------------ */
  select e.org_id
    into v_org_id
  from public.events e
  where e.id = v_event_id;

  if v_org_id is null then
    raise exception 'NOT_FOUND';
  end if;

  /* ------------------------------
   * Authorization
   * ------------------------------ */
  if not public.is_org_member(v_org_id) then
  raise exception 'FORBIDDEN';
end if;

  /* ------------------------------
   * Rate limit
   * ------------------------------ */
  perform public.assert_rate_limit(
    'create_product:org:' || v_org_id::text || ':user:' || v_user_id::text,
    100,
    3600
  );

  /* ------------------------------
   * Plan limits
   * ------------------------------ */

  -- 1) max products per event
  perform public.assert_can_add_product(v_org_id, v_event_id);

  -- 2) paid events per year (only when creating a paid product)
  if v_price_cents > 0 then
    perform public.assert_can_create_paid_product(v_org_id, v_event_id);
  end if;

  /* ------------------------------
   * Insert
   * ------------------------------ */
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
    is_gatekeeper,
    close_event_when_sold_out,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    v_event_id,
    v_name,
    v_description,
    v_price_cents,
    v_currency,
    v_stock_qty,
    v_is_active,
    v_sort_order,
    v_creates_attendees,
    v_attendees_per_unit,
    v_is_gatekeeper,
    v_close_event_when_sold_out,
    now(),
    now()
  )
  returning id into v_product_id;

  return v_product_id;
end;$function$
;

CREATE OR REPLACE FUNCTION public.create_mollie_connect_state(p_org_id uuid, p_mode text, p_return_base_url text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_uid uuid := auth.uid();
  v_state text := encode(extensions.gen_random_bytes(24), 'hex');
  v_mode text := lower(trim(p_mode));
  v_return text := nullif(btrim(p_return_base_url), '');
  v_allowed boolean := false;
begin
  /* ---------------- Hardening ---------------- */
  perform set_config('search_path', 'pg_temp, public, extensions, private', true);

  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_org_id is null then
    raise exception 'VALIDATION_ERROR: org_id required';
  end if;

  if v_mode not in ('test','live') then
    raise exception 'VALIDATION_ERROR: mode must be test|live';
  end if;

  if v_return is null then
    raise exception 'VALIDATION_ERROR: return_base_url required';
  end if;

  -- validation légère (origin strict: scheme+host(+port))
  if v_return !~* '^https?://[a-z0-9\.\-]+(?::[0-9]{2,5})?$' then
    raise exception 'VALIDATION_ERROR: invalid return_base_url';
  end if;

  -- allowlist DB
  select exists(
    select 1
    from public.allowed_return_origins o
    where o.origin = v_return and o.is_enabled = true
  ) into v_allowed;

  if not v_allowed then
    raise exception 'VALIDATION_ERROR: return_base_url not allowed';
  end if;

  -- authorization: user is owner/admin of org
  if not exists (
    select 1
    from public.organization_members om
    where om.org_id = p_org_id
      and om.user_id = v_uid
      and om.role in ('owner','admin')
  ) then
    raise exception 'FORBIDDEN';
  end if;

  insert into private.mollie_connect_states(
    state, org_id, user_id, mode, return_base_url, expires_at, created_at
  )
  values (
    v_state, p_org_id, v_uid, v_mode, v_return, now() + interval '15 minutes', now()
  );

  return jsonb_build_object(
    'state', v_state,
    'mode', v_mode,
    'return_base_url', v_return
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_order_intent(p_event_id uuid, p_items jsonb, p_attendees jsonb, p_buyer jsonb, p_rate_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'extensions'
AS $function$declare
  v_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
  v_rate_key text := nullif(trim(p_rate_key), '');

  v_order_id uuid;
  v_booking_token text;

  v_currency text;
  v_total_cents int := 0;
  v_requires_payment boolean := false;

  v_deposit_cents int;
  v_amount_due_now_cents int;

  v_item jsonb;
  v_att jsonb;
  v_ans jsonb;

  v_event_product_id uuid;
  v_qty int;

  v_price_cents int;
  v_stock_qty int;
  v_reserved_qty int;
  v_sold_qty int;
  v_attendees_per_unit int;
  v_creates_attendees boolean;

  v_expected_attendees_total int := 0;
  v_max_attendees int;
  v_current_attendees_total int := 0;

  v_order_item_id uuid;
  v_attendee_id uuid;

  v_item_currency text;
  v_product_name text;

  v_event record;
  v_attendee_index int := 0;

  /* ---------------- Gatekeepers ---------------- */
  v_event_has_gatekeeper boolean := false;
  v_order_has_gatekeeper boolean := false;
  v_close_event_gatekeeper_sold_out boolean := false;

  v_is_gatekeeper boolean;
  v_close_event_when_sold_out boolean;

  /* ---------------- answers mapping ---------------- */
  v_field_key text;
  v_field_id uuid;
  v_has_key boolean;
  v_eff record;

  /* ---------------- buyer (contact principal) ---------------- */
  v_buyer_email text;
  v_buyer_name text;
  v_buyer_phone text;
  v_buyer_is_attendee boolean := false;

begin

  perform set_config('search_path', 'pg_temp, public, extensions', true);

  /* ---------------- Guardrails (rate limit) ---------------- */
  if v_rate_key is null then
    -- contexte "admin" (ou backend interne)
    perform public.assert_rate_limit('svc:create_order_intent:event:' || p_event_id::text, 500, 60);
  else
    -- contexte "public"
    perform public.assert_rate_limit('pub:create_order_intent:' || v_rate_key, 30, 60);
  end if;

  /* ---------------- Event guardrails ---------------- */
  select *
  into v_event
  from public.events e
  where e.id = p_event_id
  limit 1;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if coalesce(v_event.is_published, false) is not true then
    raise exception 'EVENT_NOT_PUBLISHED';
  end if;

  if v_event.ends_at is not null and v_event.ends_at <= now() then
    raise exception 'EVENT_ENDED';
  end if;

  /* ---------------- Input ---------------- */
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'VALIDATION_ERROR: p_items must be a non-empty array';
  end if;

  if p_attendees is null or jsonb_typeof(p_attendees) <> 'array' then
    raise exception 'VALIDATION_ERROR: p_attendees must be an array';
  end if;

  if jsonb_array_length(p_items) > 50 then
    raise exception 'VALIDATION_ERROR: too many items';
  end if;

  if jsonb_array_length(p_attendees) > 500 then
    raise exception 'VALIDATION_ERROR: too many attendees';
  end if;

  -- secure gen_random_bytes via extensions schema
  v_booking_token := encode(extensions.gen_random_bytes(16), 'hex');

  create temporary table if not exists pg_temp._order_item_map (
    event_product_id uuid not null,
    order_item_id uuid not null,
    remaining_slots int not null
  ) on commit drop;

  truncate table pg_temp._order_item_map;

  /* ---------------- Gatekeeper pre-check ---------------- */
  select exists (
    select 1
    from public.event_products ep
    where ep.event_id = p_event_id
      and ep.is_active = true
      and ep.is_gatekeeper = true
  )
  into v_event_has_gatekeeper;

  /* -------------------------------------------------
   * 1) Lock products + compute total + stock check
   * ------------------------------------------------- */
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if (v_item ? 'event_product_id') is not true or (v_item ? 'quantity') is not true then
      raise exception 'VALIDATION_ERROR: invalid items';
    end if;

    begin
      v_event_product_id := (v_item->>'event_product_id')::uuid;
      v_qty := (v_item->>'quantity')::int;
    exception when others then
      raise exception 'VALIDATION_ERROR: invalid items';
    end;

    if v_qty is null or v_qty < 1 or v_qty > 100 then
      raise exception 'VALIDATION_ERROR: invalid quantity';
    end if;

    select
      ep.price_cents,
      ep.currency,
      ep.stock_qty,
      ep.reserved_qty,
      ep.sold_qty,
      ep.attendees_per_unit,
      ep.creates_attendees,
      ep.is_gatekeeper,
      ep.close_event_when_sold_out
    into
      v_price_cents,
      v_item_currency,
      v_stock_qty,
      v_reserved_qty,
      v_sold_qty,
      v_attendees_per_unit,
      v_creates_attendees,
      v_is_gatekeeper,
      v_close_event_when_sold_out
    from public.event_products ep
    where ep.id = v_event_product_id
      and ep.event_id = p_event_id
      and ep.is_active = true
    for update;

    if not found then
      raise exception 'NOT_FOUND';
    end if;

    if v_currency is null then
      v_currency := v_item_currency;
    elsif v_item_currency is distinct from v_currency then
      raise exception 'VALIDATION_ERROR: currency mismatch';
    end if;

    if v_stock_qty is not null then
      if (coalesce(v_reserved_qty, 0) + coalesce(v_sold_qty, 0) + v_qty) > v_stock_qty then
        raise exception 'INSUFFICIENT_STOCK';
      end if;
    end if;

    if coalesce(v_is_gatekeeper, false) then
      v_order_has_gatekeeper := true;
    end if;

    if coalesce(v_is_gatekeeper, false)
       and coalesce(v_close_event_when_sold_out, false)
       and v_stock_qty is not null
       and (coalesce(v_reserved_qty, 0) + coalesce(v_sold_qty, 0)) >= v_stock_qty then
      v_close_event_gatekeeper_sold_out := true;
    end if;

    v_total_cents := v_total_cents + (coalesce(v_price_cents, 0) * v_qty);

    if coalesce(v_creates_attendees, true) then
      v_expected_attendees_total :=
        v_expected_attendees_total + (v_qty * greatest(1, coalesce(v_attendees_per_unit, 1)));
    end if;
  end loop;

  if v_close_event_gatekeeper_sold_out then
    raise exception 'EVENT_SOLD_OUT';
  end if;

  if v_event_has_gatekeeper and not v_order_has_gatekeeper then
    raise exception 'MISSING_GATEKEEPER_PRODUCT';
  end if;

  if v_expected_attendees_total <> jsonb_array_length(p_attendees) then
    raise exception 'VALIDATION_ERROR: attendees count mismatch';
  end if;

  /* -------------------------------------------------
   * Plan limit: registrations per event (bulk)
   * + lock event row to reduce race conditions
   * ------------------------------------------------- */
  perform 1
  from public.events e
  where e.id = p_event_id
  for update;

  perform public.assert_event_registrations_limit_bulk(
    v_event.org_id,
    p_event_id,
    v_expected_attendees_total
  );

  /* -------------------------------------------------
   * Global attendees cap
   * ------------------------------------------------- */
  v_max_attendees := v_event.max_attendees;

  if v_max_attendees is not null then
    select coalesce(sum(
      (coalesce(ep.sold_qty, 0) + coalesce(ep.reserved_qty, 0))
      * greatest(1, coalesce(ep.attendees_per_unit, 1))
    ), 0)
    into v_current_attendees_total
    from public.event_products ep
    where ep.event_id = p_event_id
      and ep.is_active = true
      and coalesce(ep.creates_attendees, true) = true;

    if v_current_attendees_total + v_expected_attendees_total > v_max_attendees then
      raise exception 'MAX_ATTENDEES_REACHED';
    end if;
  end if;

  v_requires_payment := (v_total_cents > 0);

  /* ---------------- Deposit snapshot ---------------- */
  v_deposit_cents := v_event.deposit_cents;

  v_amount_due_now_cents :=
    case
      when not v_requires_payment then 0
      when v_deposit_cents is null or v_deposit_cents <= 0 then v_total_cents
      else least(v_total_cents, v_deposit_cents)
    end;

  /* ---------------- Buyer (contact principal) ---------------- */
  -- p_buyer = { email?, name?, phone?, is_attendee? }
  v_buyer_email := nullif(trim(coalesce(p_buyer->>'email', '')), '');
  v_buyer_name  := nullif(trim(coalesce(p_buyer->>'name', '')), '');
  v_buyer_phone := nullif(trim(coalesce(p_buyer->>'phone', '')), '');

  if (p_buyer ? 'is_attendee') then
    v_buyer_is_attendee := (p_buyer->>'is_attendee')::boolean;
  end if;

  -- fallback si pas fourni
  if v_buyer_email is null then
    v_buyer_email := nullif(trim(coalesce(p_attendees->0->>'email', '')), '');
    v_buyer_is_attendee := true;
  end if;

  if v_buyer_phone is null then
    v_buyer_phone := nullif(trim(coalesce(p_attendees->0->>'phone', '')), '');
  end if;

  if v_buyer_name is null then
    v_buyer_name := trim(concat_ws(
      ' ',
      nullif(trim(coalesce(p_attendees->0->>'first_name', '')), ''),
      nullif(trim(coalesce(p_attendees->0->>'last_name', '')), '')
    ));
  end if;

  if v_buyer_name is null or v_buyer_name = '' then
    v_buyer_name := 'Participant';
  end if;

  /* ---------------- Create order ---------------- */
  insert into public.orders (
    org_id,
    event_id,
    buyer_name,
    buyer_email,
    buyer_phone,
    buyer_is_attendee,
    booking_token,
    currency,
    total_cents,
    paid_cents,
    status,
    expires_at,
    confirmed_at,
    deposit_due_cents_snapshot
  )
  values (
    v_event.org_id,
    p_event_id,
    v_buyer_name,
    v_buyer_email,
    v_buyer_phone,
    v_buyer_is_attendee,
    v_booking_token,
    v_currency,
    v_total_cents,
    case when v_requires_payment then 0 else v_total_cents end,
    case when v_requires_payment then 'awaiting_payment' else 'paid' end,
    case when v_requires_payment then now() + interval '20 minutes' else null end,
    case when v_requires_payment then null else now() end,
    v_amount_due_now_cents
  )
  returning id into v_order_id;

  /* -------------------------------------------------
   * Create order_items + reserve/sell stock
   * + build pg_temp._order_item_map for attendee allocation
   * ------------------------------------------------- */
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if (v_item ? 'event_product_id') is not true or (v_item ? 'quantity') is not true then
      raise exception 'VALIDATION_ERROR: invalid items';
    end if;

    begin
      v_event_product_id := (v_item->>'event_product_id')::uuid;
      v_qty := (v_item->>'quantity')::int;
    exception when others then
      raise exception 'VALIDATION_ERROR: invalid items';
    end;

    if v_qty is null or v_qty < 1 or v_qty > 100 then
      raise exception 'VALIDATION_ERROR: invalid quantity';
    end if;

    select
      ep.price_cents,
      ep.attendees_per_unit,
      ep.creates_attendees,
      ep.name
    into
      v_price_cents,
      v_attendees_per_unit,
      v_creates_attendees,
      v_product_name
    from public.event_products ep
    where ep.id = v_event_product_id
      and ep.event_id = p_event_id
      and ep.is_active = true
    for update;

    if not found then
      raise exception 'NOT_FOUND';
    end if;

    insert into public.order_items (
      id,
      order_id,
      product_id,
      product_name_snapshot,
      unit_price_cents_snapshot,
      quantity,
      created_at
    )
    values (
      gen_random_uuid(),
      v_order_id,
      v_event_product_id,
      v_product_name,
      v_price_cents,
      v_qty,
      now()
    )
    returning id into v_order_item_id;

    if v_requires_payment then
      update public.event_products
      set reserved_qty = coalesce(reserved_qty, 0) + v_qty
      where id = v_event_product_id;
    else
      update public.event_products
      set sold_qty = coalesce(sold_qty, 0) + v_qty
      where id = v_event_product_id;
    end if;

    if coalesce(v_creates_attendees, true) then
      insert into pg_temp._order_item_map(event_product_id, order_item_id, remaining_slots)
      values (
        v_event_product_id,
        v_order_item_id,
        v_qty * greatest(1, coalesce(v_attendees_per_unit, 1))
      );
    end if;
  end loop;

  /* -------------------------------------------------
   * Create attendees + answers
   * ------------------------------------------------- */
  v_attendee_index := 0;

  for v_att in select * from jsonb_array_elements(p_attendees)
  loop
    v_attendee_index := v_attendee_index + 1;

    if (v_att ? 'event_product_id') is not true then
      raise exception 'VALIDATION_ERROR: invalid attendees';
    end if;

    begin
      v_event_product_id := (v_att->>'event_product_id')::uuid;
    exception when others then
      raise exception 'VALIDATION_ERROR: invalid attendees';
    end;

    select m.order_item_id
    into v_order_item_id
    from pg_temp._order_item_map m
    where m.event_product_id = v_event_product_id
      and m.remaining_slots > 0
    order by m.order_item_id
    limit 1;

    if v_order_item_id is null then
      raise exception 'VALIDATION_ERROR: attendee allocation mismatch';
    end if;

    update pg_temp._order_item_map
    set remaining_slots = remaining_slots - 1
    where event_product_id = v_event_product_id
      and order_item_id = v_order_item_id;

    select ep.name
    into v_product_name
    from public.event_products ep
    where ep.id = v_event_product_id
    limit 1;

    insert into public.order_attendees (
      id,
      order_id,
      product_id,
      product_name_snapshot,
      attendee_index,
      status,
      details_completed_at,
      confirmed_at,
      canceled_at,
      created_at
    )
    values (
      gen_random_uuid(),
      v_order_id,
      v_event_product_id,
      v_product_name,
      v_attendee_index,
      case when v_requires_payment then 'reserved' else 'confirmed' end,
      null,
      case when v_requires_payment then null else now() end,
      null,
      now()
    )
    returning id into v_attendee_id;

    /* -------------------------------------------------
     * Helper: insert answer by field_key (no duplicates)
     * ------------------------------------------------- */

    -- email
    if (v_att ? 'email') and nullif(trim(coalesce(v_att->>'email','')), '') is not null then
      select exists (
        select 1
        from public.event_form_fields eff
        where eff.event_id = p_event_id
          and eff.is_active = true
          and eff.field_key = 'email'
      ) into v_has_key;

      if v_has_key then
        insert into public.order_attendee_answers (
          id, attendee_id, field_key_snapshot, field_label_snapshot, field_type_snapshot, value, created_at, updated_at
        )
        select
          gen_random_uuid(),
          v_attendee_id,
          eff.field_key,
          eff.label,
          eff.field_type,
          jsonb_build_object('value_text', nullif(trim(v_att->>'email'), '')),
          now(),
          now()
        from public.event_form_fields eff
        where eff.event_id = p_event_id
          and eff.is_active = true
          and eff.field_key = 'email'
          and not exists (
            select 1
            from public.order_attendee_answers oa
            where oa.attendee_id = v_attendee_id
              and oa.field_key_snapshot = eff.field_key
          );
      end if;
    end if;

    -- phone
    if (v_att ? 'phone') and nullif(trim(coalesce(v_att->>'phone','')), '') is not null then
      select exists (
        select 1
        from public.event_form_fields eff
        where eff.event_id = p_event_id
          and eff.is_active = true
          and eff.field_key = 'phone'
      ) into v_has_key;

      if v_has_key then
        insert into public.order_attendee_answers (
          id, attendee_id, field_key_snapshot, field_label_snapshot, field_type_snapshot, value, created_at, updated_at
        )
        select
          gen_random_uuid(),
          v_attendee_id,
          eff.field_key,
          eff.label,
          eff.field_type,
          jsonb_build_object('value_text', nullif(trim(v_att->>'phone'), '')),
          now(),
          now()
        from public.event_form_fields eff
        where eff.event_id = p_event_id
          and eff.is_active = true
          and eff.field_key = 'phone'
          and not exists (
            select 1
            from public.order_attendee_answers oa
            where oa.attendee_id = v_attendee_id
              and oa.field_key_snapshot = eff.field_key
          );
      end if;
    end if;

    -- first_name
    if (v_att ? 'first_name') and nullif(trim(coalesce(v_att->>'first_name','')), '') is not null then
      select exists (
        select 1
        from public.event_form_fields eff
        where eff.event_id = p_event_id
          and eff.is_active = true
          and eff.field_key = 'first_name'
      ) into v_has_key;

      if v_has_key then
        insert into public.order_attendee_answers (
          id, attendee_id, field_key_snapshot, field_label_snapshot, field_type_snapshot, value, created_at, updated_at
        )
        select
          gen_random_uuid(),
          v_attendee_id,
          eff.field_key,
          eff.label,
          eff.field_type,
          jsonb_build_object('value_text', nullif(trim(v_att->>'first_name'), '')),
          now(),
          now()
        from public.event_form_fields eff
        where eff.event_id = p_event_id
          and eff.is_active = true
          and eff.field_key = 'first_name'
          and not exists (
            select 1
            from public.order_attendee_answers oa
            where oa.attendee_id = v_attendee_id
              and oa.field_key_snapshot = eff.field_key
          );
      end if;
    end if;

    -- last_name
    if (v_att ? 'last_name') and nullif(trim(coalesce(v_att->>'last_name','')), '') is not null then
      select exists (
        select 1
        from public.event_form_fields eff
        where eff.event_id = p_event_id
          and eff.is_active = true
          and eff.field_key = 'last_name'
      ) into v_has_key;

      if v_has_key then
        insert into public.order_attendee_answers (
          id, attendee_id, field_key_snapshot, field_label_snapshot, field_type_snapshot, value, created_at, updated_at
        )
        select
          gen_random_uuid(),
          v_attendee_id,
          eff.field_key,
          eff.label,
          eff.field_type,
          jsonb_build_object('value_text', nullif(trim(v_att->>'last_name'), '')),
          now(),
          now()
        from public.event_form_fields eff
        where eff.event_id = p_event_id
          and eff.is_active = true
          and eff.field_key = 'last_name'
          and not exists (
            select 1
            from public.order_attendee_answers oa
            where oa.attendee_id = v_attendee_id
              and oa.field_key_snapshot = eff.field_key
          );
      end if;
    end if;

    /* -------------------------------------------------
     * answers array: supports:
     * - { field_key: "x", value_text/... }
     * - { event_form_field_id: "uuid", value_text/... }
     * - { value: <jsonb> } (direct)
     * ------------------------------------------------- */
    if (v_att ? 'answers') and jsonb_typeof(v_att->'answers') = 'array' then
      for v_ans in select * from jsonb_array_elements(v_att->'answers')
      loop
        -- reset à CHAQUE answer
        v_field_key := null;
        v_field_id := null;

        v_field_key := nullif(
          trim(
            coalesce(
              v_ans->>'field_key',
              v_ans->>'fieldKey',
              ''
            )
          ),
          ''
        );

        if (v_ans ? 'event_form_field_id') or (v_ans ? 'eventFormFieldId') then
          begin
            v_field_id := nullif(
              trim(
                coalesce(
                  v_ans->>'event_form_field_id',
                  v_ans->>'eventFormFieldId',
                  ''
                )
              ),
              ''
            )::uuid;
          exception when others then
            raise exception 'VALIDATION_ERROR: invalid answers';
          end;
        end if;

        if v_field_key is null and v_field_id is null then
          raise exception 'VALIDATION_ERROR: invalid answers';
        end if;

        select eff.*
        into v_eff
        from public.event_form_fields eff
        where eff.event_id = p_event_id
          and eff.is_active = true
          and (
            (v_field_id is not null and eff.id = v_field_id)
            or
            (v_field_key is not null and eff.field_key = v_field_key)
          )
        limit 1;

        if not found then
          raise exception 'VALIDATION_ERROR: invalid answers';
        end if;

        insert into public.order_attendee_answers (
          id,
          attendee_id,
          field_key_snapshot,
          field_label_snapshot,
          field_type_snapshot,
          value,
          created_at,
          updated_at
        )
        values (
          gen_random_uuid(),
          v_attendee_id,
          v_eff.field_key,
          v_eff.label,
          v_eff.field_type,
          coalesce(
            v_ans->'value',
            jsonb_build_object(
              'value_text', nullif(trim(coalesce(v_ans->>'value_text','')), ''),
              'value_int',  case when (v_ans ? 'value_int') and nullif(trim(coalesce(v_ans->>'value_int','')), '') is not null
                                 then (v_ans->>'value_int')::int else null end,
              'value_bool', case when (v_ans ? 'value_bool') and nullif(trim(coalesce(v_ans->>'value_bool','')), '') is not null
                                 then (v_ans->>'value_bool')::boolean else null end,
              'value_date', nullif(trim(coalesce(v_ans->>'value_date','')), '')
            )
          ),
          now(),
          now()
        );
      end loop;
    end if;

  end loop;

  return jsonb_build_object(
    'order_id', v_order_id,
    'booking_token', v_booking_token,
    'payment_required', v_requires_payment,
    'total_cents', v_total_cents,
    'amount_due_now_cents', v_amount_due_now_cents,
    'deposit_due_cents_snapshot', v_amount_due_now_cents,
    'currency', v_currency,
    'status', case when v_requires_payment then 'awaiting_payment' else 'paid' end,
    'expires_at', (select expires_at from public.orders where id = v_order_id)
  );
end;$function$
;

CREATE OR REPLACE FUNCTION public.create_organization(p_input jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;

  v_type text;
  v_name text;

  v_slug text;

  v_existing_org uuid;
begin
  -- 1) Auth
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- 2) 1 org / user (guard applicatif + DB unique index en backup)
  select id into v_existing_org
  from public.organizations
  where created_by = v_user_id
  limit 1;

  if v_existing_org is not null then
    raise exception 'ORG_ALREADY_EXISTS';
  end if;

  -- 3) Rate limit (3 / heure / user)
  perform public.assert_rate_limit('create_org:user:' || v_user_id::text, 3, 3600);

  -- 4) Input parsing
  v_type := nullif(trim(p_input->>'type'), '');
  v_name := nullif(trim(p_input->>'name'), '');

  if v_type is null then
    raise exception 'VALIDATION_ERROR: type is required';
  end if;

  if v_name is null then
    raise exception 'VALIDATION_ERROR: name is required';
  end if;

  -- 5) Whitelists / contraintes
  -- ➜ adapte la liste à ton besoin réel
  if v_type not in ('association', 'person') then
    raise exception 'VALIDATION_ERROR: invalid type';
  end if;

  if length(v_name) > 80 then
    raise exception 'VALIDATION_ERROR: name too long';
  end if;

  -- 6) Slug unique (helper privé)
  v_slug := private.generate_unique_org_slug(v_name);

  -- 7) Insert organizations (valeurs serveur pour éviter les états chelous)
  insert into public.organizations (
    id,
    type,
    name,
    status,
    created_by,
    payments_provider,
    payments_status,
    payments_live_ready,
    plan,
    plan_started_at,
    created_at
  )
  values (
    gen_random_uuid(),
    v_type,
    v_name,
    'active',
    v_user_id,
    'mollie',
    'not_connected',
    false,
    'free',
    now(),
    now()
  )
  returning id into v_org_id;

  -- 8) Insert owner membership
  insert into public.organization_members (org_id, user_id, role, created_at)
  values (v_org_id, v_user_id, 'owner', now());

  -- 9) Insert org profile
  insert into public.organization_profile (
    org_id,
    slug,
    display_name,
    created_at,
    updated_at
  )
  values (
    v_org_id,
    v_slug,
    v_name,
    now(),
    now()
  );

  return v_org_id;

exception
  when unique_violation then
    -- au cas où l’index unique created_by ou le slug unique saute
    raise exception 'CONFLICT';
end;$function$
;

CREATE OR REPLACE FUNCTION public.create_subscription_intent(p_org_id uuid, p_plan text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_plan text := lower(trim(coalesce(p_plan, '')));
  v_sub public.subscriptions%rowtype;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_org_id is null then
    raise exception 'VALIDATION_ERROR: org_id is required';
  end if;

  if v_plan = '' then
    raise exception 'VALIDATION_ERROR: plan is required';
  end if;

  -- Interdiction de créer un intent pour free
  if v_plan = 'free' then
    raise exception 'VALIDATION_ERROR: cannot create intent for free';
  end if;

  -- Plan whitelist (source de vérité)
  if not exists (
    select 1
    from public.plan_limits pl
    where pl.plan = v_plan
  ) then
    raise exception 'VALIDATION_ERROR: unknown plan';
  end if;

  -- AuthZ: owner/admin sur l'org
  if not exists (
    select 1
    from public.organization_members om
    where om.org_id = p_org_id
      and om.user_id = v_uid
      and om.role in ('owner','admin')
  ) then
    raise exception 'FORBIDDEN';
  end if;

  -- Rate limit
  perform public.assert_rate_limit(
    'create_subscription_intent:org:' || p_org_id::text || ':user:' || v_uid::text,
    20,
    3600
  );

  insert into public.subscriptions (
    org_id, provider, plan, status, created_at, updated_at
  )
  values (
    p_org_id, 'mollie', v_plan, 'pending', now(), now()
  )
  on conflict (org_id)
  do update set
    provider = 'mollie',

    -- si déjà active, on ne change pas le plan ici
    plan = case
      when subscriptions.status = 'active' then subscriptions.plan
      else excluded.plan
    end,

    -- si déjà active, on ne repasse pas pending
    status = case
      when subscriptions.status = 'active' then subscriptions.status
      else 'pending'
    end,

    updated_at = now()
  returning * into v_sub;

  return jsonb_build_object(
    'ok', true,
    'org_id', p_org_id,
    'plan', v_sub.plan,
    'provider', 'mollie',
    'status', v_sub.status
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.current_user_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.duplicate_event(p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$declare
  v_user_id uuid := auth.uid();

  v_source_event_id uuid;
  v_source_event public.events%rowtype;

  v_new_event_id uuid;
  v_new_slug text;
  v_title text;

  v_now timestamptz := now();

  v_form_fields_count int := 0;
  v_products_count int := 0;

  v_close_event_when_sold_out bool;
begin
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

  /* 11) Clone form fields */
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
    updated_at
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
    v_now
  from public.event_form_fields f
  where f.event_id = v_source_event_id
  order by f.sort_order asc, f.created_at asc;

  /* 12) Clone products */
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

  /* 13) Response */
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
    'isPublished', false,
    'createdAt', v_now,
    'updatedAt', v_now,
    'sourceEventId', v_source_event_id,
    'clonedFormFieldsCount', v_form_fields_count,
    'clonedProductsCount', v_products_count
  );

exception
  when unique_violation then
    raise exception 'CONFLICT';
end;$function$
;

CREATE OR REPLACE FUNCTION public.enforce_max_10_products_per_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  cnt integer;
begin
  select count(*)
    into cnt
  from public.event_products
  where event_id = new.event_id;

  -- si insert : cnt est le nombre actuel. Si update et event_id change, ça reste OK
  if tg_op = 'INSERT' and cnt >= 10 then
    raise exception 'max 10 products per event';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_max_30_form_fields_per_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  cnt integer;
begin
  select count(*) into cnt
  from public.event_form_fields
  where event_id = new.event_id;

  if tg_op = 'INSERT' and cnt >= 30 then
    raise exception 'max 30 form fields per event';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.expire_orders(p_limit integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$declare
  v_now timestamptz := now();
  v_count int := 0;
  v_order_id uuid;
begin
  if p_limit is null or p_limit <= 0 or p_limit > 500 then
    raise exception 'VALIDATION_ERROR: p_limit must be between 1 and 500';
  end if;

  for v_order_id in
    select id
    from public.orders
    where status = 'awaiting_payment'
      and expires_at is not null
      and expires_at < v_now
    order by expires_at asc
    limit p_limit
    for update skip locked
  loop
    update public.orders
    set status = 'expired'
        -- , updated_at = v_now
    where id = v_order_id;

    update public.order_attendees
    set status = 'expired'
        -- , updated_at = v_now
    where order_id = v_order_id
      and status = 'reserved';

    update public.event_products ep
    set reserved_qty = greatest(0, ep.reserved_qty - x.qty)
    from (
      select product_id, sum(quantity)::int as qty
      from public.order_items
      where order_id = v_order_id
      group by product_id
    ) x
    where ep.id = x.product_id;

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('expired_orders', v_count);
end;$function$
;

CREATE OR REPLACE FUNCTION public.get_dashboard_bootstrap()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_result jsonb;
  v_plan_limits jsonb;
  v_profile jsonb;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- planLimits par défaut (free) pour onboarding
  select to_jsonb(pl)
  into v_plan_limits
  from public.plan_limits pl
  where pl.plan = 'free'
  limit 1;

  if v_plan_limits is null then
    raise exception 'CONFIG_ERROR: missing plan_limits for plan=free';
  end if;

  -- profile (peut être null si la row n'existe pas encore)
  select to_jsonb(up)
  into v_profile
  from public.user_profile up
  where up.user_id = v_user_id
  limit 1;

  -- 1) Trouver l'org via membership (stable)
  select om.org_id
    into v_org_id
  from public.organization_members om
  where om.user_id = v_user_id
  order by om.created_at asc
  limit 1;

  -- Si pas d'org (user vient juste de s'inscrire)
  if v_org_id is null then
    select jsonb_build_object(
      'profile', v_profile,
      'membership', null,
      'organization', null,
      'organizationProfile', null,
      'subscription', null,
      'planLimits', v_plan_limits
    )
    into v_result;

    return v_result;
  end if;

  -- 2) Build viewmodel
  select jsonb_build_object(
    'profile', v_profile,

    'membership',
      (select to_jsonb(om)
       from public.organization_members om
       where om.user_id = v_user_id and om.org_id = v_org_id
       limit 1),

    'organization',
      (select to_jsonb(o)
       from public.organizations o
       where o.id = v_org_id),

    'organizationProfile',
      (select to_jsonb(op)
       from public.organization_profile op
       where op.org_id = v_org_id),

    -- ⚠️ Ne pas exposer les IDs Mollie / champs sensibles
    'subscription',
      (select jsonb_build_object(
         'org_id', s.org_id,
         'provider', s.provider,
         'plan', s.plan,
         'status', s.status,
         'current_period_end', s.current_period_end
       )
       from public.subscriptions s
       where s.org_id = v_org_id
       limit 1),

    'planLimits',
      (select to_jsonb(pl)
       from public.plan_limits pl
       join public.organizations o on o.plan = pl.plan
       where o.id = v_org_id
       limit 1)
  )
  into v_result;

  -- safety: si org existe mais planLimits pas trouvé, fallback free
  if (v_result->'planLimits') is null then
    v_result := jsonb_set(v_result, '{planLimits}', v_plan_limits, true);
  end if;

  return v_result;
end;$function$
;

CREATE OR REPLACE FUNCTION public.get_event_admin_orders_view(p_event_id uuid DEFAULT NULL::uuid, p_org_id uuid DEFAULT NULL::uuid, p_event_slug text DEFAULT NULL::text, p_orders_limit integer DEFAULT 50, p_orders_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', o_page.id,
          'orgId', o_page.org_id,
          'eventId', o_page.event_id,
          'currency', o_page.currency,
          'totalCents', o_page.total_cents,
          'paidCents', coalesce(o_page.paid_cents, 0),
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
  from o_page;

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
$function$
;

CREATE OR REPLACE FUNCTION public.get_event_admin_participants_export_data(p_event_id uuid DEFAULT NULL::uuid, p_org_id uuid DEFAULT NULL::uuid, p_event_slug text DEFAULT NULL::text, p_confirmed_only boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;

  v_orders jsonb;
  v_order_ids uuid[];

  v_order_items jsonb;

  v_attendees jsonb;
  v_attendee_ids uuid[];
  v_attendee_answers jsonb;

  v_slug text := nullif(trim(p_event_slug), '');
begin
  /* ---------------- Auth ---------------- */

  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
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

  /* ---------------- Orders (all event) ---------------- */

  with o_all as (
    select o.*
    from public.orders o
    where o.event_id = p_event_id
    order by o.created_at desc, o.id desc
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', o_all.id,
          'orgId', o_all.org_id,
          'eventId', o_all.event_id,
          'currency', o_all.currency,
          'totalCents', o_all.total_cents,
          'paidCents', coalesce(o_all.paid_cents, 0),
          'status', o_all.status,
          'buyerEmail', o_all.buyer_email,
          'buyerName', o_all.buyer_name,
          'buyerPhone', o_all.buyer_phone,
          'buyerIsAttendee', coalesce(o_all.buyer_is_attendee, false),
          'depositDueCentsSnapshot', coalesce(o_all.deposit_due_cents_snapshot, 0),
          'createdAt', o_all.created_at,
          'updatedAt', o_all.updated_at,
          'expiresAt', o_all.expires_at,
          'confirmedAt', o_all.confirmed_at,
          'detailsCompletedAt', o_all.details_completed_at,
          'canceledAt', o_all.canceled_at
        )
        order by o_all.created_at desc, o_all.id desc
      ),
      '[]'::jsonb
    ),
    coalesce(array_agg(o_all.id), '{}'::uuid[])
  into v_orders, v_order_ids
  from o_all;

  /* ---------------- Order items ---------------- */

  select coalesce(
    jsonb_agg(to_jsonb(oi) order by oi.created_at asc, oi.id asc),
    '[]'::jsonb
  )
  into v_order_items
  from public.order_items oi
  where oi.order_id = any(v_order_ids);

  /* ---------------- Attendees ---------------- */

  with attendees_all as (
    select oa.*
    from public.order_attendees oa
    where oa.order_id = any(v_order_ids)
      and (
        not p_confirmed_only
        or oa.status = 'confirmed'
      )
    order by oa.created_at desc, oa.id desc
  )
  select
    coalesce(jsonb_agg(to_jsonb(attendees_all)), '[]'::jsonb),
    coalesce(array_agg(attendees_all.id), '{}'::uuid[])
  into v_attendees, v_attendee_ids
  from attendees_all;

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
      'rows', v_orders
    ),
    'orderItems', v_order_items,
    'attendees', v_attendees,
    'attendeeAnswers', v_attendee_answers
  );

  return v_result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_event_by_slug(p_org_id uuid, p_event_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$declare
  v_user_id uuid := auth.uid();
  v_slug text := nullif(trim(p_event_slug), '');
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_org_id is null then
    raise exception 'VALIDATION_ERROR: org_id is required';
  end if;

  if v_slug is null then
    raise exception 'VALIDATION_ERROR: event_slug is required';
  end if;

  if not public.is_org_member(p_org_id) then
    raise exception 'FORBIDDEN';
  end if;

  select jsonb_build_object(
    'id', e.id,
    'orgId', e.org_id,
    'slug', e.slug,
    'title', e.title,
    'description', e.description,
    'location', e.location,
    'bannerUrl', e.banner_url,
    'startsAt', e.starts_at,
    'endsAt', e.ends_at,
    'depositCents', e.deposit_cents,
    'isPublished', e.is_published,
    'createdAt', e.created_at,
    'updatedAt', e.updated_at
  )
  into v_result
  from public.events e
  where e.org_id = p_org_id
    and e.slug = v_slug
  limit 1;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  return v_result;
end;$function$
;

CREATE OR REPLACE FUNCTION public.get_event_detail_admin_core(p_event_id uuid DEFAULT NULL::uuid, p_org_id uuid DEFAULT NULL::uuid, p_event_slug text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$declare
  v_user_id uuid := auth.uid();
  v_result jsonb;

  v_event jsonb;
  v_products jsonb;
  v_form_fields_groups jsonb;
  v_form_fields jsonb;

  -- branding
  v_org_id uuid;
  v_org_logo_url text;
  v_org_default_banner_url text;

  v_default_logo_url text := 'https://dixirvllhfkvqoahhfqh.supabase.co/storage/v1/object/public/public-assets/defaults/default_logo.webp';
  v_default_banner_url text := 'https://dixirvllhfkvqoahhfqh.supabase.co/storage/v1/object/public/public-assets/defaults/default_banner.webp';

  v_slug text := nullif(trim(p_event_slug), '');
begin

  /* ---------------- Auth ---------------- */

  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
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

  /* ---------------- Event + Branding ---------------- */

  select
    e.org_id,
    jsonb_build_object(
      'id', e.id,
      'orgId', e.org_id,
      'slug', e.slug,
      'title', e.title,
      'description', e.description,
      'location', e.location,
      'isPublished', e.is_published,
      'bannerUrlRaw', e.banner_url,
      'depositCents', e.deposit_cents,
      'maxAttendees', e.max_attendees,
      'createdAt', e.created_at::text,
      'updatedAt', e.updated_at::text,
      'startsAt', to_jsonb(e.starts_at::text),
      'endsAt', to_jsonb(e.ends_at::text),
      'bannerUrlEffective',
        coalesce(
          nullif(trim(e.banner_url), ''),
          nullif(trim(op.default_event_banner_url), ''),
          v_default_banner_url
        )
    ),
    nullif(trim(op.logo_url), ''),
    nullif(trim(op.default_event_banner_url), '')
  into
    v_org_id,
    v_event,
    v_org_logo_url,
    v_org_default_banner_url
  from public.events e
  join public.organization_profile op
    on op.org_id = e.org_id
  where e.id = p_event_id;

  if v_event is null then
    raise exception 'NOT_FOUND';
  end if;

  /* ---------------- Products ---------------- */

  select coalesce(
    jsonb_agg(to_jsonb(ep) order by ep.sort_order asc, ep.created_at asc),
    '[]'::jsonb
  )
  into v_products
  from public.event_products ep
  where ep.event_id = p_event_id;

  /* ---------------- Form field groups ---------------- */

  select coalesce(
    jsonb_agg(to_jsonb(ffg) order by ffg.sort_order asc, ffg.created_at asc),
    '[]'::jsonb
  )
  into v_form_fields_groups
  from public.event_form_field_groups ffg
  where ffg.event_id = p_event_id;

  /* ---------------- Form fields ---------------- */

  select coalesce(
    jsonb_agg(to_jsonb(ff) order by ff.sort_order asc, ff.created_at asc),
    '[]'::jsonb
  )
  into v_form_fields
  from public.event_form_fields ff
  where ff.event_id = p_event_id;

  /* ---------------- Final payload ---------------- */

  v_result := jsonb_build_object(
    'event', v_event,
    'orgBranding', jsonb_build_object(
      'logoUrl', coalesce(v_org_logo_url, v_default_logo_url),
      'defaultEventBannerUrl', coalesce(v_org_default_banner_url, v_default_banner_url)
    ),
    'products', v_products,
    'formFields', v_form_fields,
    'formFieldsGroups', v_form_fields_groups
  );

  return v_result;

end;$function$
;

CREATE OR REPLACE FUNCTION public.get_event_registrations_count(p_event_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
  select count(*)::int
  from public.order_attendees oa
  join public.orders o on o.id = oa.order_id
  where o.event_id = p_event_id
    and oa.status not in ('cancelled')
$function$
;

CREATE OR REPLACE FUNCTION public.get_event_tickets_admin(p_event_id uuid, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$declare
  v_user_id uuid := auth.uid();

  v_total integer;
  v_rows jsonb;
  v_result jsonb;
begin
  /* ---------------- Auth ---------------- */

  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_limit < 1 or p_limit > 1000 then
    raise exception 'VALIDATION_ERROR: limit out of range';
  end if;

  if p_offset < 0 then
    raise exception 'VALIDATION_ERROR: offset out of range';
  end if;

  /* ---------------- Membership ---------------- */

  if not public.is_event_org_member(p_event_id) then
    raise exception 'FORBIDDEN';
  end if;

  /* ---------------- Total ---------------- */

  select count(*)
  into v_total
  from public.tickets t
  where t.event_id = p_event_id;

  /* ---------------- Tickets ---------------- */

  with t_page as (
    select
      t.id,
      t.order_id,
      t.order_item_id,
      t.product_id,
      t.ticket_index,
      t.qr_token,
      t.status,
      t.checked_in_at,
      t.created_at,

      oi.product_name_snapshot,
      oi.unit_price_cents_snapshot,

      ep.creates_attendees,
      t.admits_count,

      o.created_at as order_created_at,
      o.buyer_email

    from public.tickets t
    join public.orders o
      on o.id = t.order_id
    join public.order_items oi
      on oi.id = t.order_item_id
    join public.event_products ep
      on ep.id = t.product_id
    where t.event_id = p_event_id
    order by t.created_at desc
    limit p_limit
    offset p_offset
  ),

  attendees_ranked as (
    select
      oa.id,
      oa.order_id,
      oa.product_id,
      oa.attendee_index,
      row_number() over (
        partition by oa.order_id, oa.product_id
        order by oa.attendee_index asc, oa.created_at asc, oa.id asc
      ) as rn
    from public.order_attendees oa
    where oa.order_id in (select distinct order_id from t_page)
  ),

  answers_ranked as (
    select
      ans.attendee_id,
      coalesce(nullif(trim(ans.field_key_snapshot), ''), '') as field_key_snapshot,
      coalesce(
        nullif(trim(ans.field_label_snapshot), ''),
        nullif(trim(ans.field_key_snapshot), ''),
        'Champ'
      ) as field_label_snapshot,
      case
        when jsonb_typeof(ans.value) = 'string' then trim(both '"' from ans.value::text)
        when jsonb_typeof(ans.value) = 'number' then ans.value::text
        when jsonb_typeof(ans.value) = 'boolean' then
          case when ans.value::text = 'true' then 'Oui' else 'Non' end
        when jsonb_typeof(ans.value) = 'object' then
          coalesce(
            nullif(ans.value->>'value_text', ''),
            nullif(ans.value->>'value_date', ''),
            nullif(ans.value->>'value_int', ''),
            case
              when ans.value ? 'value_bool' then
                case when ans.value->>'value_bool' = 'true' then 'Oui' else 'Non' end
              else null
            end
          )
        else null
      end as rendered_value
    from public.order_attendee_answers ans
    where ans.attendee_id in (select id from attendees_ranked)
  )

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'orderId', t.order_id,
        'orderItemId', t.order_item_id,

        'productId', t.product_id,
        'productNameSnapshot', t.product_name_snapshot,
        'unitPriceCentsSnapshot', t.unit_price_cents_snapshot,

        'ticketIndex', t.ticket_index,
        'reference', right(t.qr_token, 8),
        'qrToken', t.qr_token,

        'status', t.status,
        'checkedInAt', t.checked_in_at,
        'createdAt', t.created_at,

        'createsAttendees', t.creates_attendees,
        'admitsCount', t.admits_count,

        'orderCreatedAt', t.order_created_at,
        'buyerEmail', t.buyer_email,

        'attendeeSummaryLines',
          case
            when not t.creates_attendees then '[]'::jsonb
            else coalesce((
              select jsonb_agg(s.line order by s.priority, s.attendee_rn, s.answer_ord)
              from (
                select *
                from (
                  select
                    ar.rn as attendee_rn,
                    case
                      when lower(coalesce(a.field_key_snapshot, '')) in ('first_name', 'firstname', 'prenom', 'prénom') then 1
                      when lower(coalesce(a.field_key_snapshot, '')) in ('last_name', 'lastname', 'nom') then 2
                      when lower(coalesce(a.field_key_snapshot, '')) in ('email', 'e-mail', 'mail') then 3
                      else 10
                    end as priority,
                    row_number() over (
                      partition by ar.id
                      order by
                        case
                          when lower(coalesce(a.field_key_snapshot, '')) in ('first_name', 'firstname', 'prenom', 'prénom') then 1
                          when lower(coalesce(a.field_key_snapshot, '')) in ('last_name', 'lastname', 'nom') then 2
                          when lower(coalesce(a.field_key_snapshot, '')) in ('email', 'e-mail', 'mail') then 3
                          else 10
                        end,
                        a.field_label_snapshot
                    ) as answer_ord,
                    (a.field_label_snapshot || ' : ' || a.rendered_value) as line
                  from attendees_ranked ar
                  join answers_ranked a
                    on a.attendee_id = ar.id
                  where ar.order_id = t.order_id
                    and ar.product_id = t.product_id
                    and ar.rn between
                      (((t.ticket_index - 1) * greatest(t.admits_count, 1)) + 1)
                      and
                      (t.ticket_index * greatest(t.admits_count, 1))
                    and a.rendered_value is not null
                    and nullif(trim(a.rendered_value), '') is not null
                ) ranked_answers
                where ranked_answers.answer_ord <= 2
                order by ranked_answers.priority, ranked_answers.attendee_rn, ranked_answers.answer_ord
                limit 2
              ) s
            ), '[]'::jsonb)
          end
      )
      order by t.created_at desc
    ),
    '[]'::jsonb
  )
  into v_rows
  from t_page t;

  /* ---------------- Payload ---------------- */

  v_result := jsonb_build_object(
    'tickets', jsonb_build_object(
      'limit', p_limit,
      'offset', p_offset,
      'total', v_total,
      'rows', v_rows
    )
  );

  return v_result;

end;$function$
;

CREATE OR REPLACE FUNCTION public.get_events_overview(p_org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'private'
AS $function$declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_org_member(p_org_id) then
    raise exception 'FORBIDDEN';
  end if;

  with ev as (
    select
      e.id,
      e.org_id,
      e.title,
      e.slug,
      e.location,
      e.starts_at,
      e.ends_at,
      e.is_published,
      e.created_at,
      e.updated_at
    from public.events e
    where e.org_id = p_org_id
    order by e.created_at desc
    limit 200
  ),
  orders_agg as (
    select
      o.event_id,
      count(*)::int as orders_count,
      coalesce(sum(o.paid_cents), 0)::bigint as paid_cents
    from public.orders o
    join ev on ev.id = o.event_id
    group by o.event_id
  )
  select jsonb_build_object(
    'orgId', p_org_id,
    'events', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'event', to_jsonb(ev),
          'ordersCount', coalesce(oa.orders_count, 0),
          'paidCents', coalesce(oa.paid_cents, 0)
        )
        order by ev.created_at desc
      ),
      '[]'::jsonb
    )
  )
  into v_result
  from ev
  left join orders_agg oa on oa.event_id = ev.id;

  return v_result;
end;$function$
;

CREATE OR REPLACE FUNCTION public.get_org_mollie_connect_secrets(p_org_id uuid)
 RETURNS TABLE(status text, mode text, access_token_enc text, refresh_token_enc text, enc_kid text, access_token_expires_at timestamp with time zone, scopes text, mollie_profile_id text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$select
    c.status,
    c.mode,
    c.access_token_enc,
    c.refresh_token_enc,
    c.enc_kid,
    c.access_token_expires_at,
    c.scopes,
    c.mollie_profile_id
  from private.organization_mollie_connect c
  where c.org_id = p_org_id
  limit 1;$function$
;

CREATE OR REPLACE FUNCTION public.get_org_plan(p_org_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$select
    case
      when lower(coalesce(nullif(trim(o.plan), ''), 'free')) in ('starter','pro')
       and o.plan_expires_at is not null
       and o.plan_expires_at > now()
        then lower(coalesce(nullif(trim(o.plan), ''), 'free'))
      else 'free'
    end
  from public.organizations o
  where o.id = p_org_id$function$
;

CREATE OR REPLACE FUNCTION public.get_plan_limits(p_plan text)
 RETURNS public.plan_limits
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select pl.*
  from public.plan_limits pl
  where pl.plan = p_plan
  limit 1
$function$
;

CREATE OR REPLACE FUNCTION public.get_public_event_detail(p_org_slug text, p_event_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$declare
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
    'banner_url', coalesce(nullif(trim(e.banner_url), ''), v_org_default_banner_url, v_default_banner_url),
    'starts_at', e.starts_at,
    'ends_at', e.ends_at,
    'deposit_cents', e.deposit_cents,
    'max_attendees', e.max_attendees
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
end;$function$
;

CREATE OR REPLACE FUNCTION public.get_public_org_by_slug(p_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$declare
  v_slug text := nullif(trim(p_slug), '');
  v_result jsonb;
begin
  if v_slug is null then
    raise exception 'VALIDATION_ERROR: slug is required';
  end if;

  perform public.assert_rate_limit('anon:org:' || v_slug, 120, 60);

  select jsonb_build_object(
    'org', jsonb_build_object(
      'id', o.id,
      'type', o.type,
      'name', o.name
    ),
    'profile', jsonb_build_object(
      'slug', op.slug,
      'displayName', op.display_name,
      'description', op.description,
      'publicEmail', op.public_email,
      'phone', op.phone,
      'website', op.website,
      'logoUrl', op.logo_url,
      'primaryColor', op.primary_color,
      'defaultEventBannerUrl', op.default_event_banner_url
    )
  )
  into v_result
  from public.organization_profile op
  join public.organizations o on o.id = op.org_id
where op.slug = v_slug
  and o.status = 'active'
limit 1;

  if v_result is null then
    raise exception 'NOT_FOUND';
  end if;

  return v_result;
end;$function$
;

CREATE OR REPLACE FUNCTION public.get_public_org_events_overview(p_org_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$declare
  v_slug text := nullif(trim(p_org_slug), '');
  v_org_id uuid;
  v_result jsonb;

  -- defaults globaux (storage public)
  v_default_banner_url text := 'https://dixirvllhfkvqoahhfqh.supabase.co/storage/v1/object/public/public-assets/defaults/default_banner.webp';

  -- org branding
  v_org_default_banner_url text;
begin
  if v_slug is null then
    raise exception 'VALIDATION_ERROR: org_slug is required';
  end if;

  perform public.assert_rate_limit('anon:org_events:' || v_slug, 120, 60);

  -- org id + default banner
  select
    op.org_id,
    nullif(trim(op.default_event_banner_url), '')
  into
    v_org_id,
    v_org_default_banner_url
  from public.organization_profile op
join public.organizations o on o.id = op.org_id
where op.slug = v_slug
  and o.status = 'active';


  if v_org_id is null then
    raise exception 'NOT_FOUND';
  end if;

  select jsonb_build_object(
    'orgSlug', v_slug,
    'events', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'slug', e.slug,
          'title', e.title,
          'location', e.location,
          'description', e.description,

          -- ✅ banner résolue (event -> org default -> global default)
          'bannerUrl', coalesce(
            nullif(trim(e.banner_url), ''),
            v_org_default_banner_url,
            v_default_banner_url
          ),

          'startsAt', e.starts_at,
          'endsAt', e.ends_at,
          'isSoldOut', public.is_event_sold_out(e.id)
        )
        order by e.starts_at asc nulls last, e.created_at desc
      ),
      '[]'::jsonb
    )
  )
  into v_result
  from public.events e
  where e.org_id = v_org_id
    and e.is_published = true;

  return v_result;
end;$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.user_profile (user_id, created_at, updated_at)
  values (new.id, now(), now())
  on conflict (user_id) do nothing;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_attendee_org_member(p_attendee_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$select auth.uid() is not null
     and exists (
       select 1
       from public.order_attendees oa
       join public.orders o on o.id = oa.order_id
       join public.events e on e.id = o.event_id
       join public.organization_members om on om.org_id = e.org_id
       where oa.id = p_attendee_id
         and om.user_id = auth.uid()
       limit 1
     );$function$
;

CREATE OR REPLACE FUNCTION public.is_event_org_member(p_event_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$select auth.uid() is not null
  and exists (
    select 1
    from public.events e
    join public.organization_members om on om.org_id = e.org_id
    where e.id = p_event_id
      and om.user_id = auth.uid()
    limit 1
  );$function$
;

CREATE OR REPLACE FUNCTION public.is_event_paid(p_event_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$select exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and coalesce(e.deposit_cents, 0) > 0
  )
  or exists (
    select 1
    from public.event_products ep
    where ep.event_id = p_event_id
      and coalesce(ep.price_cents, 0) > 0
  );$function$
;

CREATE OR REPLACE FUNCTION public.is_event_sold_out(p_event_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$select
    (
      -- règle 0 : jauge globale participants atteinte
      exists (
        select 1
        from public.events e
        where e.id = p_event_id
          and e.max_attendees is not null
          and (
            select coalesce(sum(
              (coalesce(ep.sold_qty, 0) + coalesce(ep.reserved_qty, 0))
              * greatest(0, coalesce(ep.attendees_per_unit, 1))
            ), 0)
            from public.event_products ep
            where ep.event_id = p_event_id
              and ep.is_active = true
              and ep.creates_attendees = true
          ) >= e.max_attendees
      )
    )
    or
    (
      -- règle 1 : un produit gatekeeper "fermant" est épuisé
      exists (
        select 1
        from public.event_products ep
        where ep.event_id = p_event_id
          and ep.is_active = true
          and ep.is_gatekeeper = true
          and ep.close_event_when_sold_out = true
          and ep.stock_qty is not null
          and coalesce(ep.sold_qty, 0) + coalesce(ep.reserved_qty, 0) >= ep.stock_qty
      )
    )
    or
    (
      -- règle 2 : aucun produit actif encore disponible
      exists (
        select 1
        from public.event_products ep
        where ep.event_id = p_event_id
          and ep.is_active = true
      )
      and not exists (
        select 1
        from public.event_products ep
        where ep.event_id = p_event_id
          and ep.is_active = true
          and (
            ep.stock_qty is null
            or coalesce(ep.sold_qty, 0) + coalesce(ep.reserved_qty, 0) < ep.stock_qty
          )
      )
    );$function$
;

CREATE OR REPLACE FUNCTION public.is_order_org_member(p_order_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select auth.uid() is not null
     and exists (
       select 1
       from public.orders o
       join public.events e on e.id = o.event_id
       join public.organization_members om on om.org_id = e.org_id
       where o.id = p_order_id
         and om.user_id = auth.uid()
     );
$function$
;

CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select auth.uid() is not null
     and exists (
       select 1
       from public.organization_members om
       where om.org_id = p_org_id
         and om.user_id = auth.uid()
     );
$function$
;

CREATE OR REPLACE FUNCTION public.issue_order_tickets(p_order_id uuid)
 RETURNS TABLE(inserted_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$declare
  v_order public.orders%rowtype;
begin
  /*
    1) Lock de la commande pour éviter les courses concurrentes
  */
  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  /*
    2) Garde-fous métier
       Adapte ici si tes statuts réels diffèrent.
       L’idée: on n’émet les tickets que pour une commande validée.
  */
  if v_order.confirmed_at is null then
  raise exception 'ORDER_NOT_ISSUABLE';
end if;

  /*
    3) Génération idempotente
       - 1 ticket par unité commandée
       - ticket_index = 1..quantity pour chaque order_item
       - qr_token unique
       - admits_count = snapshot du produit au moment de l’émission
  */
  return query
  with ins as (
    insert into public.tickets (
      id,
      order_id,
      order_item_id,
      event_id,
      product_id,
      ticket_index,
      qr_token,
      admits_count,
      status,
      checked_in_at,
      checked_in_by,
      created_at
    )
    select
      gen_random_uuid() as id,
      oi.order_id,
      oi.id as order_item_id,
      o.event_id,
      oi.product_id,
      gs.ticket_index,
      'tkt_' || replace(gen_random_uuid()::text, '-', '') as qr_token,
      greatest(coalesce(ep.attendees_per_unit, 1), 1) as admits_count,
      'valid' as status,
      null::timestamptz as checked_in_at,
      null::uuid as checked_in_by,
      now() as created_at
    from public.order_items oi
    join public.orders o
      on o.id = oi.order_id
    join public.event_products ep
      on ep.id = oi.product_id
    cross join lateral generate_series(1, greatest(coalesce(oi.quantity, 0), 0)) as gs(ticket_index)
    where oi.order_id = p_order_id
    on conflict (order_item_id, ticket_index) do nothing
    returning 1
  )
  select count(*)::int as inserted_count
  from ins;
end;$function$
;

CREATE OR REPLACE FUNCTION public.log_email_once(p_order_id uuid, p_kind text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_rowcount int;
begin
  insert into public.order_email_logs(order_id, kind)
  values (p_order_id, p_kind)
  on conflict (order_id, kind) do nothing;

  get diagnostics v_rowcount = row_count;

  return v_rowcount > 0;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_order_confirmation_email_error(p_order_id uuid, p_error text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_temp', 'private', 'public'
AS $function$
  update public.orders
  set confirmation_email_error = left(coalesce(p_error,'UNKNOWN'), 500)
  where id = p_order_id;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_order_confirmation_email_sent(p_order_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_temp', 'private', 'public'
AS $function$
  update public.orders
  set confirmation_email_sent_at = now(),
      confirmation_email_error = null
  where id = p_order_id;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_ticket_checked_in(p_ticket_id uuid, p_event_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_ticket_id is null then
    raise exception 'VALIDATION_ERROR: ticket_id required';
  end if;

  if p_event_id is null then
    raise exception 'VALIDATION_ERROR: event_id required';
  end if;

  return public.check_in_ticket_internal(p_ticket_id, p_event_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_ticket_checked_in_by_qr(p_qr_token text, p_event_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_ticket_id uuid;
  v_ticket_event_id uuid;
  v_token text := nullif(regexp_replace(trim(p_qr_token), '\s+', '', 'g'), '');
begin
  if v_token is null then
    raise exception 'VALIDATION_ERROR: qr_token required';
  end if;

  if p_event_id is null then
    raise exception 'VALIDATION_ERROR: event_id required';
  end if;

  select
    t.id,
    t.event_id
  into
    v_ticket_id,
    v_ticket_event_id
  from public.tickets t
  where regexp_replace(trim(t.qr_token), '\s+', '', 'g') = v_token
  limit 1;

  if v_ticket_id is null then
    raise exception 'TICKET_NOT_FOUND';
  end if;

  if v_ticket_event_id is distinct from p_event_id then
    raise exception 'EVENT_MISMATCH';
  end if;

  return public.check_in_ticket_internal(v_ticket_id, p_event_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.normalize_answer_value(p_value jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
AS $function$
select
  case jsonb_typeof(p_value)
    when 'object' then
      -- si déjà au bon format (contient au moins une des clés), on garde,
      -- sinon on wrap dans value_json
      case
        when (p_value ? 'value_text') or (p_value ? 'value_int') or (p_value ? 'value_bool') or (p_value ? 'value_date')
          then p_value
        else jsonb_build_object('value_json', p_value)
      end

    when 'string'  then jsonb_build_object('value_text', p_value)
    when 'number'  then jsonb_build_object('value_int',  p_value)        -- ou value_number si tu préfères
    when 'boolean' then jsonb_build_object('value_bool', p_value)
    when 'null'    then jsonb_build_object('value_text', null)
    else jsonb_build_object('value_json', p_value)
  end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_org_profile_slug_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_allow boolean := coalesce(current_setting('app.allow_org_profile_slug_change', true), '') = 'on';
begin
  -- slug change interdit sauf si flag activé (dans la transaction)
  if (new.slug is distinct from old.slug) and not v_allow then
    raise exception 'organization_profile.slug is immutable';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_create_invoice_from_mollie_payment(p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$declare
  v_role text := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(auth.role(), ''),
    current_user
  );

  v_org_id uuid;
  v_payment_id text;
  v_subscription_id text;

  v_currency text;
  v_total_value text;

  v_paid_at timestamptz;
  v_period_start timestamptz;
  v_period_end timestamptz;

  v_total_cents integer;

  v_number text;
  v_snapshot jsonb;
  v_raw jsonb;

  v_existing_id uuid;
  v_result jsonb;

  v_year text := to_char(now(), 'YYYY');
begin
  /* 1) Edge-only guard */
  if v_role is distinct from 'service_role' then
    raise exception 'FORBIDDEN';
  end if;

  /* 2) Parse input */
  v_org_id := nullif(trim(p_input->>'org_id'), '')::uuid;
  if v_org_id is null then
    raise exception 'VALIDATION_ERROR: org_id is required';
  end if;

  v_payment_id := nullif(trim(p_input->>'mollie_payment_id'), '');
  if v_payment_id is null then
    raise exception 'VALIDATION_ERROR: mollie_payment_id is required';
  end if;

  v_subscription_id := nullif(trim(p_input->>'mollie_subscription_id'), '');

  v_currency := upper(nullif(trim(p_input->>'currency'), ''));
  if v_currency is null then
    v_currency := 'EUR';
  end if;

  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'VALIDATION_ERROR: currency invalid';
  end if;

  v_total_value := nullif(trim(p_input->>'total_value'), '');
  if v_total_value is null then
    raise exception 'VALIDATION_ERROR: total_value is required';
  end if;

  v_paid_at := nullif(trim(p_input->>'paid_at'), '')::timestamptz;
  if v_paid_at is null then
    raise exception 'VALIDATION_ERROR: paid_at is required';
  end if;

  v_period_start := nullif(trim(p_input->>'period_start'), '')::timestamptz;
  v_period_end := nullif(trim(p_input->>'period_end'), '')::timestamptz;

  v_raw := coalesce(p_input->'raw', '{}'::jsonb);

  /* 3) Basic validations */
  if length(v_payment_id) > 80 then
    raise exception 'VALIDATION_ERROR: mollie_payment_id too long';
  end if;

  if v_subscription_id is not null and length(v_subscription_id) > 80 then
    raise exception 'VALIDATION_ERROR: mollie_subscription_id too long';
  end if;

  -- Parse "11.99" safely -> cents
  begin
    v_total_cents := (round((v_total_value::numeric) * 100))::int;
  exception when others then
    raise exception 'VALIDATION_ERROR: total_value must be numeric string like "15.99"';
  end;

  if v_total_cents < 0 then
    raise exception 'VALIDATION_ERROR: total_cents cannot be negative';
  end if;

  /* 4) Ensure org exists */
  perform 1 from public.organizations o where o.id = v_org_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;

  /* 5) Build billing snapshot (required) */
  select jsonb_build_object(
    'legalName', ob.legal_name,
    'vatCountryCode', ob.vat_country_code,
    'vatNumber', ob.vat_number,
    'addressLine1', ob.address_line1,
    'addressLine2', ob.address_line2,
    'postalCode', ob.postal_code,
    'city', ob.city,
    'countryCode', ob.country_code,
    'billingEmail', ob.billing_email,
    'invoiceReference', ob.invoice_reference
  )
  into v_snapshot
  from public.organization_billing ob
  where ob.org_id = v_org_id;

  if v_snapshot is null then
    raise exception 'VALIDATION_ERROR: billing profile missing for org';
  end if;

  /* 6) Idempotence: if invoice already exists for this paymentId -> return it */
  select i.id into v_existing_id
  from public.invoices i
  where i.mollie_payment_id = v_payment_id
  limit 1;

  if v_existing_id is not null then
    select jsonb_build_object(
      'id', i.id,
      'orgId', i.org_id,
      'number', i.number,
      'status', i.status,
      'issuedAt', i.issued_at,
      'paidAt', i.paid_at,
      'periodStart', i.period_start,
      'periodEnd', i.period_end,
      'currency', i.currency,
      'subtotalCents', i.subtotal_cents,
      'vatCents', i.vat_cents,
      'totalCents', i.total_cents,
      'vatRate', i.vat_rate,
      'provider', i.provider,
      'molliePaymentId', i.mollie_payment_id,
      'mollieSubscriptionId', i.mollie_subscription_id,
      'billingSnapshot', i.billing_snapshot,
      'createdAt', i.created_at,
      'updatedAt', i.updated_at
    )
    into v_result
    from public.invoices i
    where i.id = v_existing_id;

    /* ✅ create invoice_peppol row (idempotent) */
    perform public.rpc_create_invoice_peppol(
      jsonb_build_object('invoice_id', (v_result->>'id'))
    );

    return v_result;
  end if;

  /* 7) Generate invoice number (simple YYYY-000001) */
  v_number := v_year || '-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0');

  /* 8) Insert / Upsert invoice
        VAT: v1 => store VAT = 0 (you can evolve later with VAT logic)
  */
  insert into public.invoices (
    org_id,
    number,
    status,
    issued_at,
    paid_at,
    period_start,
    period_end,
    currency,
    subtotal_cents,
    vat_cents,
    total_cents,
    vat_rate,
    billing_snapshot,
    provider,
    mollie_payment_id,
    mollie_subscription_id,
    pdf_path
  )
  values (
    v_org_id,
    v_number,
    'paid'::public.invoice_status,
    v_paid_at,          -- issued_at
    v_paid_at,          -- paid_at
    v_period_start,
    v_period_end,
    v_currency,
    v_total_cents,
    0,
    v_total_cents,
    null,
    jsonb_build_object(
      'billing', v_snapshot,
      'rawPayment', v_raw
    ),
    'mollie',
    v_payment_id,
    v_subscription_id,
    null
  )
  on conflict (mollie_payment_id)
  do update set
    -- on garde le number existant, sinon tu changes de numéro à chaque retry
    org_id = excluded.org_id,
    status = excluded.status,
    issued_at = excluded.issued_at,
    paid_at = excluded.paid_at,
    period_start = excluded.period_start,
    period_end = excluded.period_end,
    currency = excluded.currency,
    subtotal_cents = excluded.subtotal_cents,
    vat_cents = excluded.vat_cents,
    total_cents = excluded.total_cents,
    vat_rate = excluded.vat_rate,
    billing_snapshot = excluded.billing_snapshot,
    provider = excluded.provider,
    mollie_subscription_id = excluded.mollie_subscription_id,
    pdf_path = excluded.pdf_path,
    updated_at = now()
  returning jsonb_build_object(
    'id', id,
    'orgId', org_id,
    'number', number,
    'status', status,
    'issuedAt', issued_at,
    'paidAt', paid_at,
    'periodStart', period_start,
    'periodEnd', period_end,
    'currency', currency,
    'subtotalCents', subtotal_cents,
    'vatCents', vat_cents,
    'totalCents', total_cents,
    'vatRate', vat_rate,
    'provider', provider,
    'molliePaymentId', mollie_payment_id,
    'mollieSubscriptionId', mollie_subscription_id,
    'billingSnapshot', billing_snapshot,
    'createdAt', created_at,
    'updatedAt', updated_at
  )
  into v_result;

  -- If conflict happened between our earlier check and insert, fetch existing
  if v_result is null then
    select jsonb_build_object(
      'id', i.id,
      'orgId', i.org_id,
      'number', i.number,
      'status', i.status,
      'issuedAt', i.issued_at,
      'paidAt', i.paid_at,
      'periodStart', i.period_start,
      'periodEnd', i.period_end,
      'currency', i.currency,
      'subtotalCents', i.subtotal_cents,
      'vatCents', i.vat_cents,
      'totalCents', i.total_cents,
      'vatRate', i.vat_rate,
      'provider', i.provider,
      'molliePaymentId', i.mollie_payment_id,
      'mollieSubscriptionId', i.mollie_subscription_id,
      'billingSnapshot', i.billing_snapshot,
      'createdAt', i.created_at,
      'updatedAt', i.updated_at
    )
    into v_result
    from public.invoices i
    where i.mollie_payment_id = v_payment_id
    limit 1;
  end if;

  /* ✅ create invoice_peppol row (idempotent) */
  perform public.rpc_create_invoice_peppol(
    jsonb_build_object('invoice_id', (v_result->>'id'))
  );

  return v_result;

exception
  when invalid_text_representation then
    raise exception 'VALIDATION_ERROR: invalid uuid or value type';
  when unique_violation then
    raise exception 'CONFLICT';
  when others then
    raise;
end;$function$
;

CREATE OR REPLACE FUNCTION public.rpc_create_invoice_peppol(p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role text := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(auth.role(), ''),
    current_user
  );

  v_invoice_id uuid;
  v_provider text;
  v_invoice_org_id uuid;

  v_existing jsonb;
  v_result jsonb;
begin
  /* 1) Edge-only guard */
  if v_role is distinct from 'service_role' then
    raise exception 'FORBIDDEN';
  end if;

  /* 2) Parse input */
  v_invoice_id := nullif(trim(p_input->>'invoice_id'), '')::uuid;
  if v_invoice_id is null then
    raise exception 'VALIDATION_ERROR: invoice_id is required';
  end if;

  v_provider := lower(coalesce(nullif(trim(p_input->>'provider'), ''), 'billit'));

  if v_provider <> 'billit' then
    raise exception 'VALIDATION_ERROR: provider not supported';
  end if;

  /* 3) Ensure invoice exists */
  select i.org_id into v_invoice_org_id
  from public.invoices i
  where i.id = v_invoice_id
  limit 1;

  if v_invoice_org_id is null then
    raise exception 'NOT_FOUND';
  end if;

  /* 4) Idempotence: if row exists -> return it */
  select jsonb_build_object(
    'invoiceId', ip.invoice_id,
    'provider', ip.provider,
    'status', ip.status,
    'providerInvoiceId', ip.provider_invoice_id,
    'providerMessageId', ip.provider_message_id,
    'sentAt', ip.sent_at,
    'lastStatusAt', ip.last_status_at,
    'attemptCount', ip.attempt_count,
    'errorCode', ip.error_code,
    'errorMessage', ip.error_message,
    'payloadHash', ip.payload_hash,
    'createdAt', ip.created_at,
    'updatedAt', ip.updated_at
  )
  into v_existing
  from public.invoice_peppol ip
  where ip.invoice_id = v_invoice_id;

  if v_existing is not null then
    return v_existing;
  end if;

  /* 5) Create row (default status not_sent) */
  insert into public.invoice_peppol (
    invoice_id,
    provider,
    status,
    attempt_count,
    sent_at,
    last_status_at,
    error_code,
    error_message,
    payload_hash
  )
  values (
    v_invoice_id,
    v_provider,
    'not_sent'::public.invoice_peppol_status,
    0,
    null,
    null,
    null,
    null,
    null
  )
  on conflict (invoice_id)
  do update set
    -- on ne touche pas aux champs "métier", juste updated_at / provider si tu veux
    provider = excluded.provider,
    updated_at = now()
  returning jsonb_build_object(
    'invoiceId', invoice_id,
    'provider', provider,
    'status', status,
    'providerInvoiceId', provider_invoice_id,
    'providerMessageId', provider_message_id,
    'sentAt', sent_at,
    'lastStatusAt', last_status_at,
    'attemptCount', attempt_count,
    'errorCode', error_code,
    'errorMessage', error_message,
    'payloadHash', payload_hash,
    'createdAt', created_at,
    'updatedAt', updated_at
  )
  into v_result;

  return v_result;

exception
  when invalid_text_representation then
    raise exception 'VALIDATION_ERROR: invalid uuid or value type';
  when others then
    raise;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_get_organization_billing(p_org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$declare
  v_user_id uuid := auth.uid();
  v_is_owner boolean := false;
  v_billing jsonb;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_org_id is null then
    raise exception 'VALIDATION_ERROR: org_id is required';
  end if;

  select true into v_is_owner
  from public.organization_members m
  where m.org_id = p_org_id
    and m.user_id = v_user_id
    and m.role in ('owner','admin')
  limit 1;

  if coalesce(v_is_owner,false) = false then
    raise exception 'FORBIDDEN';
  end if;

  select jsonb_build_object(
    'orgId', ob.org_id,
    'legalName', ob.legal_name,
    'vatCountryCode', ob.vat_country_code,
    'vatNumber', ob.vat_number,
    'addressLine1', ob.address_line1,
    'addressLine2', ob.address_line2,
    'postalCode', ob.postal_code,
    'city', ob.city,
    'countryCode', ob.country_code,
    'billingEmail', ob.billing_email,
    'invoiceReference', ob.invoice_reference,
    'isVatValidated', ob.is_vat_validated,
    'vatValidatedAt', ob.vat_validated_at,
    'vatValidationSource', ob.vat_validation_source,
    'createdAt', ob.created_at,
    'updatedAt', ob.updated_at
  )
  into v_billing
  from public.organization_billing ob
  where ob.org_id = p_org_id;

  return v_billing; -- ✅ soit objet, soit null
end;$function$
;

CREATE OR REPLACE FUNCTION public.rpc_list_invoices(p_org_id uuid, p_limit integer DEFAULT 25, p_cursor_issued_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_cursor_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$declare
  v_user_id uuid := auth.uid();
  v_is_owner boolean := false;
  v_limit integer := greatest(1, least(coalesce(p_limit, 25), 100));
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_org_id is null then
    raise exception 'VALIDATION_ERROR: org_id is required';
  end if;

  select true into v_is_owner
  from public.organization_members m
  where m.org_id = p_org_id
    and m.user_id = v_user_id
    and m.role in ('owner','admin')
  limit 1;

  if coalesce(v_is_owner,false) = false then
    raise exception 'FORBIDDEN';
  end if;

  with rows as (
    select
      i.id,
      i.org_id,
      i.number,
      i.status::text as status,
      i.issued_at,
      i.paid_at,
      i.period_start,
      i.period_end,
      i.currency,
      i.subtotal_cents,
      i.vat_cents,
      i.total_cents,
      i.vat_rate,
      i.provider,
      i.mollie_payment_id,
      i.mollie_subscription_id,
      i.pdf_path,
      i.created_at,
      i.updated_at
    from public.invoices i
    where i.org_id = p_org_id
      and (
        p_cursor_issued_at is null
        or (i.issued_at, i.id) < (p_cursor_issued_at, p_cursor_id)
      )
    order by i.issued_at desc nulls last, i.id desc
    limit v_limit
  )
  select jsonb_build_object(
    'orgId', p_org_id,
    'items', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'orgId', r.org_id,
          'number', r.number,
          'status', r.status,
          'issuedAt', r.issued_at,
          'paidAt', r.paid_at,
          'periodStart', r.period_start,
          'periodEnd', r.period_end,
          'currency', r.currency,
          'subtotalCents', r.subtotal_cents,
          'vatCents', r.vat_cents,
          'totalCents', r.total_cents,
          'vatRate', r.vat_rate,
          'provider', r.provider,
          'molliePaymentId', r.mollie_payment_id,
          'mollieSubscriptionId', r.mollie_subscription_id,
          'pdfPath', r.pdf_path,
          'createdAt', r.created_at,
          'updatedAt', r.updated_at
        )
        order by r.issued_at desc nulls last, r.id desc
      ),
      '[]'::jsonb
    ),
    'nextCursor', (
      select case when count(*) = v_limit then
        jsonb_build_object(
          'issuedAt', (select r2.issued_at from rows r2 order by r2.issued_at desc nulls last, r2.id desc limit 1 offset (v_limit - 1)),
          'id',       (select r2.id       from rows r2 order by r2.issued_at desc nulls last, r2.id desc limit 1 offset (v_limit - 1))
        )
      else null end
      from rows
    )
  )
  into v_result
  from rows r;

  -- When there are 0 rows, v_result would be null because FROM rows has no row
  if v_result is null then
    return jsonb_build_object(
      'orgId', p_org_id,
      'items', '[]'::jsonb,
      'nextCursor', null
    );
  end if;

  return v_result;
end;$function$
;

CREATE OR REPLACE FUNCTION public.rpc_set_invoice_pdf_path(p_invoice_id uuid, p_pdf_path text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role text := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(auth.role(), ''),
    current_user
  );
  v_pdf_path text;
begin
  -- 1) Edge-only guard
  if v_role is distinct from 'service_role' then
    raise exception 'FORBIDDEN';
  end if;

  -- 2) Validate input
  if p_invoice_id is null then
    raise exception 'VALIDATION_ERROR: invoice_id is required';
  end if;

  v_pdf_path := nullif(trim(p_pdf_path), '');
  if v_pdf_path is null then
    raise exception 'VALIDATION_ERROR: pdf_path is required';
  end if;

  if length(v_pdf_path) > 500 then
    raise exception 'VALIDATION_ERROR: pdf_path too long';
  end if;

  -- Optional: enforce "<orgId>/<year>/<number>.pdf" shape at least a bit
  -- (keeps garbage out of DB even if edge bugs)
  if v_pdf_path !~ '^[0-9a-fA-F-]{36}/[0-9]{4}/.+\.pdf$' then
    raise exception 'VALIDATION_ERROR: pdf_path invalid format';
  end if;

  -- 3) Update
  update public.invoices
  set pdf_path = v_pdf_path,
      updated_at = now()
  where id = p_invoice_id;

  if not found then
    raise exception 'NOT_FOUND';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_update_invoice_peppol_status(p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role text := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(auth.role(), ''),
    current_user
  );

  v_invoice_id uuid;
  v_status public.invoice_peppol_status;

  v_provider_message_id text;
  v_provider_invoice_id text;

  v_sent_at timestamptz;
  v_error_code text;
  v_error_message text;
  v_payload_hash text;

  v_result jsonb;
begin
  /* 1) Edge-only guard */
  if v_role is distinct from 'service_role' then
    raise exception 'FORBIDDEN';
  end if;

  /* 2) Parse input */
  v_invoice_id := nullif(trim(p_input->>'invoice_id'), '')::uuid;
  if v_invoice_id is null then
    raise exception 'VALIDATION_ERROR: invoice_id is required';
  end if;

  v_status := nullif(trim(p_input->>'status'), '')::public.invoice_peppol_status;
  if v_status is null then
    raise exception 'VALIDATION_ERROR: status is required';
  end if;

  v_provider_message_id := nullif(trim(p_input->>'provider_message_id'), '');
  v_provider_invoice_id := nullif(trim(p_input->>'provider_invoice_id'), '');

  v_sent_at := nullif(trim(p_input->>'sent_at'), '')::timestamptz;

  v_error_code := nullif(trim(p_input->>'error_code'), '');
  v_error_message := nullif(trim(p_input->>'error_message'), '');

  v_payload_hash := nullif(trim(p_input->>'payload_hash'), '');

  /* 3) Update row (idempotent) */
  update public.invoice_peppol ip
  set
    status = v_status,
    provider_message_id = coalesce(v_provider_message_id, ip.provider_message_id),
    provider_invoice_id = coalesce(v_provider_invoice_id, ip.provider_invoice_id),

    sent_at = case
      when v_status in ('sent','accepted','rejected') then coalesce(v_sent_at, ip.sent_at, now())
      else ip.sent_at
    end,

    last_status_at = now(),

    error_code = case
      when v_status in ('failed','rejected') then v_error_code
      else null
    end,

    error_message = case
      when v_status in ('failed','rejected') then v_error_message
      else null
    end,

    payload_hash = coalesce(v_payload_hash, ip.payload_hash),

    attempt_count = case
      when v_status in ('sending','failed') then ip.attempt_count + 1
      else ip.attempt_count
    end,

    updated_at = now()
  where ip.invoice_id = v_invoice_id
  returning jsonb_build_object(
    'invoiceId', invoice_id,
    'status', status,
    'providerInvoiceId', provider_invoice_id,
    'providerMessageId', provider_message_id,
    'sentAt', sent_at,
    'lastStatusAt', last_status_at,
    'attemptCount', attempt_count,
    'errorCode', error_code,
    'errorMessage', error_message,
    'payloadHash', payload_hash,
    'updatedAt', updated_at
  )
  into v_result;

  if v_result is null then
    raise exception 'NOT_FOUND';
  end if;

  return v_result;

exception
  when invalid_text_representation then
    raise exception 'VALIDATION_ERROR: invalid uuid or value type';
  when others then
    raise;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_upsert_organization_billing(p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;

  -- patch values (nullable if absent)
  v_legal_name text;
  v_vat_country_code text;
  v_vat_number text;
  v_address_line1 text;
  v_address_line2 text;
  v_postal_code text;
  v_city text;
  v_country_code text;
  v_billing_email text;
  v_invoice_reference text;

  -- presence flags
  has_legal_name boolean := false;
  has_vat_country_code boolean := false;
  has_vat_number boolean := false;
  has_address_line1 boolean := false;
  has_address_line2 boolean := false;
  has_postal_code boolean := false;
  has_city boolean := false;
  has_country_code boolean := false;
  has_billing_email boolean := false;
  has_invoice_reference boolean := false;

  v_is_owner boolean := false;
  v_exists boolean := false;

  -- for reset logic
  v_cur_vat_country_code text;
  v_cur_vat_number text;
  v_vat_identity_changed boolean := false;

  v_result jsonb;

  v_tmp text;
begin
  /* 1) Auth */
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  /* 2) org_id */
  v_org_id := nullif(trim(p_input->>'org_id'), '')::uuid;
  if v_org_id is null then
    raise exception 'VALIDATION_ERROR: org_id is required';
  end if;

  /* 3) Owner/admin check (front-safe => only owner/admin) */
  select true into v_is_owner
  from public.organization_members m
  where m.org_id = v_org_id
    and m.user_id = v_user_id
    and m.role in ('owner','admin')
  limit 1;

  if coalesce(v_is_owner, false) = false then
    raise exception 'FORBIDDEN';
  end if;

  /* 4) Rate limit */
  perform private.assert_rate_limit(
    'upsert_org_billing:user:' || v_user_id::text || ':org:' || v_org_id::text,
    60,
    60
  );

  /* 5) Ensure org exists */
  perform 1 from public.organizations o where o.id = v_org_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;

  /* 6) Parse patch + mark present */
  if p_input ? 'legal_name' then
    has_legal_name := true;
    v_legal_name := nullif(trim(p_input->>'legal_name'), '');
  end if;

  if p_input ? 'vat_country_code' then
    has_vat_country_code := true;
    v_vat_country_code := nullif(trim(p_input->>'vat_country_code'), '');
    if v_vat_country_code is not null then
      v_vat_country_code := upper(v_vat_country_code);
    end if;
  end if;

  if p_input ? 'vat_number' then
    has_vat_number := true;
    v_vat_number := nullif(trim(p_input->>'vat_number'), '');
    if v_vat_number is not null then
      v_vat_number := upper(regexp_replace(v_vat_number, '\s+', '', 'g'));
    end if;
  end if;

  if p_input ? 'address_line1' then
    has_address_line1 := true;
    v_address_line1 := nullif(trim(p_input->>'address_line1'), '');
  end if;

  if p_input ? 'address_line2' then
    has_address_line2 := true;
    v_address_line2 := nullif(trim(p_input->>'address_line2'), '');
  end if;

  if p_input ? 'postal_code' then
    has_postal_code := true;
    v_postal_code := nullif(trim(p_input->>'postal_code'), '');
  end if;

  if p_input ? 'city' then
    has_city := true;
    v_city := nullif(trim(p_input->>'city'), '');
  end if;

  if p_input ? 'country_code' then
    has_country_code := true;
    v_country_code := nullif(trim(p_input->>'country_code'), '');
    if v_country_code is not null then
      v_country_code := upper(v_country_code);
    end if;
  end if;

  if p_input ? 'billing_email' then
    has_billing_email := true;
    v_billing_email := nullif(trim(p_input->>'billing_email'), '');
    if v_billing_email is not null then
      v_billing_email := lower(v_billing_email);
    end if;
  end if;

  if p_input ? 'invoice_reference' then
    has_invoice_reference := true;
    v_invoice_reference := nullif(trim(p_input->>'invoice_reference'), '');
  end if;

  /* 7) Ignore VAT validation inputs from client (front-safe)
     If they send them, we simply do nothing with them. */

  /* 8) Validations */
  if not (
    has_legal_name or has_vat_country_code or has_vat_number
    or has_address_line1 or has_address_line2 or has_postal_code
    or has_city or has_country_code or has_billing_email
    or has_invoice_reference
  ) then
    raise exception 'VALIDATION_ERROR: no fields to update';
  end if;

  if has_legal_name then
    if v_legal_name is null then
      raise exception 'VALIDATION_ERROR: legal_name cannot be empty';
    end if;
    if length(v_legal_name) > 160 then
      raise exception 'VALIDATION_ERROR: legal_name too long';
    end if;
  end if;

  if has_address_line1 then
    if v_address_line1 is null then
      raise exception 'VALIDATION_ERROR: address_line1 cannot be empty';
    end if;
    if length(v_address_line1) > 200 then
      raise exception 'VALIDATION_ERROR: address_line1 too long';
    end if;
  end if;

  if has_address_line2 and v_address_line2 is not null and length(v_address_line2) > 200 then
    raise exception 'VALIDATION_ERROR: address_line2 too long';
  end if;

  if has_postal_code then
    if v_postal_code is null then
      raise exception 'VALIDATION_ERROR: postal_code cannot be empty';
    end if;
    if length(v_postal_code) > 20 then
      raise exception 'VALIDATION_ERROR: postal_code too long';
    end if;
  end if;

  if has_city then
    if v_city is null then
      raise exception 'VALIDATION_ERROR: city cannot be empty';
    end if;
    if length(v_city) > 120 then
      raise exception 'VALIDATION_ERROR: city too long';
    end if;
  end if;

  if has_country_code then
    if v_country_code is null then
      raise exception 'VALIDATION_ERROR: country_code cannot be empty';
    end if;
    if v_country_code !~ '^[A-Z]{2}$' then
      raise exception 'VALIDATION_ERROR: country_code must be ISO-2';
    end if;
  end if;

  if has_vat_country_code and v_vat_country_code is not null and v_vat_country_code !~ '^[A-Z]{2}$' then
    raise exception 'VALIDATION_ERROR: vat_country_code must be ISO-2';
  end if;

  if has_vat_number and v_vat_number is not null then
    if length(v_vat_number) > 20 then
      raise exception 'VALIDATION_ERROR: vat_number too long';
    end if;
    if length(v_vat_number) < 6 then
      raise exception 'VALIDATION_ERROR: vat_number too short';
    end if;
  end if;

  if has_billing_email and v_billing_email is not null then
    if length(v_billing_email) > 254 then
      raise exception 'VALIDATION_ERROR: billing_email too long';
    end if;
    if v_billing_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' then
      raise exception 'VALIDATION_ERROR: billing_email invalid';
    end if;
  end if;

  if has_invoice_reference and v_invoice_reference is not null and length(v_invoice_reference) > 64 then
    raise exception 'VALIDATION_ERROR: invoice_reference too long';
  end if;

  -- Optional coherence (soft): only enforce when both provided in same patch
  if (has_vat_country_code and has_vat_number) then
    if v_vat_country_code is not null and v_vat_number is null then
      raise exception 'VALIDATION_ERROR: vat_number required when vat_country_code is set';
    end if;
    if v_vat_number is not null and v_vat_country_code is null then
      raise exception 'VALIDATION_ERROR: vat_country_code required when vat_number is set';
    end if;
  end if;

  /* 9) Upsert with VAT validation reset if VAT identity changed */
  select exists(select 1 from public.organization_billing ob where ob.org_id = v_org_id)
    into v_exists;

  if v_exists = false then
    -- First insert => require minimum viable billing info
    if not (has_legal_name and has_address_line1 and has_postal_code and has_city and has_country_code) then
      raise exception 'VALIDATION_ERROR: missing required fields for first billing setup';
    end if;

    insert into public.organization_billing (
      org_id,
      legal_name,
      vat_country_code,
      vat_number,
      address_line1,
      address_line2,
      postal_code,
      city,
      country_code,
      billing_email,
      invoice_reference,
      -- v1: we trust but do not "validate" ourselves
      is_vat_validated,
      vat_validated_at,
      vat_validation_source
    )
    values (
      v_org_id,
      v_legal_name,
      v_vat_country_code,
      v_vat_number,
      v_address_line1,
      v_address_line2,
      v_postal_code,
      v_city,
      v_country_code,
      v_billing_email,
      v_invoice_reference,
      false,
      null,
      null
    );
  else
    -- Load current VAT identity to detect changes
    select ob.vat_country_code, ob.vat_number
      into v_cur_vat_country_code, v_cur_vat_number
    from public.organization_billing ob
    where ob.org_id = v_org_id;

    if has_vat_country_code and v_vat_country_code is distinct from v_cur_vat_country_code then
      v_vat_identity_changed := true;
    end if;

    if has_vat_number and v_vat_number is distinct from v_cur_vat_number then
      v_vat_identity_changed := true;
    end if;

    update public.organization_billing ob
    set
      legal_name = case when has_legal_name then v_legal_name else ob.legal_name end,
      vat_country_code = case when has_vat_country_code then v_vat_country_code else ob.vat_country_code end,
      vat_number = case when has_vat_number then v_vat_number else ob.vat_number end,
      address_line1 = case when has_address_line1 then v_address_line1 else ob.address_line1 end,
      address_line2 = case when has_address_line2 then v_address_line2 else ob.address_line2 end,
      postal_code = case when has_postal_code then v_postal_code else ob.postal_code end,
      city = case when has_city then v_city else ob.city end,
      country_code = case when has_country_code then v_country_code else ob.country_code end,
      billing_email = case when has_billing_email then v_billing_email else ob.billing_email end,
      invoice_reference = case when has_invoice_reference then v_invoice_reference else ob.invoice_reference end,

      -- front-safe: never let client claim validation
      is_vat_validated = case when v_vat_identity_changed then false else ob.is_vat_validated end,
      vat_validated_at = case when v_vat_identity_changed then null else ob.vat_validated_at end,
      vat_validation_source = case when v_vat_identity_changed then null else ob.vat_validation_source end
    where ob.org_id = v_org_id;
  end if;

  /* 10) Return payload */
  select jsonb_build_object(
    'orgId', ob.org_id,
    'legalName', ob.legal_name,
    'vatCountryCode', ob.vat_country_code,
    'vatNumber', ob.vat_number,
    'addressLine1', ob.address_line1,
    'addressLine2', ob.address_line2,
    'postalCode', ob.postal_code,
    'city', ob.city,
    'countryCode', ob.country_code,
    'billingEmail', ob.billing_email,
    'invoiceReference', ob.invoice_reference,
    'isVatValidated', ob.is_vat_validated,
    'vatValidatedAt', ob.vat_validated_at,
    'vatValidationSource', ob.vat_validation_source,
    'updatedAt', ob.updated_at,
    'createdAt', ob.created_at
  )
  into v_result
  from public.organization_billing ob
  where ob.org_id = v_org_id;

  return v_result;

exception
  when invalid_text_representation then
    raise exception 'VALIDATION_ERROR: invalid uuid or value type';
  when unique_violation then
    raise exception 'CONFLICT';
  when others then
    raise;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.search_event_admin_orders_view(p_org_id uuid DEFAULT NULL::uuid, p_event_slug text DEFAULT NULL::text, p_event_id uuid DEFAULT NULL::uuid, p_query text DEFAULT ''::text, p_filter_mode text DEFAULT 'all'::text, p_orders_limit integer DEFAULT 50, p_orders_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_query text := nullif(trim(p_query), '');
  v_filter_mode text := coalesce(nullif(trim(p_filter_mode), ''), 'all');
begin
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

  with matched_orders as (
    select distinct o.id
    from public.orders o
    left join public.order_attendees oa
      on oa.order_id = o.id
    left join public.order_attendee_answers ans
      on ans.attendee_id = oa.id
    where o.event_id = p_event_id
      and (
        v_query is null
        or
        case
          when v_filter_mode = 'order' then
            (
              coalesce(o.buyer_email, '') ilike '%' || v_query || '%'
              or coalesce(o.buyer_name, '') ilike '%' || v_query || '%'
              or coalesce(o.buyer_phone, '') ilike '%' || v_query || '%'
              or o.id::text ilike '%' || v_query || '%'
              or coalesce(o.status, '') ilike '%' || v_query || '%'
            )

          when v_filter_mode like 'field:%' then
            (
              ans.field_key_snapshot = replace(v_filter_mode, 'field:', '')
              and (
                coalesce(ans.field_label_snapshot, '') ilike '%' || v_query || '%'
                or coalesce(ans.value->>'value_text', '') ilike '%' || v_query || '%'
                or coalesce(ans.value->>'value_date', '') ilike '%' || v_query || '%'
                or coalesce(ans.value->>'value_bool', '') ilike '%' || v_query || '%'
                or coalesce(ans.value->>'value_int', '') ilike '%' || v_query || '%'
                or ans.value::text ilike '%' || v_query || '%'
              )
            )

          else
            (
              coalesce(o.buyer_email, '') ilike '%' || v_query || '%'
              or coalesce(o.buyer_name, '') ilike '%' || v_query || '%'
              or coalesce(o.buyer_phone, '') ilike '%' || v_query || '%'
              or o.id::text ilike '%' || v_query || '%'
              or coalesce(o.status, '') ilike '%' || v_query || '%'

              or oa.id::text ilike '%' || v_query || '%'
              or coalesce(oa.product_name_snapshot, '') ilike '%' || v_query || '%'
              or oa.attendee_index::text ilike '%' || v_query || '%'
              or coalesce(oa.status, '') ilike '%' || v_query || '%'

              or coalesce(ans.field_label_snapshot, '') ilike '%' || v_query || '%'
              or coalesce(ans.field_key_snapshot, '') ilike '%' || v_query || '%'
              or coalesce(ans.value->>'value_text', '') ilike '%' || v_query || '%'
              or coalesce(ans.value->>'value_date', '') ilike '%' || v_query || '%'
              or coalesce(ans.value->>'value_bool', '') ilike '%' || v_query || '%'
              or coalesce(ans.value->>'value_int', '') ilike '%' || v_query || '%'
              or ans.value::text ilike '%' || v_query || '%'
            )
        end
      )
  )
  select count(*)
  into v_orders_total
  from matched_orders;

  /* ---------------- Orders page ---------------- */

  with matched_orders as (
    select distinct o.id, o.created_at
    from public.orders o
    left join public.order_attendees oa
      on oa.order_id = o.id
    left join public.order_attendee_answers ans
      on ans.attendee_id = oa.id
    where o.event_id = p_event_id
      and (
        v_query is null
        or
        case
          when v_filter_mode = 'order' then
            (
              coalesce(o.buyer_email, '') ilike '%' || v_query || '%'
              or coalesce(o.buyer_name, '') ilike '%' || v_query || '%'
              or coalesce(o.buyer_phone, '') ilike '%' || v_query || '%'
              or o.id::text ilike '%' || v_query || '%'
              or coalesce(o.status, '') ilike '%' || v_query || '%'
            )

          when v_filter_mode like 'field:%' then
            (
              ans.field_key_snapshot = replace(v_filter_mode, 'field:', '')
              and (
                coalesce(ans.field_label_snapshot, '') ilike '%' || v_query || '%'
                or coalesce(ans.value->>'value_text', '') ilike '%' || v_query || '%'
                or coalesce(ans.value->>'value_date', '') ilike '%' || v_query || '%'
                or coalesce(ans.value->>'value_bool', '') ilike '%' || v_query || '%'
                or coalesce(ans.value->>'value_int', '') ilike '%' || v_query || '%'
                or ans.value::text ilike '%' || v_query || '%'
              )
            )

          else
            (
              coalesce(o.buyer_email, '') ilike '%' || v_query || '%'
              or coalesce(o.buyer_name, '') ilike '%' || v_query || '%'
              or coalesce(o.buyer_phone, '') ilike '%' || v_query || '%'
              or o.id::text ilike '%' || v_query || '%'
              or coalesce(o.status, '') ilike '%' || v_query || '%'

              or oa.id::text ilike '%' || v_query || '%'
              or coalesce(oa.product_name_snapshot, '') ilike '%' || v_query || '%'
              or oa.attendee_index::text ilike '%' || v_query || '%'
              or coalesce(oa.status, '') ilike '%' || v_query || '%'

              or coalesce(ans.field_label_snapshot, '') ilike '%' || v_query || '%'
              or coalesce(ans.field_key_snapshot, '') ilike '%' || v_query || '%'
              or coalesce(ans.value->>'value_text', '') ilike '%' || v_query || '%'
              or coalesce(ans.value->>'value_date', '') ilike '%' || v_query || '%'
              or coalesce(ans.value->>'value_bool', '') ilike '%' || v_query || '%'
              or coalesce(ans.value->>'value_int', '') ilike '%' || v_query || '%'
              or ans.value::text ilike '%' || v_query || '%'
            )
        end
      )
  ),
  o_page as (
    select o.*
    from public.orders o
    join matched_orders mo on mo.id = o.id
    order by o.created_at desc, o.id desc
    limit p_orders_limit
    offset p_orders_offset
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', o_page.id,
          'orgId', o_page.org_id,
          'eventId', o_page.event_id,
          'currency', o_page.currency,
          'totalCents', o_page.total_cents,
          'paidCents', coalesce(o_page.paid_cents, 0),
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
  from o_page;

  /* ---------------- Order items ---------------- */

  select coalesce(
    jsonb_agg(to_jsonb(oi) order by oi.created_at asc, oi.id asc),
    '[]'::jsonb
  )
  into v_order_items
  from public.order_items oi
  where oi.order_id = any(coalesce(v_order_ids, '{}'::uuid[]));

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
  where p.order_id = any(coalesce(v_order_ids, '{}'::uuid[]));

  /* ---------------- Attendees ---------------- */

  with attendees_page_orders as (
    select oa.*
    from public.order_attendees oa
    where oa.order_id = any(coalesce(v_order_ids, '{}'::uuid[]))
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
  where ans.attendee_id = any(coalesce(v_attendee_ids, '{}'::uuid[]));

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
$function$
;

CREATE OR REPLACE FUNCTION public.search_event_admin_tickets_view(p_event_id uuid, p_query text DEFAULT ''::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();

  v_total integer;
  v_rows jsonb;
  v_result jsonb;

  v_query text := nullif(trim(p_query), '');
begin
  /* ---------------- Auth ---------------- */

  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_limit < 1 or p_limit > 1000 then
    raise exception 'VALIDATION_ERROR: limit out of range';
  end if;

  if p_offset is null or p_offset < 0 then
    raise exception 'VALIDATION_ERROR: offset out of range';
  end if;

  /* ---------------- Membership ---------------- */

  if not public.is_event_org_member(p_event_id) then
    raise exception 'FORBIDDEN';
  end if;

  /* ---------------- Total ---------------- */

  with matched_tickets as (
    select distinct t.id
    from public.tickets t
    join public.orders o
      on o.id = t.order_id
    join public.order_items oi
      on oi.id = t.order_item_id
    join public.event_products ep
      on ep.id = t.product_id
    left join public.order_attendees oa
      on oa.order_id = t.order_id
     and oa.product_id = t.product_id
    left join public.order_attendee_answers ans
      on ans.attendee_id = oa.id
    where t.event_id = p_event_id
      and (
        v_query is null
        or (
          t.id::text ilike '%' || v_query || '%'
          or t.order_id::text ilike '%' || v_query || '%'
          or t.order_item_id::text ilike '%' || v_query || '%'
          or t.product_id::text ilike '%' || v_query || '%'
          or t.qr_token ilike '%' || v_query || '%'
          or right(t.qr_token, 8) ilike '%' || v_query || '%'
          or t.ticket_index::text ilike '%' || v_query || '%'
          or coalesce(t.status, '') ilike '%' || v_query || '%'

          or coalesce(oi.product_name_snapshot, '') ilike '%' || v_query || '%'
          or coalesce(o.buyer_email, '') ilike '%' || v_query || '%'

          or coalesce(ans.field_label_snapshot, '') ilike '%' || v_query || '%'
          or coalesce(ans.field_key_snapshot, '') ilike '%' || v_query || '%'
          or coalesce(ans.value->>'value_text', '') ilike '%' || v_query || '%'
          or coalesce(ans.value->>'value_date', '') ilike '%' || v_query || '%'
          or coalesce(ans.value->>'value_bool', '') ilike '%' || v_query || '%'
          or coalesce(ans.value->>'value_int', '') ilike '%' || v_query || '%'
          or ans.value::text ilike '%' || v_query || '%'
        )
      )
  )
  select count(*)
  into v_total
  from matched_tickets;

  /* ---------------- Tickets ---------------- */

  with matched_tickets as (
    select distinct
      t.id,
      t.created_at
    from public.tickets t
    join public.orders o
      on o.id = t.order_id
    join public.order_items oi
      on oi.id = t.order_item_id
    join public.event_products ep
      on ep.id = t.product_id
    left join public.order_attendees oa
      on oa.order_id = t.order_id
     and oa.product_id = t.product_id
    left join public.order_attendee_answers ans
      on ans.attendee_id = oa.id
    where t.event_id = p_event_id
      and (
        v_query is null
        or (
          t.id::text ilike '%' || v_query || '%'
          or t.order_id::text ilike '%' || v_query || '%'
          or t.order_item_id::text ilike '%' || v_query || '%'
          or t.product_id::text ilike '%' || v_query || '%'
          or t.qr_token ilike '%' || v_query || '%'
          or right(t.qr_token, 8) ilike '%' || v_query || '%'
          or t.ticket_index::text ilike '%' || v_query || '%'
          or coalesce(t.status, '') ilike '%' || v_query || '%'

          or coalesce(oi.product_name_snapshot, '') ilike '%' || v_query || '%'
          or coalesce(o.buyer_email, '') ilike '%' || v_query || '%'

          or coalesce(ans.field_label_snapshot, '') ilike '%' || v_query || '%'
          or coalesce(ans.field_key_snapshot, '') ilike '%' || v_query || '%'
          or coalesce(ans.value->>'value_text', '') ilike '%' || v_query || '%'
          or coalesce(ans.value->>'value_date', '') ilike '%' || v_query || '%'
          or coalesce(ans.value->>'value_bool', '') ilike '%' || v_query || '%'
          or coalesce(ans.value->>'value_int', '') ilike '%' || v_query || '%'
          or ans.value::text ilike '%' || v_query || '%'
        )
      )
  ),
  t_page as (
    select
      t.id,
      t.order_id,
      t.order_item_id,
      t.product_id,
      t.ticket_index,
      t.qr_token,
      t.status,
      t.checked_in_at,
      t.created_at,

      oi.product_name_snapshot,
      oi.unit_price_cents_snapshot,

      ep.creates_attendees,
      t.admits_count,

      o.created_at as order_created_at,
      o.buyer_email

    from public.tickets t
    join matched_tickets mt
      on mt.id = t.id
    join public.orders o
      on o.id = t.order_id
    join public.order_items oi
      on oi.id = t.order_item_id
    join public.event_products ep
      on ep.id = t.product_id
    order by t.created_at desc, t.id desc
    limit p_limit
    offset p_offset
  ),

  attendees_ranked as (
    select
      oa.id,
      oa.order_id,
      oa.product_id,
      oa.attendee_index,
      row_number() over (
        partition by oa.order_id, oa.product_id
        order by oa.attendee_index asc, oa.created_at asc, oa.id asc
      ) as rn
    from public.order_attendees oa
    where oa.order_id in (select distinct order_id from t_page)
  ),

  answers_ranked as (
    select
      ans.attendee_id,
      coalesce(nullif(trim(ans.field_key_snapshot), ''), '') as field_key_snapshot,
      coalesce(
        nullif(trim(ans.field_label_snapshot), ''),
        nullif(trim(ans.field_key_snapshot), ''),
        'Champ'
      ) as field_label_snapshot,
      case
        when jsonb_typeof(ans.value) = 'string' then trim(both '"' from ans.value::text)
        when jsonb_typeof(ans.value) = 'number' then ans.value::text
        when jsonb_typeof(ans.value) = 'boolean' then
          case when ans.value::text = 'true' then 'Oui' else 'Non' end
        when jsonb_typeof(ans.value) = 'object' then
          coalesce(
            nullif(ans.value->>'value_text', ''),
            nullif(ans.value->>'value_date', ''),
            nullif(ans.value->>'value_int', ''),
            case
              when ans.value ? 'value_bool' then
                case when ans.value->>'value_bool' = 'true' then 'Oui' else 'Non' end
              else null
            end
          )
        else null
      end as rendered_value
    from public.order_attendee_answers ans
    where ans.attendee_id in (select id from attendees_ranked)
  )

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'orderId', t.order_id,
        'orderItemId', t.order_item_id,

        'productId', t.product_id,
        'productNameSnapshot', t.product_name_snapshot,
        'unitPriceCentsSnapshot', t.unit_price_cents_snapshot,

        'ticketIndex', t.ticket_index,
        'reference', right(t.qr_token, 8),
        'qrToken', t.qr_token,

        'status', t.status,
        'checkedInAt', t.checked_in_at,
        'createdAt', t.created_at,

        'createsAttendees', t.creates_attendees,
        'admitsCount', t.admits_count,

        'orderCreatedAt', t.order_created_at,
        'buyerEmail', t.buyer_email,

        'attendeeSummaryLines',
          case
            when not t.creates_attendees then '[]'::jsonb
            else coalesce((
              select jsonb_agg(s.line order by s.priority, s.attendee_rn, s.answer_ord)
              from (
                select *
                from (
                  select
                    ar.rn as attendee_rn,
                    case
                      when lower(coalesce(a.field_key_snapshot, '')) in ('first_name', 'firstname', 'prenom', 'prénom') then 1
                      when lower(coalesce(a.field_key_snapshot, '')) in ('last_name', 'lastname', 'nom') then 2
                      when lower(coalesce(a.field_key_snapshot, '')) in ('email', 'e-mail', 'mail') then 3
                      else 10
                    end as priority,
                    row_number() over (
                      partition by ar.id
                      order by
                        case
                          when lower(coalesce(a.field_key_snapshot, '')) in ('first_name', 'firstname', 'prenom', 'prénom') then 1
                          when lower(coalesce(a.field_key_snapshot, '')) in ('last_name', 'lastname', 'nom') then 2
                          when lower(coalesce(a.field_key_snapshot, '')) in ('email', 'e-mail', 'mail') then 3
                          else 10
                        end,
                        a.field_label_snapshot
                    ) as answer_ord,
                    (a.field_label_snapshot || ' : ' || a.rendered_value) as line
                  from attendees_ranked ar
                  join answers_ranked a
                    on a.attendee_id = ar.id
                  where ar.order_id = t.order_id
                    and ar.product_id = t.product_id
                    and ar.rn between
                      (((t.ticket_index - 1) * greatest(t.admits_count, 1)) + 1)
                      and
                      (t.ticket_index * greatest(t.admits_count, 1))
                    and a.rendered_value is not null
                    and nullif(trim(a.rendered_value), '') is not null
                ) ranked_answers
                where ranked_answers.answer_ord <= 2
                order by ranked_answers.priority, ranked_answers.attendee_rn, ranked_answers.answer_ord
                limit 2
              ) s
            ), '[]'::jsonb)
          end
      )
      order by t.created_at desc, t.id desc
    ),
    '[]'::jsonb
  )
  into v_rows
  from t_page t;

  /* ---------------- Payload ---------------- */

  v_result := jsonb_build_object(
    'tickets', jsonb_build_object(
      'limit', p_limit,
      'offset', p_offset,
      'total', v_total,
      'rows', v_rows
    )
  );

  return v_result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
begin
  new.updated_at := now();
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.slugify(input text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$select nullif(
  trim(both '-' from regexp_replace(
    public.unaccent(lower(coalesce(input,''))),
    '[^a-z0-9]+',
    '-',
    'g'
  )),
  ''
);$function$
;

CREATE OR REPLACE FUNCTION public.trg_block_branding_update_on_free()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  v_plan text;
  v_branding_changed boolean;
begin
  -- Hardening
  perform set_config('search_path', 'pg_temp, public, extensions, private', true);

  -- Detect change on branding-related columns only
  v_branding_changed :=
    (new.primary_color is distinct from old.primary_color)
    or (new.logo_url is distinct from old.logo_url)
    or (new.default_event_banner_url is distinct from old.default_event_banner_url);

  if not v_branding_changed then
    return new;
  end if;

  -- Fetch current plan (ADAPT THIS SELECT to your schema)
  select lower(nullif(trim(o.plan), ''))
    into v_plan
  from public.organizations o
  where o.id = new.org_id;

  -- If org not found or plan missing -> treat as free (safer)
  if coalesce(v_plan, 'free') = 'free' then
    raise exception 'PLAN_LIMIT: branding_not_allowed_on_free'
      using errcode = '42501';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_event(p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$declare
  v_user_id uuid := auth.uid();
  v_event_id uuid;
  v_org_id uuid;

  -- valeurs actuelles
  v_cur_title text;
  v_cur_location text;
  v_cur_description text;
  v_cur_banner_url text;
  v_cur_starts_at timestamptz;
  v_cur_ends_at timestamptz;
  v_cur_is_published boolean;
  v_cur_deposit_cents int;
  v_cur_max_attendees int;

  -- patch
  v_title text;
  v_location text;
  v_description text;
  v_banner_url text;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_is_published boolean;
  v_deposit_cents int;
  v_max_attendees int;

  v_has_title boolean := false;
  v_has_location boolean := false;
  v_has_description boolean := false;
  v_has_banner boolean := false;
  v_has_starts boolean := false;
  v_has_ends boolean := false;
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
  -- Auth
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- event_id (snake_case, car repo camelToSnake)
  v_event_id := (p_input->>'event_id')::uuid;
  if v_event_id is null then
    raise exception 'VALIDATION_ERROR: event_id is required';
  end if;

  -- Load event
  select
    e.org_id,
    e.slug,
    e.title,
    e.location,
    e.description,
    e.banner_url,
    e.starts_at,
    e.ends_at,
    e.is_published,
    e.deposit_cents,
    e.max_attendees
  into
    v_org_id,
    v_cur_slug,
    v_cur_title,
    v_cur_location,
    v_cur_description,
    v_cur_banner_url,
    v_cur_starts_at,
    v_cur_ends_at,
    v_cur_is_published,
    v_cur_deposit_cents,
    v_cur_max_attendees
  from public.events e
  where e.id = v_event_id;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  -- Membership
  perform 1
  from public.organization_members
  where org_id = v_org_id
    and user_id = v_user_id
    and role in ('owner','admin');

  if not found then
    raise exception 'FORBIDDEN';
  end if;

  -- Rate limit
  perform public.assert_rate_limit(
    'update_event:' || v_event_id::text,
    120,
    3600
  );

  -- Parse patch (snake_case, car repo camelToSnake)
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

  -- Validation dates sur état final
  if
    coalesce(case when v_has_ends then v_ends_at else v_cur_ends_at end, null) is not null
    and coalesce(case when v_has_starts then v_starts_at else v_cur_starts_at end, null) is not null
    and (case when v_has_ends then v_ends_at else v_cur_ends_at end)
        < (case when v_has_starts then v_starts_at else v_cur_starts_at end)
  then
    raise exception 'VALIDATION_ERROR: ends_at must be after starts_at';
  end if;

  /* ------------------------------
   * Plan limits (acompte)
   * ------------------------------ */

  -- lock event pour éviter courses
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

  -- Update
  update public.events
  set
    slug = case when v_has_title and v_title is distinct from v_cur_title then v_new_slug else slug end,
    title = coalesce(v_title, title),
    location = case when v_has_location then v_location else location end,
    description = case when v_has_description then v_description else description end,
    banner_url = case when v_has_banner then v_banner_url else banner_url end,
    starts_at = case when v_has_starts then v_starts_at else starts_at end,
    ends_at = case when v_has_ends then v_ends_at else ends_at end,
    is_published = case when v_has_published then v_is_published else is_published end,
    deposit_cents = case when v_has_deposit then v_deposit_cents else deposit_cents end,
    max_attendees = case when v_has_max_attendees then v_max_attendees else max_attendees end,
    updated_at = v_now
  where id = v_event_id;

  select * into v_row
  from public.events
  where id = v_event_id;

  return jsonb_build_object(
    'id', v_row.id,
    'orgId', v_row.org_id,
    'slug', v_row.slug,
    'title', v_row.title,
    'description', v_row.description,
    'location', v_row.location,
    'bannerUrl', v_row.banner_url,
    'depositCents', v_row.deposit_cents,
    'maxAttendees', v_row.max_attendees,
    'startsAt', v_row.starts_at,
    'endsAt', v_row.ends_at,
    'isPublished', v_row.is_published,
    'createdAt', v_row.created_at,
    'updatedAt', v_row.updated_at
  );
end;$function$
;

CREATE OR REPLACE FUNCTION public.update_event_product(p_input jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$declare
  v_user_id uuid := auth.uid();

  v_product_id uuid;

  -- row actuelle
  v_cur record;

  -- resolved
  v_event_id uuid;
  v_org_id uuid;

  -- patch fields (nullable = non fourni)
  v_name text;
  v_description text;
  v_price_cents int;
  v_currency text;
  v_stock_qty int;
  v_is_active boolean;
  v_sort_order int;
  v_creates_attendees boolean;
  v_attendees_per_unit int;

  v_is_gatekeeper boolean;
  v_close_event_when_sold_out boolean;

  -- new computed values
  v_new_price_cents int;
  v_new_currency text;
  v_new_is_gatekeeper boolean;
  v_new_close_event_when_sold_out boolean;

  -- plan check helpers
  v_event_paid_before boolean;
  v_event_paid_after boolean;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  /* ------------------------------
   * Parse
   * ------------------------------ */
  v_product_id := nullif(trim(p_input->>'product_id'), '')::uuid;

  if v_product_id is null then
    raise exception 'VALIDATION_ERROR: product_id is required';
  end if;

  if p_input ? 'name' then
    v_name := nullif(trim(p_input->>'name'), '');
  end if;

  if p_input ? 'description' then
    v_description := nullif(trim(p_input->>'description'), '');
  end if;

  if p_input ? 'price_cents' then
    v_price_cents := nullif(trim(p_input->>'price_cents'), '')::int;
  end if;

  if p_input ? 'currency' then
    v_currency := upper(coalesce(nullif(trim(p_input->>'currency'), ''), 'EUR'));
  end if;

  if p_input ? 'stock_qty' then
    v_stock_qty := nullif((p_input->>'stock_qty')::int, 0);
  end if;

  if p_input ? 'is_active' then
    v_is_active := (p_input->>'is_active')::boolean;
  end if;

  if p_input ? 'sort_order' then
    v_sort_order := (p_input->>'sort_order')::int;
  end if;

  if p_input ? 'creates_attendees' then
    v_creates_attendees := (p_input->>'creates_attendees')::boolean;
  end if;

  if p_input ? 'attendees_per_unit' then
    v_attendees_per_unit := (p_input->>'attendees_per_unit')::int;
  end if;

  if p_input ? 'is_gatekeeper' then
    v_is_gatekeeper := (p_input->>'is_gatekeeper')::boolean;
  end if;

  if p_input ? 'close_event_when_sold_out' then
    v_close_event_when_sold_out := (p_input->>'close_event_when_sold_out')::boolean;
  end if;

  /* ------------------------------
   * Load current product + event/org
   * ------------------------------ */
  select
    ep.id,
    ep.event_id,
    ep.name,
    ep.description,
    ep.price_cents,
    ep.currency,
    ep.stock_qty,
    ep.is_active,
    ep.sort_order,
    ep.creates_attendees,
    ep.attendees_per_unit,
    ep.is_gatekeeper,
    ep.close_event_when_sold_out,
    e.org_id
  into v_cur
  from public.event_products ep
  join public.events e on e.id = ep.event_id
  where ep.id = v_product_id
  limit 1;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  v_event_id := v_cur.event_id;
  v_org_id := v_cur.org_id;

  /* ------------------------------
   * Authorization
   * ------------------------------ */
  if not public.is_org_member(v_org_id) then
    raise exception 'FORBIDDEN';
  end if;

  /* ------------------------------
   * Rate limit
   * ------------------------------ */
  perform public.assert_rate_limit(
    'update_product:org:' || v_org_id::text || ':user:' || v_user_id::text,
    200,
    3600
  );

  /* ------------------------------
   * Compute "new" values for validation & plan checks
   * ------------------------------ */
  v_new_price_cents := coalesce(v_price_cents, v_cur.price_cents, 0);
  v_new_currency := coalesce(v_currency, v_cur.currency, 'EUR');
  v_new_is_gatekeeper := coalesce(v_is_gatekeeper, v_cur.is_gatekeeper, false);
  v_new_close_event_when_sold_out :=
    coalesce(v_close_event_when_sold_out, v_cur.close_event_when_sold_out, false);

  /* ------------------------------
   * Validations (sur les valeurs finales)
   * ------------------------------ */
  if v_name is not null and length(v_name) > 80 then
    raise exception 'VALIDATION_ERROR: name too long';
  end if;

  if v_new_price_cents < 0 then
    raise exception 'VALIDATION_ERROR: price_cents must be >= 0';
  end if;

  if v_new_currency <> 'EUR' then
    raise exception 'VALIDATION_ERROR: unsupported currency';
  end if;

  if coalesce(v_creates_attendees, v_cur.creates_attendees, true) then
    if coalesce(v_attendees_per_unit, v_cur.attendees_per_unit, 1) < 1 then
      raise exception 'VALIDATION_ERROR: attendees_per_unit must be >= 1';
    end if;
  end if;

  if v_new_close_event_when_sold_out and not v_new_is_gatekeeper then
    raise exception 'VALIDATION_ERROR: close_event_when_sold_out requires is_gatekeeper=true';
  end if;

  /* ------------------------------
   * Plan limits
   * ------------------------------ */
  -- event payant avant update ? (définition robuste: au moins un produit payant, actif ou non)
    v_event_paid_before := public.is_event_paid(v_event_id);

  -- lock event pour éviter les courses (optionnel mais safe)
  perform 1
  from public.events e
  where e.id = v_event_id
  for update;

  -- event payant après update ?
    if v_new_price_cents > 0 then
    v_event_paid_after := true;
  else
    v_event_paid_after :=
      exists (
        select 1
        from public.events e
        where e.id = v_event_id
          and coalesce(e.deposit_cents, 0) > 0
      )
      or exists (
        select 1
        from public.event_products ep
        where ep.event_id = v_event_id
          and ep.id <> v_product_id
          and coalesce(ep.price_cents, 0) > 0
      );
  end if;


  -- si l'event passe de "gratuit" -> "payant" via cet update, appliquer limite plan
  if coalesce(v_event_paid_before, false) = false
     and coalesce(v_event_paid_after, false) = true
  then
    perform public.assert_can_create_paid_product(v_org_id, v_event_id);
  end if;

  /* ------------------------------
   * Update
   * ------------------------------ */
  update public.event_products ep
  set
    name = coalesce(v_name, ep.name),
    description = coalesce(v_description, ep.description),
    price_cents = coalesce(v_price_cents, ep.price_cents),
    currency = coalesce(v_currency, ep.currency),
    stock_qty = coalesce(v_stock_qty, ep.stock_qty),
    is_active = coalesce(v_is_active, ep.is_active),
    sort_order = coalesce(v_sort_order, ep.sort_order),
    creates_attendees = coalesce(v_creates_attendees, ep.creates_attendees),
    attendees_per_unit = coalesce(v_attendees_per_unit, ep.attendees_per_unit),
    is_gatekeeper = coalesce(v_is_gatekeeper, ep.is_gatekeeper),
    close_event_when_sold_out = coalesce(v_close_event_when_sold_out, ep.close_event_when_sold_out),
    updated_at = now()
  where ep.id = v_product_id;

  return v_product_id;

exception
  when unique_violation then
    raise exception 'CONFLICT';
end;$function$
;

CREATE OR REPLACE FUNCTION public.update_order_paid_cents()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.status = 'paid' and new.is_refund = false then
    update public.orders
    set paid_cents = paid_cents + new.amount_cents
    where id = new.order_id;
  end if;

  if new.status = 'paid' and new.is_refund = true then
    update public.orders
    set paid_cents = paid_cents - new.amount_cents
    where id = new.order_id;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_org_mollie_tokens(p_org_id uuid, p_access_token_enc text, p_refresh_token_enc text, p_enc_kid text, p_enc_alg text, p_expires_at timestamp with time zone, p_scopes text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$begin
  if p_org_id is null then
    raise exception 'VALIDATION_ERROR: org_id required';
  end if;

  update private.organization_mollie_connect
  set
    access_token_enc = p_access_token_enc,
    refresh_token_enc = p_refresh_token_enc,
    enc_kid = p_enc_kid,
    enc_alg = p_enc_alg,
    access_token_expires_at = p_expires_at,
    scopes = p_scopes,
    updated_at = now()
  where org_id = p_org_id;

  if not found then
  raise exception 'NOT_FOUND';
end if;

end;$function$
;

CREATE OR REPLACE FUNCTION public.update_organization(p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$declare
  v_user_id uuid := auth.uid();

  v_org_id uuid;

  -- current
  v_cur_name text;

  -- patch values (nullable if absent)
  v_type text;
  v_name text;
  v_status text;

  v_description text;
  v_public_email text;
  v_phone text;
  v_website text;
  v_email_reminder_days_before int;

  -- payments (je conseille de ne PAS exposer ça au front)
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

  -- 4) Rate limit (ex: 60/min par org+user)
  perform private.assert_rate_limit(
    'update_org:user:' || v_user_id::text || ':org:' || v_org_id::text,
    60,
    60
  );

  -- 5) Load current (for name comparisons / existence)
  select o.name into v_cur_name
  from public.organizations o
  where o.id = v_org_id
  limit 1;

  if v_cur_name is null then
    raise exception 'NOT_FOUND';
  end if;

  -- 6) Parse patch + mark "present"
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

    -- accepte null / "" => null
    if nullif(trim(p_input->>'email_reminder_days_before'), '') is null then
      v_email_reminder_days_before := null;
    else
      v_email_reminder_days_before := (p_input->>'email_reminder_days_before')::int;
    end if;
  end if;

  -- 7) Validations
  -- type/name/status => owner/admin only
  if (has_type or has_name or has_status or has_payments_status or has_payments_live_ready)
     and coalesce(v_is_owner,false) = false then
    raise exception 'FORBIDDEN';
  end if;

  if has_type then
    if v_type is null then
      raise exception 'VALIDATION_ERROR: type cannot be empty';
    end if;
    if v_type not in ('association','person') then
      raise exception 'VALIDATION_ERROR: invalid type';
    end if;
  end if;

  if has_name then
    if v_name is null then
      raise exception 'VALIDATION_ERROR: name cannot be empty';
    end if;
    if length(v_name) > 80 then
      raise exception 'VALIDATION_ERROR: name too long';
    end if;
  end if;

  if has_status then
    if v_status is null then
      raise exception 'VALIDATION_ERROR: status cannot be empty';
    end if;
    if v_status not in ('active','suspended') then
      raise exception 'VALIDATION_ERROR: invalid status';
    end if;
  end if;

  -- profile validations (membre suffit)
  if has_description and v_description is not null and length(v_description) > 2000 then
    raise exception 'VALIDATION_ERROR: description too long';
  end if;

  if has_public_email and v_public_email is not null and length(v_public_email) > 254 then
    raise exception 'VALIDATION_ERROR: public_email too long';
  end if;

  if has_phone and v_phone is not null and length(v_phone) > 40 then
    raise exception 'VALIDATION_ERROR: phone too long';
  end if;

  if has_website and v_website is not null and length(v_website) > 300 then
    raise exception 'VALIDATION_ERROR: website too long';
  end if;

  -- payments validations (si tu les gardes)
  if has_payments_status then
    if v_payments_status is null then
      raise exception 'VALIDATION_ERROR: payment_status cannot be empty';
    end if;
    if v_payments_status not in ('not_connected','pending','connected','revoked') then
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

  -- 9 & 10) Update organization_profile (slug + other fields)

if has_name and v_name is distinct from v_cur_name then
  v_new_slug := private.generate_unique_org_slug(v_name);
  perform set_config('app.allow_org_profile_slug_change', 'on', true);
end if;

if has_name or has_description or has_public_email or has_phone or has_website or has_email_reminder_days_before then
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

  -- 11) Return payload (pratique pour front)
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
end;$function$
;

CREATE OR REPLACE FUNCTION public.upsert_organization_mollie_connect(p_input jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare
  v_org_id uuid := nullif(trim(p_input->>'org_id'), '')::uuid;
  v_mode text := lower(nullif(trim(p_input->>'mode'), ''));

  v_access_token_enc text := nullif(p_input->>'access_token_enc', '');
  v_refresh_token_enc text := nullif(p_input->>'refresh_token_enc', '');

  v_enc_kid text := nullif(trim(p_input->>'enc_kid'), '');
  v_enc_alg text := nullif(trim(p_input->>'enc_alg'), '');

  v_expires_at timestamptz := nullif(trim(p_input->>'access_token_expires_at'), '')::timestamptz;

  v_scopes text := nullif(p_input->>'scopes', '');
  v_mollie_org_id text := nullif(p_input->>'mollie_organization_id', '');
  v_mollie_profile_id text := nullif(p_input->>'mollie_profile_id', '');
begin
  if v_org_id is null then
    raise exception 'VALIDATION_ERROR: org_id is required';
  end if;

  if v_mode is null then v_mode := 'live'; end if;
  if v_mode not in ('test','live') then
    raise exception 'VALIDATION_ERROR: invalid mode';
  end if;

  if v_access_token_enc is null or v_refresh_token_enc is null then
    raise exception 'VALIDATION_ERROR: missing encrypted tokens';
  end if;

  if v_enc_kid is null then
    raise exception 'VALIDATION_ERROR: enc_kid is required';
  end if;

  if v_enc_alg is null then
    raise exception 'VALIDATION_ERROR: enc_alg is required';
  end if;

  if v_enc_alg <> 'A256GCM' then
    raise exception 'VALIDATION_ERROR: unsupported enc_alg';
  end if;

  if v_expires_at is null then
    raise exception 'VALIDATION_ERROR: access_token_expires_at is required';
  end if;

  insert into private.organization_mollie_connect (
    org_id,
    status,
    mode,
    access_token_enc,
    refresh_token_enc,
    enc_kid,
    enc_alg,
    access_token_expires_at,
    scopes,
    mollie_organization_id,
    mollie_profile_id,
    connected_at,
    created_at,
    updated_at
  )
  values (
    v_org_id,
    'connected',
    v_mode,
    v_access_token_enc,
    v_refresh_token_enc,
    v_enc_kid,
    v_enc_alg,
    v_expires_at,
    v_scopes,
    v_mollie_org_id,
    v_mollie_profile_id,
    now(),
    now(),
    now()
  )
  on conflict (org_id) do update
  set
    status = excluded.status,
    mode = excluded.mode,
    access_token_enc = excluded.access_token_enc,
    refresh_token_enc = excluded.refresh_token_enc,
    enc_kid = excluded.enc_kid,
    enc_alg = excluded.enc_alg,
    access_token_expires_at = excluded.access_token_expires_at,
    scopes = excluded.scopes,
    mollie_organization_id = excluded.mollie_organization_id,
    mollie_profile_id = excluded.mollie_profile_id,
    connected_at = excluded.connected_at,
    updated_at = now();
end;
$function$
;

grant delete on table "public"."allowed_return_origins" to "anon";

grant insert on table "public"."allowed_return_origins" to "anon";

grant references on table "public"."allowed_return_origins" to "anon";

grant select on table "public"."allowed_return_origins" to "anon";

grant trigger on table "public"."allowed_return_origins" to "anon";

grant truncate on table "public"."allowed_return_origins" to "anon";

grant update on table "public"."allowed_return_origins" to "anon";

grant delete on table "public"."allowed_return_origins" to "authenticated";

grant insert on table "public"."allowed_return_origins" to "authenticated";

grant references on table "public"."allowed_return_origins" to "authenticated";

grant select on table "public"."allowed_return_origins" to "authenticated";

grant trigger on table "public"."allowed_return_origins" to "authenticated";

grant truncate on table "public"."allowed_return_origins" to "authenticated";

grant update on table "public"."allowed_return_origins" to "authenticated";

grant delete on table "public"."allowed_return_origins" to "service_role";

grant insert on table "public"."allowed_return_origins" to "service_role";

grant references on table "public"."allowed_return_origins" to "service_role";

grant select on table "public"."allowed_return_origins" to "service_role";

grant trigger on table "public"."allowed_return_origins" to "service_role";

grant truncate on table "public"."allowed_return_origins" to "service_role";

grant update on table "public"."allowed_return_origins" to "service_role";

grant delete on table "public"."event_form_field_groups" to "anon";

grant insert on table "public"."event_form_field_groups" to "anon";

grant references on table "public"."event_form_field_groups" to "anon";

grant select on table "public"."event_form_field_groups" to "anon";

grant trigger on table "public"."event_form_field_groups" to "anon";

grant truncate on table "public"."event_form_field_groups" to "anon";

grant update on table "public"."event_form_field_groups" to "anon";

grant delete on table "public"."event_form_field_groups" to "authenticated";

grant insert on table "public"."event_form_field_groups" to "authenticated";

grant references on table "public"."event_form_field_groups" to "authenticated";

grant select on table "public"."event_form_field_groups" to "authenticated";

grant trigger on table "public"."event_form_field_groups" to "authenticated";

grant truncate on table "public"."event_form_field_groups" to "authenticated";

grant update on table "public"."event_form_field_groups" to "authenticated";

grant delete on table "public"."event_form_field_groups" to "service_role";

grant insert on table "public"."event_form_field_groups" to "service_role";

grant references on table "public"."event_form_field_groups" to "service_role";

grant select on table "public"."event_form_field_groups" to "service_role";

grant trigger on table "public"."event_form_field_groups" to "service_role";

grant truncate on table "public"."event_form_field_groups" to "service_role";

grant update on table "public"."event_form_field_groups" to "service_role";

grant delete on table "public"."event_form_fields" to "anon";

grant insert on table "public"."event_form_fields" to "anon";

grant references on table "public"."event_form_fields" to "anon";

grant select on table "public"."event_form_fields" to "anon";

grant trigger on table "public"."event_form_fields" to "anon";

grant truncate on table "public"."event_form_fields" to "anon";

grant update on table "public"."event_form_fields" to "anon";

grant delete on table "public"."event_form_fields" to "authenticated";

grant insert on table "public"."event_form_fields" to "authenticated";

grant references on table "public"."event_form_fields" to "authenticated";

grant select on table "public"."event_form_fields" to "authenticated";

grant trigger on table "public"."event_form_fields" to "authenticated";

grant truncate on table "public"."event_form_fields" to "authenticated";

grant update on table "public"."event_form_fields" to "authenticated";

grant delete on table "public"."event_form_fields" to "service_role";

grant insert on table "public"."event_form_fields" to "service_role";

grant references on table "public"."event_form_fields" to "service_role";

grant select on table "public"."event_form_fields" to "service_role";

grant trigger on table "public"."event_form_fields" to "service_role";

grant truncate on table "public"."event_form_fields" to "service_role";

grant update on table "public"."event_form_fields" to "service_role";

grant references on table "public"."event_products" to "anon";

grant select on table "public"."event_products" to "anon";

grant trigger on table "public"."event_products" to "anon";

grant truncate on table "public"."event_products" to "anon";

grant delete on table "public"."event_products" to "authenticated";

grant insert on table "public"."event_products" to "authenticated";

grant references on table "public"."event_products" to "authenticated";

grant select on table "public"."event_products" to "authenticated";

grant trigger on table "public"."event_products" to "authenticated";

grant truncate on table "public"."event_products" to "authenticated";

grant update on table "public"."event_products" to "authenticated";

grant delete on table "public"."event_products" to "service_role";

grant insert on table "public"."event_products" to "service_role";

grant references on table "public"."event_products" to "service_role";

grant select on table "public"."event_products" to "service_role";

grant trigger on table "public"."event_products" to "service_role";

grant truncate on table "public"."event_products" to "service_role";

grant update on table "public"."event_products" to "service_role";

grant delete on table "public"."events" to "anon";

grant insert on table "public"."events" to "anon";

grant references on table "public"."events" to "anon";

grant select on table "public"."events" to "anon";

grant trigger on table "public"."events" to "anon";

grant truncate on table "public"."events" to "anon";

grant update on table "public"."events" to "anon";

grant delete on table "public"."events" to "authenticated";

grant insert on table "public"."events" to "authenticated";

grant references on table "public"."events" to "authenticated";

grant select on table "public"."events" to "authenticated";

grant trigger on table "public"."events" to "authenticated";

grant truncate on table "public"."events" to "authenticated";

grant update on table "public"."events" to "authenticated";

grant delete on table "public"."events" to "service_role";

grant insert on table "public"."events" to "service_role";

grant references on table "public"."events" to "service_role";

grant select on table "public"."events" to "service_role";

grant trigger on table "public"."events" to "service_role";

grant truncate on table "public"."events" to "service_role";

grant update on table "public"."events" to "service_role";

grant delete on table "public"."invoice_peppol" to "service_role";

grant insert on table "public"."invoice_peppol" to "service_role";

grant references on table "public"."invoice_peppol" to "service_role";

grant select on table "public"."invoice_peppol" to "service_role";

grant trigger on table "public"."invoice_peppol" to "service_role";

grant truncate on table "public"."invoice_peppol" to "service_role";

grant update on table "public"."invoice_peppol" to "service_role";

grant delete on table "public"."invoices" to "anon";

grant insert on table "public"."invoices" to "anon";

grant references on table "public"."invoices" to "anon";

grant select on table "public"."invoices" to "anon";

grant trigger on table "public"."invoices" to "anon";

grant truncate on table "public"."invoices" to "anon";

grant update on table "public"."invoices" to "anon";

grant delete on table "public"."invoices" to "authenticated";

grant insert on table "public"."invoices" to "authenticated";

grant references on table "public"."invoices" to "authenticated";

grant select on table "public"."invoices" to "authenticated";

grant trigger on table "public"."invoices" to "authenticated";

grant truncate on table "public"."invoices" to "authenticated";

grant update on table "public"."invoices" to "authenticated";

grant delete on table "public"."invoices" to "service_role";

grant insert on table "public"."invoices" to "service_role";

grant references on table "public"."invoices" to "service_role";

grant select on table "public"."invoices" to "service_role";

grant trigger on table "public"."invoices" to "service_role";

grant truncate on table "public"."invoices" to "service_role";

grant update on table "public"."invoices" to "service_role";

grant references on table "public"."order_attendee_answers" to "anon";

grant select on table "public"."order_attendee_answers" to "anon";

grant trigger on table "public"."order_attendee_answers" to "anon";

grant truncate on table "public"."order_attendee_answers" to "anon";

grant references on table "public"."order_attendee_answers" to "authenticated";

grant select on table "public"."order_attendee_answers" to "authenticated";

grant trigger on table "public"."order_attendee_answers" to "authenticated";

grant truncate on table "public"."order_attendee_answers" to "authenticated";

grant delete on table "public"."order_attendee_answers" to "service_role";

grant insert on table "public"."order_attendee_answers" to "service_role";

grant references on table "public"."order_attendee_answers" to "service_role";

grant select on table "public"."order_attendee_answers" to "service_role";

grant trigger on table "public"."order_attendee_answers" to "service_role";

grant truncate on table "public"."order_attendee_answers" to "service_role";

grant update on table "public"."order_attendee_answers" to "service_role";

grant references on table "public"."order_attendees" to "anon";

grant select on table "public"."order_attendees" to "anon";

grant trigger on table "public"."order_attendees" to "anon";

grant truncate on table "public"."order_attendees" to "anon";

grant delete on table "public"."order_attendees" to "authenticated";

grant references on table "public"."order_attendees" to "authenticated";

grant select on table "public"."order_attendees" to "authenticated";

grant trigger on table "public"."order_attendees" to "authenticated";

grant truncate on table "public"."order_attendees" to "authenticated";

grant delete on table "public"."order_attendees" to "service_role";

grant insert on table "public"."order_attendees" to "service_role";

grant references on table "public"."order_attendees" to "service_role";

grant select on table "public"."order_attendees" to "service_role";

grant trigger on table "public"."order_attendees" to "service_role";

grant truncate on table "public"."order_attendees" to "service_role";

grant update on table "public"."order_attendees" to "service_role";

grant delete on table "public"."order_email_logs" to "anon";

grant insert on table "public"."order_email_logs" to "anon";

grant references on table "public"."order_email_logs" to "anon";

grant select on table "public"."order_email_logs" to "anon";

grant trigger on table "public"."order_email_logs" to "anon";

grant truncate on table "public"."order_email_logs" to "anon";

grant update on table "public"."order_email_logs" to "anon";

grant delete on table "public"."order_email_logs" to "authenticated";

grant insert on table "public"."order_email_logs" to "authenticated";

grant references on table "public"."order_email_logs" to "authenticated";

grant select on table "public"."order_email_logs" to "authenticated";

grant trigger on table "public"."order_email_logs" to "authenticated";

grant truncate on table "public"."order_email_logs" to "authenticated";

grant update on table "public"."order_email_logs" to "authenticated";

grant delete on table "public"."order_email_logs" to "service_role";

grant insert on table "public"."order_email_logs" to "service_role";

grant references on table "public"."order_email_logs" to "service_role";

grant select on table "public"."order_email_logs" to "service_role";

grant trigger on table "public"."order_email_logs" to "service_role";

grant truncate on table "public"."order_email_logs" to "service_role";

grant update on table "public"."order_email_logs" to "service_role";

grant references on table "public"."order_items" to "anon";

grant select on table "public"."order_items" to "anon";

grant trigger on table "public"."order_items" to "anon";

grant truncate on table "public"."order_items" to "anon";

grant references on table "public"."order_items" to "authenticated";

grant select on table "public"."order_items" to "authenticated";

grant trigger on table "public"."order_items" to "authenticated";

grant truncate on table "public"."order_items" to "authenticated";

grant delete on table "public"."order_items" to "service_role";

grant insert on table "public"."order_items" to "service_role";

grant references on table "public"."order_items" to "service_role";

grant select on table "public"."order_items" to "service_role";

grant trigger on table "public"."order_items" to "service_role";

grant truncate on table "public"."order_items" to "service_role";

grant update on table "public"."order_items" to "service_role";

grant references on table "public"."orders" to "anon";

grant select on table "public"."orders" to "anon";

grant trigger on table "public"."orders" to "anon";

grant truncate on table "public"."orders" to "anon";

grant delete on table "public"."orders" to "authenticated";

grant references on table "public"."orders" to "authenticated";

grant select on table "public"."orders" to "authenticated";

grant trigger on table "public"."orders" to "authenticated";

grant truncate on table "public"."orders" to "authenticated";

grant delete on table "public"."orders" to "service_role";

grant insert on table "public"."orders" to "service_role";

grant references on table "public"."orders" to "service_role";

grant select on table "public"."orders" to "service_role";

grant trigger on table "public"."orders" to "service_role";

grant truncate on table "public"."orders" to "service_role";

grant update on table "public"."orders" to "service_role";

grant delete on table "public"."organization_billing" to "anon";

grant insert on table "public"."organization_billing" to "anon";

grant references on table "public"."organization_billing" to "anon";

grant select on table "public"."organization_billing" to "anon";

grant trigger on table "public"."organization_billing" to "anon";

grant truncate on table "public"."organization_billing" to "anon";

grant update on table "public"."organization_billing" to "anon";

grant delete on table "public"."organization_billing" to "authenticated";

grant insert on table "public"."organization_billing" to "authenticated";

grant references on table "public"."organization_billing" to "authenticated";

grant select on table "public"."organization_billing" to "authenticated";

grant trigger on table "public"."organization_billing" to "authenticated";

grant truncate on table "public"."organization_billing" to "authenticated";

grant update on table "public"."organization_billing" to "authenticated";

grant delete on table "public"."organization_billing" to "service_role";

grant insert on table "public"."organization_billing" to "service_role";

grant references on table "public"."organization_billing" to "service_role";

grant select on table "public"."organization_billing" to "service_role";

grant trigger on table "public"."organization_billing" to "service_role";

grant truncate on table "public"."organization_billing" to "service_role";

grant update on table "public"."organization_billing" to "service_role";

grant delete on table "public"."organization_members" to "anon";

grant insert on table "public"."organization_members" to "anon";

grant references on table "public"."organization_members" to "anon";

grant select on table "public"."organization_members" to "anon";

grant trigger on table "public"."organization_members" to "anon";

grant truncate on table "public"."organization_members" to "anon";

grant update on table "public"."organization_members" to "anon";

grant delete on table "public"."organization_members" to "authenticated";

grant insert on table "public"."organization_members" to "authenticated";

grant references on table "public"."organization_members" to "authenticated";

grant select on table "public"."organization_members" to "authenticated";

grant trigger on table "public"."organization_members" to "authenticated";

grant truncate on table "public"."organization_members" to "authenticated";

grant update on table "public"."organization_members" to "authenticated";

grant delete on table "public"."organization_members" to "service_role";

grant insert on table "public"."organization_members" to "service_role";

grant references on table "public"."organization_members" to "service_role";

grant select on table "public"."organization_members" to "service_role";

grant trigger on table "public"."organization_members" to "service_role";

grant truncate on table "public"."organization_members" to "service_role";

grant update on table "public"."organization_members" to "service_role";

grant delete on table "public"."organization_profile" to "anon";

grant insert on table "public"."organization_profile" to "anon";

grant references on table "public"."organization_profile" to "anon";

grant select on table "public"."organization_profile" to "anon";

grant trigger on table "public"."organization_profile" to "anon";

grant truncate on table "public"."organization_profile" to "anon";

grant update on table "public"."organization_profile" to "anon";

grant delete on table "public"."organization_profile" to "authenticated";

grant insert on table "public"."organization_profile" to "authenticated";

grant references on table "public"."organization_profile" to "authenticated";

grant select on table "public"."organization_profile" to "authenticated";

grant trigger on table "public"."organization_profile" to "authenticated";

grant truncate on table "public"."organization_profile" to "authenticated";

grant update on table "public"."organization_profile" to "authenticated";

grant delete on table "public"."organization_profile" to "service_role";

grant insert on table "public"."organization_profile" to "service_role";

grant references on table "public"."organization_profile" to "service_role";

grant select on table "public"."organization_profile" to "service_role";

grant trigger on table "public"."organization_profile" to "service_role";

grant truncate on table "public"."organization_profile" to "service_role";

grant update on table "public"."organization_profile" to "service_role";

grant delete on table "public"."organizations" to "anon";

grant insert on table "public"."organizations" to "anon";

grant references on table "public"."organizations" to "anon";

grant select on table "public"."organizations" to "anon";

grant trigger on table "public"."organizations" to "anon";

grant truncate on table "public"."organizations" to "anon";

grant update on table "public"."organizations" to "anon";

grant delete on table "public"."organizations" to "authenticated";

grant insert on table "public"."organizations" to "authenticated";

grant references on table "public"."organizations" to "authenticated";

grant select on table "public"."organizations" to "authenticated";

grant trigger on table "public"."organizations" to "authenticated";

grant truncate on table "public"."organizations" to "authenticated";

grant update on table "public"."organizations" to "authenticated";

grant delete on table "public"."organizations" to "service_role";

grant insert on table "public"."organizations" to "service_role";

grant references on table "public"."organizations" to "service_role";

grant select on table "public"."organizations" to "service_role";

grant trigger on table "public"."organizations" to "service_role";

grant truncate on table "public"."organizations" to "service_role";

grant update on table "public"."organizations" to "service_role";

grant references on table "public"."payments" to "anon";

grant select on table "public"."payments" to "anon";

grant trigger on table "public"."payments" to "anon";

grant truncate on table "public"."payments" to "anon";

grant references on table "public"."payments" to "authenticated";

grant select on table "public"."payments" to "authenticated";

grant trigger on table "public"."payments" to "authenticated";

grant truncate on table "public"."payments" to "authenticated";

grant delete on table "public"."payments" to "service_role";

grant insert on table "public"."payments" to "service_role";

grant references on table "public"."payments" to "service_role";

grant select on table "public"."payments" to "service_role";

grant trigger on table "public"."payments" to "service_role";

grant truncate on table "public"."payments" to "service_role";

grant update on table "public"."payments" to "service_role";

grant delete on table "public"."plan_limits" to "anon";

grant insert on table "public"."plan_limits" to "anon";

grant references on table "public"."plan_limits" to "anon";

grant select on table "public"."plan_limits" to "anon";

grant trigger on table "public"."plan_limits" to "anon";

grant truncate on table "public"."plan_limits" to "anon";

grant update on table "public"."plan_limits" to "anon";

grant delete on table "public"."plan_limits" to "authenticated";

grant insert on table "public"."plan_limits" to "authenticated";

grant references on table "public"."plan_limits" to "authenticated";

grant select on table "public"."plan_limits" to "authenticated";

grant trigger on table "public"."plan_limits" to "authenticated";

grant truncate on table "public"."plan_limits" to "authenticated";

grant update on table "public"."plan_limits" to "authenticated";

grant delete on table "public"."plan_limits" to "service_role";

grant insert on table "public"."plan_limits" to "service_role";

grant references on table "public"."plan_limits" to "service_role";

grant select on table "public"."plan_limits" to "service_role";

grant trigger on table "public"."plan_limits" to "service_role";

grant truncate on table "public"."plan_limits" to "service_role";

grant update on table "public"."plan_limits" to "service_role";

grant delete on table "public"."subscriptions" to "anon";

grant insert on table "public"."subscriptions" to "anon";

grant references on table "public"."subscriptions" to "anon";

grant select on table "public"."subscriptions" to "anon";

grant trigger on table "public"."subscriptions" to "anon";

grant truncate on table "public"."subscriptions" to "anon";

grant update on table "public"."subscriptions" to "anon";

grant delete on table "public"."subscriptions" to "authenticated";

grant insert on table "public"."subscriptions" to "authenticated";

grant references on table "public"."subscriptions" to "authenticated";

grant select on table "public"."subscriptions" to "authenticated";

grant trigger on table "public"."subscriptions" to "authenticated";

grant truncate on table "public"."subscriptions" to "authenticated";

grant update on table "public"."subscriptions" to "authenticated";

grant delete on table "public"."subscriptions" to "service_role";

grant insert on table "public"."subscriptions" to "service_role";

grant references on table "public"."subscriptions" to "service_role";

grant select on table "public"."subscriptions" to "service_role";

grant trigger on table "public"."subscriptions" to "service_role";

grant truncate on table "public"."subscriptions" to "service_role";

grant update on table "public"."subscriptions" to "service_role";

grant delete on table "public"."tickets" to "anon";

grant insert on table "public"."tickets" to "anon";

grant references on table "public"."tickets" to "anon";

grant select on table "public"."tickets" to "anon";

grant trigger on table "public"."tickets" to "anon";

grant truncate on table "public"."tickets" to "anon";

grant update on table "public"."tickets" to "anon";

grant delete on table "public"."tickets" to "authenticated";

grant insert on table "public"."tickets" to "authenticated";

grant references on table "public"."tickets" to "authenticated";

grant select on table "public"."tickets" to "authenticated";

grant trigger on table "public"."tickets" to "authenticated";

grant truncate on table "public"."tickets" to "authenticated";

grant update on table "public"."tickets" to "authenticated";

grant delete on table "public"."tickets" to "service_role";

grant insert on table "public"."tickets" to "service_role";

grant references on table "public"."tickets" to "service_role";

grant select on table "public"."tickets" to "service_role";

grant trigger on table "public"."tickets" to "service_role";

grant truncate on table "public"."tickets" to "service_role";

grant update on table "public"."tickets" to "service_role";

grant delete on table "public"."user_profile" to "anon";

grant insert on table "public"."user_profile" to "anon";

grant references on table "public"."user_profile" to "anon";

grant select on table "public"."user_profile" to "anon";

grant trigger on table "public"."user_profile" to "anon";

grant truncate on table "public"."user_profile" to "anon";

grant update on table "public"."user_profile" to "anon";

grant delete on table "public"."user_profile" to "authenticated";

grant insert on table "public"."user_profile" to "authenticated";

grant references on table "public"."user_profile" to "authenticated";

grant select on table "public"."user_profile" to "authenticated";

grant trigger on table "public"."user_profile" to "authenticated";

grant truncate on table "public"."user_profile" to "authenticated";

grant update on table "public"."user_profile" to "authenticated";

grant delete on table "public"."user_profile" to "service_role";

grant insert on table "public"."user_profile" to "service_role";

grant references on table "public"."user_profile" to "service_role";

grant select on table "public"."user_profile" to "service_role";

grant trigger on table "public"."user_profile" to "service_role";

grant truncate on table "public"."user_profile" to "service_role";

grant update on table "public"."user_profile" to "service_role";


  create policy "mollie_connect_states_deny_all"
  on "private"."mollie_connect_states"
  as permissive
  for all
  to anon, authenticated
using (false)
with check (false);



  create policy "org_mollie_connect_deny_all"
  on "private"."organization_mollie_connect"
  as permissive
  for all
  to anon, authenticated
using (false)
with check (false);



  create policy "event_form_field_groups_delete_member"
  on "public"."event_form_field_groups"
  as permissive
  for delete
  to authenticated
using (public.is_event_org_member(event_id));



  create policy "event_form_field_groups_insert_member"
  on "public"."event_form_field_groups"
  as permissive
  for insert
  to authenticated
with check (public.is_event_org_member(event_id));



  create policy "event_form_field_groups_select_member_all"
  on "public"."event_form_field_groups"
  as permissive
  for select
  to authenticated
using (public.is_event_org_member(event_id));



  create policy "event_form_field_groups_select_public_active_published"
  on "public"."event_form_field_groups"
  as permissive
  for select
  to anon, authenticated
using (((is_active = true) AND (EXISTS ( SELECT 1
   FROM public.events e
  WHERE ((e.id = event_form_field_groups.event_id) AND (e.is_published = true))))));



  create policy "event_form_field_groups_update_member"
  on "public"."event_form_field_groups"
  as permissive
  for update
  to authenticated
using (public.is_event_org_member(event_id))
with check (public.is_event_org_member(event_id));



  create policy "event_form_fields_delete_member"
  on "public"."event_form_fields"
  as permissive
  for delete
  to authenticated
using (public.is_event_org_member(event_id));



  create policy "event_form_fields_insert_member"
  on "public"."event_form_fields"
  as permissive
  for insert
  to authenticated
with check (public.is_event_org_member(event_id));



  create policy "event_form_fields_select_member_all"
  on "public"."event_form_fields"
  as permissive
  for select
  to authenticated
using (public.is_event_org_member(event_id));



  create policy "event_form_fields_select_public_active_published"
  on "public"."event_form_fields"
  as permissive
  for select
  to anon, authenticated
using (((is_active = true) AND (EXISTS ( SELECT 1
   FROM public.events e
  WHERE ((e.id = event_form_fields.event_id) AND (e.is_published = true))))));



  create policy "event_form_fields_update_member"
  on "public"."event_form_fields"
  as permissive
  for update
  to authenticated
using (public.is_event_org_member(event_id))
with check (public.is_event_org_member(event_id));



  create policy "event_products_delete_member"
  on "public"."event_products"
  as permissive
  for delete
  to authenticated
using (public.is_event_org_member(event_id));



  create policy "event_products_select_member_all"
  on "public"."event_products"
  as permissive
  for select
  to authenticated
using (public.is_event_org_member(event_id));



  create policy "event_products_select_public_active_published"
  on "public"."event_products"
  as permissive
  for select
  to anon, authenticated
using (((is_active = true) AND (EXISTS ( SELECT 1
   FROM public.events e
  WHERE ((e.id = event_products.event_id) AND (e.is_published = true))))));



  create policy "event_products_update_member"
  on "public"."event_products"
  as permissive
  for update
  to authenticated
using (public.is_event_org_member(event_id))
with check (public.is_event_org_member(event_id));



  create policy "event_delete_member"
  on "public"."events"
  as permissive
  for delete
  to authenticated
using (public.is_org_member(org_id));



  create policy "events_select_member_all"
  on "public"."events"
  as permissive
  for select
  to authenticated
using (public.is_org_member(org_id));



  create policy "events_select_public_published"
  on "public"."events"
  as permissive
  for select
  to anon, authenticated
using ((is_published = true));



  create policy "events_update_member"
  on "public"."events"
  as permissive
  for update
  to authenticated
using (public.is_org_member(org_id))
with check (public.is_org_member(org_id));



  create policy "order_attendee_answers_delete_deny_client"
  on "public"."order_attendee_answers"
  as permissive
  for delete
  to anon, authenticated
using (false);



  create policy "order_attendee_answers_insert_deny_client"
  on "public"."order_attendee_answers"
  as permissive
  for insert
  to anon, authenticated
with check (false);



  create policy "order_attendee_answers_select_member"
  on "public"."order_attendee_answers"
  as permissive
  for select
  to authenticated
using (public.is_attendee_org_member(attendee_id));



  create policy "order_attendee_answers_update_deny_client"
  on "public"."order_attendee_answers"
  as permissive
  for update
  to anon, authenticated
using (false)
with check (false);



  create policy "order_attendees_insert_deny_client"
  on "public"."order_attendees"
  as permissive
  for insert
  to anon, authenticated
with check (false);



  create policy "order_attendees_select_member"
  on "public"."order_attendees"
  as permissive
  for select
  to authenticated
using (public.is_order_org_member(order_id));



  create policy "order_attendees_update_deny_client"
  on "public"."order_attendees"
  as permissive
  for update
  to anon, authenticated
using (false)
with check (false);



  create policy "order_items_delete_deny_client"
  on "public"."order_items"
  as permissive
  for delete
  to anon, authenticated
using (false);



  create policy "order_items_insert_deny_client"
  on "public"."order_items"
  as permissive
  for insert
  to anon, authenticated
with check (false);



  create policy "order_items_select_member"
  on "public"."order_items"
  as permissive
  for select
  to authenticated
using (public.is_order_org_member(order_id));



  create policy "order_items_update_deny_client"
  on "public"."order_items"
  as permissive
  for update
  to anon, authenticated
using (false)
with check (false);



  create policy "orders_deny_deletes_client"
  on "public"."orders"
  as permissive
  for delete
  to anon, authenticated
using (false);



  create policy "orders_deny_updates_client"
  on "public"."orders"
  as permissive
  for update
  to anon, authenticated
using (false)
with check (false);



  create policy "orders_deny_writes_client"
  on "public"."orders"
  as permissive
  for insert
  to anon, authenticated
with check (false);



  create policy "orders_insert_deny_client"
  on "public"."orders"
  as permissive
  for insert
  to anon, authenticated
with check (false);



  create policy "orders_select_by_booking_token"
  on "public"."orders"
  as permissive
  for select
  to anon, authenticated
using (((booking_token IS NOT NULL) AND (booking_token = current_setting('request.headers.x-booking-token'::text, true))));



  create policy "orders_select_member"
  on "public"."orders"
  as permissive
  for select
  to authenticated
using (public.is_org_member(org_id));



  create policy "orders_update_deny_client"
  on "public"."orders"
  as permissive
  for update
  to anon, authenticated
using (false)
with check (false);



  create policy "org_members_delete_if_org_owner"
  on "public"."organization_members"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = organization_members.org_id) AND (o.created_by = public.current_user_id())))));



  create policy "org_members_insert_if_org_owner"
  on "public"."organization_members"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = organization_members.org_id) AND (o.created_by = public.current_user_id())))));



  create policy "org_members_select_own"
  on "public"."organization_members"
  as permissive
  for select
  to authenticated
using ((user_id = auth.uid()));



  create policy "org_members_update_if_org_owner"
  on "public"."organization_members"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = organization_members.org_id) AND (o.created_by = public.current_user_id())))))
with check ((EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = organization_members.org_id) AND (o.created_by = public.current_user_id())))));



  create policy "org_profile_delete_owner"
  on "public"."organization_profile"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = organization_profile.org_id) AND (o.created_by = public.current_user_id())))));



  create policy "org_profile_select_public"
  on "public"."organization_profile"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "org_profile_update_member"
  on "public"."organization_profile"
  as permissive
  for update
  to authenticated
using (public.is_org_member(org_id))
with check (public.is_org_member(org_id));



  create policy "organizations_delete_own"
  on "public"."organizations"
  as permissive
  for delete
  to authenticated
using ((created_by = public.current_user_id()));



  create policy "organizations_select_member"
  on "public"."organizations"
  as permissive
  for select
  to authenticated
using (public.is_org_member(id));



  create policy "organizations_update_own"
  on "public"."organizations"
  as permissive
  for update
  to authenticated
using ((created_by = public.current_user_id()))
with check ((created_by = public.current_user_id()));



  create policy "payments_delete_deny_client"
  on "public"."payments"
  as permissive
  for delete
  to anon, authenticated
using (false);



  create policy "payments_deny_deletes_client"
  on "public"."payments"
  as permissive
  for delete
  to anon, authenticated
using (false);



  create policy "payments_deny_updates_client"
  on "public"."payments"
  as permissive
  for update
  to anon, authenticated
using (false)
with check (false);



  create policy "payments_deny_writes_client"
  on "public"."payments"
  as permissive
  for insert
  to anon, authenticated
with check (false);



  create policy "payments_insert_deny_client"
  on "public"."payments"
  as permissive
  for insert
  to anon, authenticated
with check (false);



  create policy "payments_select_member"
  on "public"."payments"
  as permissive
  for select
  to authenticated
using (public.is_order_org_member(order_id));



  create policy "payments_update_deny_client"
  on "public"."payments"
  as permissive
  for update
  to anon, authenticated
using (false)
with check (false);



  create policy "Enable read access for all users"
  on "public"."plan_limits"
  as permissive
  for select
  to authenticated
using (true);



  create policy "subscriptions_delete_deny_client"
  on "public"."subscriptions"
  as permissive
  for delete
  to anon, authenticated
using (false);



  create policy "subscriptions_insert_deny_client"
  on "public"."subscriptions"
  as permissive
  for insert
  to anon, authenticated
with check (false);



  create policy "subscriptions_select_owner"
  on "public"."subscriptions"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = subscriptions.org_id) AND (o.created_by = public.current_user_id())))));



  create policy "subscriptions_update_deny_client"
  on "public"."subscriptions"
  as permissive
  for update
  to anon, authenticated
using (false)
with check (false);



  create policy "tickets_select_member"
  on "public"."tickets"
  as permissive
  for select
  to authenticated
using (public.is_order_org_member(order_id));



  create policy "user_profile_delete_self"
  on "public"."user_profile"
  as permissive
  for delete
  to authenticated
using ((user_id = public.current_user_id()));



  create policy "user_profile_select_self"
  on "public"."user_profile"
  as permissive
  for select
  to authenticated
using ((user_id = public.current_user_id()));



  create policy "user_profile_update_self"
  on "public"."user_profile"
  as permissive
  for update
  to authenticated
using ((user_id = public.current_user_id()))
with check ((user_id = public.current_user_id()));


CREATE TRIGGER trg_org_mollie_connect_updated_at BEFORE UPDATE ON private.organization_mollie_connect FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_event_form_fields_updated_at BEFORE UPDATE ON public.event_form_fields FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_max_30_form_fields_per_event BEFORE INSERT ON public.event_form_fields FOR EACH ROW EXECUTE FUNCTION public.enforce_max_30_form_fields_per_event();

CREATE TRIGGER trg_event_products_updated_at BEFORE UPDATE ON public.event_products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_max_10_products_per_event BEFORE INSERT ON public.event_products FOR EACH ROW EXECUTE FUNCTION public.enforce_max_10_products_per_event();

CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.invoice_peppol FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_invoices BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_organization_billing BEFORE UPDATE ON public.organization_billing FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER block_branding_update_on_free BEFORE UPDATE OF primary_color, logo_url, default_event_banner_url ON public.organization_profile FOR EACH ROW EXECUTE FUNCTION public.trg_block_branding_update_on_free();

CREATE TRIGGER trg_org_profile_updated_at BEFORE UPDATE ON public.organization_profile FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_prevent_org_profile_slug_change BEFORE UPDATE ON public.organization_profile FOR EACH ROW EXECUTE FUNCTION public.prevent_org_profile_slug_change();

CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_update_order_paid_cents AFTER INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_order_paid_cents();

CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_user_profile_updated_at BEFORE UPDATE ON public.user_profile FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


  create policy "invoices_read_auth_org_member"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'invoices'::text) AND (name ~ '^[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}/'::text) AND public.is_org_member((SUBSTRING(name FROM 1 FOR 36))::uuid)));



  create policy "org members can delete their assets"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'public-assets'::text) AND (name ~~ 'orgs/%'::text) AND public.is_org_member((split_part(name, '/'::text, 2))::uuid)));



  create policy "org members can update their assets"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'public-assets'::text) AND (name ~~ 'orgs/%'::text) AND public.is_org_member((split_part(name, '/'::text, 2))::uuid)))
with check (((bucket_id = 'public-assets'::text) AND (name ~~ 'orgs/%'::text) AND public.is_org_member((split_part(name, '/'::text, 2))::uuid)));



  create policy "org members can upload their assets"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'public-assets'::text) AND (name ~~ 'orgs/%'::text) AND public.is_org_member((split_part(name, '/'::text, 2))::uuid)));



  create policy "public read public-assets"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'public-assets'::text));



