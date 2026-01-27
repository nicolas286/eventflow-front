import { z } from "zod";
import { profileSchema } from "../db/db.profile.schema";
import { membershipSchema } from "../db/db.membership.schema";
import { organizationSchema } from "../db/db.organization.schema";
import { organizationProfileSchema } from "../db/db.organizationProfile.schema";
import { subscriptionSchema } from "../db/db.subscription.schema";
import { planLimitsSchema } from "../db/db.planLimits.schema";

export const dashboardBootstrapSchema = z.object({
  profile: profileSchema,
  membership: membershipSchema.nullable(),
  organization: organizationSchema.nullable(),
  organizationProfile: organizationProfileSchema.nullable(),
  subscription: subscriptionSchema.nullable(),
  planLimits: planLimitsSchema,

});

export type DashboardBootstrap = z.infer<typeof dashboardBootstrapSchema>;