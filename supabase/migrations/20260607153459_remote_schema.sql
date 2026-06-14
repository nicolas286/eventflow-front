revoke delete on table "public"."event_products" from "anon";

revoke insert on table "public"."event_products" from "anon";

revoke update on table "public"."event_products" from "anon";

revoke delete on table "public"."invoice_peppol" from "anon";

revoke insert on table "public"."invoice_peppol" from "anon";

revoke references on table "public"."invoice_peppol" from "anon";

revoke select on table "public"."invoice_peppol" from "anon";

revoke trigger on table "public"."invoice_peppol" from "anon";

revoke truncate on table "public"."invoice_peppol" from "anon";

revoke update on table "public"."invoice_peppol" from "anon";

revoke delete on table "public"."invoice_peppol" from "authenticated";

revoke insert on table "public"."invoice_peppol" from "authenticated";

revoke references on table "public"."invoice_peppol" from "authenticated";

revoke select on table "public"."invoice_peppol" from "authenticated";

revoke trigger on table "public"."invoice_peppol" from "authenticated";

revoke truncate on table "public"."invoice_peppol" from "authenticated";

revoke update on table "public"."invoice_peppol" from "authenticated";

revoke delete on table "public"."order_attendee_answers" from "anon";

revoke insert on table "public"."order_attendee_answers" from "anon";

revoke update on table "public"."order_attendee_answers" from "anon";

revoke delete on table "public"."order_attendee_answers" from "authenticated";

revoke insert on table "public"."order_attendee_answers" from "authenticated";

revoke update on table "public"."order_attendee_answers" from "authenticated";

revoke delete on table "public"."order_attendees" from "anon";

revoke insert on table "public"."order_attendees" from "anon";

revoke update on table "public"."order_attendees" from "anon";

revoke insert on table "public"."order_attendees" from "authenticated";

revoke update on table "public"."order_attendees" from "authenticated";

revoke delete on table "public"."order_items" from "anon";

revoke insert on table "public"."order_items" from "anon";

revoke update on table "public"."order_items" from "anon";

revoke delete on table "public"."order_items" from "authenticated";

revoke insert on table "public"."order_items" from "authenticated";

revoke update on table "public"."order_items" from "authenticated";

revoke delete on table "public"."orders" from "anon";

revoke insert on table "public"."orders" from "anon";

revoke update on table "public"."orders" from "anon";

revoke insert on table "public"."orders" from "authenticated";

revoke update on table "public"."orders" from "authenticated";

revoke delete on table "public"."payments" from "anon";

revoke insert on table "public"."payments" from "anon";

revoke update on table "public"."payments" from "anon";

revoke delete on table "public"."payments" from "authenticated";

revoke insert on table "public"."payments" from "authenticated";

revoke update on table "public"."payments" from "authenticated";

alter table "public"."event_form_fields" drop constraint "event_form_fields_field_key_check";

alter table "public"."order_attendee_answers" drop constraint "order_attendee_answers_field_key_snapshot_check";

alter table "public"."orders" drop constraint "orders_buyer_phone_check";

alter table "public"."event_form_fields" add constraint "event_form_fields_field_key_check" CHECK (((char_length(field_key) >= 2) AND (char_length(field_key) <= 100))) not valid;

alter table "public"."event_form_fields" validate constraint "event_form_fields_field_key_check";

alter table "public"."order_attendee_answers" add constraint "order_attendee_answers_field_key_snapshot_check" CHECK (((char_length(field_key_snapshot) >= 2) AND (char_length(field_key_snapshot) <= 100))) not valid;

alter table "public"."order_attendee_answers" validate constraint "order_attendee_answers_field_key_snapshot_check";

alter table "public"."orders" add constraint "orders_buyer_phone_check" CHECK (((buyer_phone IS NULL) OR (((length(buyer_phone) >= 7) AND (length(buyer_phone) <= 20)) AND (buyer_phone ~ '^[0-9+()\- ]+$'::text)))) not valid;

alter table "public"."orders" validate constraint "orders_buyer_phone_check";

set check_function_bodies = off;

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


