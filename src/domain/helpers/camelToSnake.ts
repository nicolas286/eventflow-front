/**
 * Convertit récursivement toutes les clés d’un objet ou tableau
 * de camelCase vers snake_case.
 *
 * - gère objets, tableaux, primitives
 * - ne modifie pas les dates / strings / numbers
 * - safe pour JSON RPC Supabase
 */

function toSnake(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

export function camelToSnake<T = unknown>(input: unknown): T {
  if (Array.isArray(input)) {
    return input.map(camelToSnake) as T;
  }

  if (input !== null && typeof input === "object") {
    const obj = input as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const key of Object.keys(obj)) {
      const snakeKey = toSnake(key);
      result[snakeKey] = camelToSnake(obj[key]);
    }

    return result as T;
  }

  return input as T;
}
