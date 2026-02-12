export function isBlank(v: unknown) {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}