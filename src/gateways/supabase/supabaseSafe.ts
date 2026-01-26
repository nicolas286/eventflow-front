import type { PostgrestSingleResponse, PostgrestError } from "@supabase/supabase-js";
import { normalizeError } from "../../domain/errors/errors";

export async function supabaseSafe(
  fn: () => PromiseLike<PostgrestSingleResponse<unknown>>
): Promise<unknown> {
  const { data, error } = await fn();

  if (error) throw normalizeError(error as PostgrestError, "Erreur serveur");
  if (data == null) throw new Error("Réponse invalide (data null).");

  return data;
}
