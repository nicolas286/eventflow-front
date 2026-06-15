export async function mollieFetch(
  url: string,
  mollieKey: string,
  init: RequestInit,
) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${mollieKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const txt = await res.text().catch(() => "");

  let data: any = null;

  try {
    data = txt ? JSON.parse(txt) : null;
  } catch {
    data = txt;
  }

  return { res, data, rawText: txt };
}

export async function hasActiveMandate(mollieKey: string, customerId: string) {
  const { res, data, rawText } = await mollieFetch(
    `https://api.mollie.com/v2/customers/${customerId}/mandates`,
    mollieKey,
    { method: "GET" },
  );

  if (!res.ok) {
    return {
      ok: false as const,
      error: "MOLLIE_LIST_MANDATES_FAILED",
      details: rawText,
    };
  }

  const items = data?._embedded?.mandates ?? [];

  const active = items.some(
    (m: any) => String(m?.status ?? "").toLowerCase() === "valid",
  );

  return {
    ok: true as const,
    active,
  };
}

export function getCheckoutHref(raw: any) {
  const href = raw?._links?.checkout?.href;
  return typeof href === "string" && href.trim() ? href.trim() : null;
}

export async function tryCancelExistingSubscription(params: {
  mollieKey: string;
  customerId: string;
  subscriptionId: string;
}) {
  const { mollieKey, customerId, subscriptionId } = params;

  const { res, rawText } = await mollieFetch(
    `https://api.mollie.com/v2/customers/${customerId}/subscriptions/${subscriptionId}`,
    mollieKey,
    { method: "DELETE" },
  );

  if (res.status === 404) {
    return {
      ok: false as const,
      error: "MOLLIE_CANCEL_404_WRONG_CUSTOMER",
      details: rawText,
    };
  }

  if (!res.ok) {
    return {
      ok: false as const,
      error: "MOLLIE_CANCEL_SUB_FAILED",
      details: rawText,
    };
  }

  return { ok: true as const };
}