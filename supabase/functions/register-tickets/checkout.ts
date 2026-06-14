import { badRequest } from "./errors.ts";
import { appendQueryParams, getSafeWidgetReturnUrl } from "./origins.ts";
export function resolveCheckoutContextOrThrow(body, config) {
  const checkoutSource = body.checkoutSource === "widget" ? "widget" : "public";
  const widgetReturnUrl = checkoutSource === "widget" ? getSafeWidgetReturnUrl(body.widgetReturnUrl, config.allowedOrigins) : null;
  if (checkoutSource === "widget" && !widgetReturnUrl) {
    throw badRequest("INVALID_WIDGET_RETURN_URL");
  }
  return {
    checkoutSource,
    widgetReturnUrl,
    buildRedirectUrl (orderId, bookingToken) {
      if (checkoutSource === "widget" && widgetReturnUrl) {
        return appendQueryParams(widgetReturnUrl, {
          orderId,
          token: bookingToken,
          return: "1"
        });
      }
      return appendQueryParams(`${config.appBaseUrl}/order/${orderId}`, {
        return: "1",
        token: bookingToken
      });
    }
  };
}
