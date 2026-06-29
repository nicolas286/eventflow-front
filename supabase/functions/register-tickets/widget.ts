import { ResponseError } from "../_shared/errors.ts";
import { getOrgPlanOrThrow } from "./db.ts";

export async function assertWidgetAllowedForOrgOrThrow(opts) {
  const { admin, orgId, orderId, logger } = opts;

  const orgPlan = await getOrgPlanOrThrow(admin, orgId);

  logger.info("widget_plan_checked", {
    orgId,
    orgPlan,
  });

  if (orgPlan === "free") {
    logger.warn("widget_blocked_free_plan", {
      orgId,
      orderId,
    });

    throw new ResponseError(403, "WIDGET_NOT_AVAILABLE_FOR_FREE_PLAN");
  }
}