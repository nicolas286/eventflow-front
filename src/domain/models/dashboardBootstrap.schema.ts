import { z } from "zod";
import { profileSchema } from "./profile.schema";
import { membershipSchema } from "./membership.schema";
import { organizationSchema } from "./organization.schema";
import { organizationProfileSchema } from "./organizationProfile.schema";
import { subscriptionSchema } from "./subscription.schema";
import { planLimitsSchema } from "./planLimits.schema";

export const dashboardBootstrapSchema = z.object({
  profile: profileSchema,
  membership: membershipSchema.nullable(),
  organization: organizationSchema.nullable(),
  organizationProfile: organizationProfileSchema.nullable(),
  subscription: subscriptionSchema.nullable(),
  planLimits: planLimitsSchema,

});

export type DashboardBootstrap = z.infer<typeof dashboardBootstrapSchema>;