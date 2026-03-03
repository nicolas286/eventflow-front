import { z } from "zod";
import { profileSchema } from "@shared/models/db/db.profile.schema";
import { membershipSchema } from "@shared/models/db/db.membership.schema";
import { organizationSchema } from "@shared/models/db/db.organization.schema";
import { organizationProfileSchema } from "@shared/models/db/db.organizationProfile.schema";
import { subscriptionUISchema } from "@shared/models/db/db.subscription.schema";
import { planLimitsSchema } from "@shared/models/db/db.planLimits.schema";

export const dashboardBootstrapSchema = z.object({
  profile: profileSchema,
  membership: membershipSchema.nullable(),
  organization: organizationSchema.nullable(),
  organizationProfile: organizationProfileSchema.nullable(),
  subscription: subscriptionUISchema.nullable(),
  planLimits: planLimitsSchema,
});

export type DashboardBootstrap = z.infer<typeof dashboardBootstrapSchema>;