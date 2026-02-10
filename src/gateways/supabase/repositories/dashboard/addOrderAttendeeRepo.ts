import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";
import { snakeToCamel } from "../../../../domain/helpers/snakeToCamel";
import {
  adminAddOrderAttendeeInputSchema,
  type AdminAddOrderAttendeeInput,
  adminAddOrderAttendeeResultSchema,
  type AdminAddOrderAttendeeResult,
} from "../../../../domain/models/admin/admin.addOrderAttendee.schema";
import { camelToSnake } from "../../../../domain/helpers/camelToSnake";


export function adminAddOrderAttendeeRepo(supabase: SupabaseClient) {
  return {
    async addAttendeeToOrder(
      input: AdminAddOrderAttendeeInput
    ): Promise<AdminAddOrderAttendeeResult> {
      const validated = adminAddOrderAttendeeInputSchema.parse(input);

      const hasSingle = !!validated.attendee;
      const hasBulk = Array.isArray((validated as any).attendees);

      // (normalement garanti par zod superRefine, mais on harden)
      if (hasSingle === hasBulk) {
        throw new Error("addAttendeeToOrder: provide attendee OR attendees (not both)");
      }

      const p_mark_paid = validated.markPaid ?? false;

      // -------------------- SINGLE --------------------
      if (validated.attendee) {
        const attendeeSnake = camelToSnake(validated.attendee);

        const raw = await supabaseSafe(() =>
          supabase.rpc("admin_add_order_attendee", {
            p_order_id: validated.orderId,
            p_event_product_id: validated.eventProductId,
            p_attendee: attendeeSnake, 
            p_mark_paid,
          })
        );

        const camel = snakeToCamel(raw);
        return adminAddOrderAttendeeResultSchema.parse(camel);
      }

      // -------------------- BULK --------------------
      const attendees = (validated as any).attendees as NonNullable<
        (AdminAddOrderAttendeeInput & { attendees: any[] })["attendees"]
      >;

      const attendeesSnake = attendees.map((a) => camelToSnake(a));

      const raw = await supabaseSafe(() =>
        supabase.rpc("admin_add_order_attendees_for_unit", {
          p_order_id: validated.orderId,
          p_event_product_id: validated.eventProductId,
          p_attendees: attendeesSnake,
          p_mark_paid,
        })
      );

      const camel = snakeToCamel(raw);
      return adminAddOrderAttendeeResultSchema.parse(camel);
    },
  };
}
