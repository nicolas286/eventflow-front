/**
 * Convertit récursivement toutes les clés d’un objet ou tableau
 * de snake_case vers camelCase.
 *
 * - gère objets, tableaux, primitives
 * - ne modifie pas les dates / strings / numbers
 * - safe pour JSON RPC Supabase
 */

function toCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export function snakeToCamel<T = unknown>(input: unknown): T {
  if (Array.isArray(input)) {
    return input.map(snakeToCamel) as T;
  }

  if (input !== null && typeof input === "object") {
    const obj = input as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const key of Object.keys(obj)) {
      const camelKey = toCamel(key);
      result[camelKey] = snakeToCamel(obj[key]);
    }

    return result as T;
  }

  return input as T;
}
