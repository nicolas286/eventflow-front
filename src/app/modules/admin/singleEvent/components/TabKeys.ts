export type AdminSingleEventTabKey =
  | "details"
  | "tickets"
  | "form"
  | "promoCodes"
  | "participants";

export const ADMIN_SINGLE_EVENT_TAB_KEYS: AdminSingleEventTabKey[] = [
  "details",
  "tickets",
  "form",
  "promoCodes",
  "participants",
];

export function isAdminSingleEventTabKey(
  value: string | null
): value is AdminSingleEventTabKey {
  return !!value && (ADMIN_SINGLE_EVENT_TAB_KEYS as string[]).includes(value);
}