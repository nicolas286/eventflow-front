export const subscriptionSelect = `
  status,
  plan,
  mollie_customer_id,
  mollie_subscription_id,
  current_period_end,
  promo_code,
  discount_percent,
  billing_price_value,
  billing_currency
`;

export async function loadSubscription(service: any, orgId: string) {
  return await service
    .from("subscriptions")
    .select(subscriptionSelect)
    .eq("org_id", orgId)
    .maybeSingle();
}