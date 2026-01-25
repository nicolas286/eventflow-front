import { normalizeError } from "../../domain/errors/errors";

export async function supabaseSafe<T>(
  fn: () => Promise<{ data: T; error: unknown }>
): Promise<T> {
  const { data, error } = await fn();
  if (error) throw normalizeError(error, "Erreur serveur");
  return data;
}
