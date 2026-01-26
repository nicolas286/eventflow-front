// gateways/supabase/supabaseSafe.ts
import type { PostgrestSingleResponse, PostgrestError } from "@supabase/supabase-js";
import { normalizeError } from "../../domain/errors/errors";

export async function supabaseSafe<T>(
  fn: () => PromiseLike<PostgrestSingleResponse<T>>
): Promise<T> {
  const { data, error } = await fn();

  if (error) {
    // normalizeError doit savoir gérer PostgrestError (ou unknown)
    throw normalizeError(error as PostgrestError, "Erreur serveur");
  }

  // si la RPC / query renvoie null alors que tu attends T
  if (data == null) {
    throw new Error("Réponse invalide (data null).");
  }

  return data;
}
