create or replace function public.rpc_create_invoice_from_mollie_payment(
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $function$
declare
  v_role text := coalesce(
    nullif(
      current_setting(
        'request.jwt.claim.role',
        true
      ),
      ''
    ),
    nullif(
      auth.role(),
      ''
    ),
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

  /*
   * Le montant reçu depuis Mollie est TVAC.
   */
  v_total_cents integer;
  v_subtotal_cents integer;
  v_vat_cents integer;
  v_vat_rate numeric(6, 4) := 21.0000;

  v_number text;
  v_snapshot jsonb;
  v_raw jsonb;

  v_existing_id uuid;
  v_result jsonb;

  v_year text :=
    to_char(
      now(),
      'YYYY'
    );
begin
  /* ============================================================
   * 1) Edge-only guard
   * ============================================================ */

  if v_role is distinct from 'service_role' then
    raise exception 'FORBIDDEN';
  end if;


  /* ============================================================
   * 2) Parse input
   * ============================================================ */

  if p_input is null
     or jsonb_typeof(p_input) <> 'object'
  then
    raise exception
      'VALIDATION_ERROR: p_input must be an object';
  end if;

  v_org_id :=
    nullif(
      trim(
        p_input->>'org_id'
      ),
      ''
    )::uuid;

  if v_org_id is null then
    raise exception
      'VALIDATION_ERROR: org_id is required';
  end if;


  v_payment_id :=
    nullif(
      trim(
        p_input->>'mollie_payment_id'
      ),
      ''
    );

  if v_payment_id is null then
    raise exception
      'VALIDATION_ERROR: mollie_payment_id is required';
  end if;


  v_subscription_id :=
    nullif(
      trim(
        p_input->>'mollie_subscription_id'
      ),
      ''
    );


  v_currency :=
    upper(
      nullif(
        trim(
          p_input->>'currency'
        ),
        ''
      )
    );

  if v_currency is null then
    v_currency := 'EUR';
  end if;

  if v_currency !~ '^[A-Z]{3}$' then
    raise exception
      'VALIDATION_ERROR: currency invalid';
  end if;


  v_total_value :=
    nullif(
      trim(
        p_input->>'total_value'
      ),
      ''
    );

  if v_total_value is null then
    raise exception
      'VALIDATION_ERROR: total_value is required';
  end if;


  v_paid_at :=
    nullif(
      trim(
        p_input->>'paid_at'
      ),
      ''
    )::timestamptz;

  if v_paid_at is null then
    raise exception
      'VALIDATION_ERROR: paid_at is required';
  end if;


  v_period_start :=
    nullif(
      trim(
        p_input->>'period_start'
      ),
      ''
    )::timestamptz;

  v_period_end :=
    nullif(
      trim(
        p_input->>'period_end'
      ),
      ''
    )::timestamptz;


  v_raw :=
    coalesce(
      p_input->'raw',
      '{}'::jsonb
    );


  /* ============================================================
   * 3) Basic validations
   * ============================================================ */

  if length(v_payment_id) > 80 then
    raise exception
      'VALIDATION_ERROR: mollie_payment_id too long';
  end if;

  if v_subscription_id is not null
     and length(v_subscription_id) > 80
  then
    raise exception
      'VALIDATION_ERROR: mollie_subscription_id too long';
  end if;

  if v_period_start is not null
     and v_period_end is not null
     and v_period_end < v_period_start
  then
    raise exception
      'VALIDATION_ERROR: period_end must be after period_start';
  end if;


  /*
   * Parse "15.99" safely into cents.
   * Ce montant est le TVAC réellement payé chez Mollie,
   * réduction éventuelle déjà comprise.
   */
  begin
    v_total_cents :=
      round(
        v_total_value::numeric
        * 100
      )::integer;
  exception
    when others then
      raise exception
        'VALIDATION_ERROR: total_value must be numeric string like "15.99"';
  end;

  if v_total_cents < 0 then
    raise exception
      'VALIDATION_ERROR: total_cents cannot be negative';
  end if;


  /*
   * Extraction de la TVA belge de 21 % depuis le TVAC.
   *
   * Exemple :
   *   15,99 € TVAC
   *   -> 13,21 € HTVA
   *   ->  2,78 € TVA
   *
   * vat_cents est calculé par différence afin de garantir :
   *
   * subtotal_cents + vat_cents = total_cents
   */
  v_subtotal_cents :=
    round(
      v_total_cents::numeric
      * 100
      / (
        100
        + v_vat_rate
      )
    )::integer;

  v_vat_cents :=
    v_total_cents
    - v_subtotal_cents;


  /* ============================================================
   * 4) Ensure org exists
   * ============================================================ */

  perform 1
  from public.organizations o
  where o.id = v_org_id;

  if not found then
    raise exception 'NOT_FOUND';
  end if;


  /* ============================================================
   * 5) Build billing snapshot
   * ============================================================ */

  select jsonb_build_object(
    'legalName',
      ob.legal_name,

    'vatCountryCode',
      ob.vat_country_code,

    'vatNumber',
      ob.vat_number,

    'addressLine1',
      ob.address_line1,

    'addressLine2',
      ob.address_line2,

    'postalCode',
      ob.postal_code,

    'city',
      ob.city,

    'countryCode',
      ob.country_code,

    'billingEmail',
      ob.billing_email,

    'invoiceReference',
      ob.invoice_reference
  )
  into v_snapshot
  from public.organization_billing ob
  where ob.org_id = v_org_id;

  if v_snapshot is null then
    raise exception
      'VALIDATION_ERROR: billing profile missing for org';
  end if;


  /* ============================================================
   * 6) Idempotence
   *
   * Une facture déjà existante n'est pas recalculée.
   * Les anciennes factures à TVA 0 restent donc inchangées.
   * ============================================================ */

  select i.id
  into v_existing_id
  from public.invoices i
  where i.mollie_payment_id = v_payment_id
  limit 1;

  if v_existing_id is not null then
    select jsonb_build_object(
      'id',
        i.id,

      'orgId',
        i.org_id,

      'number',
        i.number,

      'status',
        i.status,

      'issuedAt',
        i.issued_at,

      'paidAt',
        i.paid_at,

      'periodStart',
        i.period_start,

      'periodEnd',
        i.period_end,

      'currency',
        i.currency,

      'subtotalCents',
        i.subtotal_cents,

      'vatCents',
        i.vat_cents,

      'totalCents',
        i.total_cents,

      'vatRate',
        i.vat_rate,

      'provider',
        i.provider,

      'molliePaymentId',
        i.mollie_payment_id,

      'mollieSubscriptionId',
        i.mollie_subscription_id,

      'billingSnapshot',
        i.billing_snapshot,

      'createdAt',
        i.created_at,

      'updatedAt',
        i.updated_at
    )
    into v_result
    from public.invoices i
    where i.id = v_existing_id;


    perform public.rpc_create_invoice_peppol(
      jsonb_build_object(
        'invoice_id',
        v_result->>'id'
      )
    );

    return v_result;
  end if;


  /* ============================================================
   * 7) Generate invoice number
   * ============================================================ */

  v_number :=
    v_year
    || '-'
    || lpad(
      nextval(
        'public.invoice_number_seq'
      )::text,
      6,
      '0'
    );


  /* ============================================================
   * 8) Insert invoice
   * ============================================================ */

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
    v_paid_at,
    v_paid_at,
    v_period_start,
    v_period_end,
    v_currency,
    v_subtotal_cents,
    v_vat_cents,
    v_total_cents,
    v_vat_rate,
    jsonb_build_object(
      'billing',
        v_snapshot,

      'rawPayment',
        v_raw
    ),
    'mollie',
    v_payment_id,
    v_subscription_id,
    null
  )
  on conflict (
    mollie_payment_id
  )
  do update set
    /*
     * On conserve le numéro déjà attribué.
     */
    org_id =
      excluded.org_id,

    status =
      excluded.status,

    issued_at =
      excluded.issued_at,

    paid_at =
      excluded.paid_at,

    period_start =
      excluded.period_start,

    period_end =
      excluded.period_end,

    currency =
      excluded.currency,

    subtotal_cents =
      excluded.subtotal_cents,

    vat_cents =
      excluded.vat_cents,

    total_cents =
      excluded.total_cents,

    vat_rate =
      excluded.vat_rate,

    billing_snapshot =
      excluded.billing_snapshot,

    provider =
      excluded.provider,

    mollie_subscription_id =
      excluded.mollie_subscription_id,

    pdf_path =
      excluded.pdf_path,

    updated_at =
      now()

  returning jsonb_build_object(
    'id',
      id,

    'orgId',
      org_id,

    'number',
      number,

    'status',
      status,

    'issuedAt',
      issued_at,

    'paidAt',
      paid_at,

    'periodStart',
      period_start,

    'periodEnd',
      period_end,

    'currency',
      currency,

    'subtotalCents',
      subtotal_cents,

    'vatCents',
      vat_cents,

    'totalCents',
      total_cents,

    'vatRate',
      vat_rate,

    'provider',
      provider,

    'molliePaymentId',
      mollie_payment_id,

    'mollieSubscriptionId',
      mollie_subscription_id,

    'billingSnapshot',
      billing_snapshot,

    'createdAt',
      created_at,

    'updatedAt',
      updated_at
  )
  into v_result;


  /*
   * Protection supplémentaire contre une éventuelle course
   * entre le contrôle d'idempotence et l'insert.
   */
  if v_result is null then
    select jsonb_build_object(
      'id',
        i.id,

      'orgId',
        i.org_id,

      'number',
        i.number,

      'status',
        i.status,

      'issuedAt',
        i.issued_at,

      'paidAt',
        i.paid_at,

      'periodStart',
        i.period_start,

      'periodEnd',
        i.period_end,

      'currency',
        i.currency,

      'subtotalCents',
        i.subtotal_cents,

      'vatCents',
        i.vat_cents,

      'totalCents',
        i.total_cents,

      'vatRate',
        i.vat_rate,

      'provider',
        i.provider,

      'molliePaymentId',
        i.mollie_payment_id,

      'mollieSubscriptionId',
        i.mollie_subscription_id,

      'billingSnapshot',
        i.billing_snapshot,

      'createdAt',
        i.created_at,

      'updatedAt',
        i.updated_at
    )
    into v_result
    from public.invoices i
    where i.mollie_payment_id = v_payment_id
    limit 1;
  end if;


  if v_result is null then
    raise exception
      'INTERNAL_ERROR: invoice was not created';
  end if;


  /* ============================================================
   * 9) Ensure Peppol tracking row
   * ============================================================ */

  perform public.rpc_create_invoice_peppol(
    jsonb_build_object(
      'invoice_id',
      v_result->>'id'
    )
  );


  return v_result;
end;
$function$;