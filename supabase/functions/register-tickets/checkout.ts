import { badRequest } from "../_shared/errors.ts";
import { appendQueryParams, getSafeReturnUrl } from "../_shared/url.ts";

export function resolveCheckoutContextOrThrow(body, config) {
  const checkoutSource = body.checkoutSource === "widget" ? "widget" : "public";

  const widgetReturnUrl =
    checkoutSource === "widget"
      ? getSafeReturnUrl({
          raw: body.widgetReturnUrl,
          allowedOrigins: config.allowedOrigins,
          allowedPathPrefix: "/widget/",
        })
      : null;

  if (checkoutSource === "widget" && !widgetReturnUrl) {
    throw badRequest("INVALID_WIDGET_RETURN_URL");
  }

  return {
    checkoutSource,
    widgetReturnUrl,

    buildRedirectUrl(orderId, bookingToken) {
      if (checkoutSource === "widget" && widgetReturnUrl) {
        return appendQueryParams(widgetReturnUrl, {
          orderId,
          token: bookingToken,
          return: "1",
        });
      }

      return appendQueryParams(`${config.appBaseUrl}/order/${orderId}`, {
        return: "1",
        token: bookingToken,
      });
    },
  };
}