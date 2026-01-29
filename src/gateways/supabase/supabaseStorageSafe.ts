import { normalizeError } from "../../domain/errors/errors";

type StorageResp<T> = { data: T | null; error: unknown | null };

export async function supabaseStorageSafe<T>(
  fn: () => PromiseLike<StorageResp<T>>
): Promise<T> {
  const { data, error } = await fn();

  if (error) throw normalizeError(error as any, "Erreur serveur (storage)");
  if (data == null) throw new Error("Réponse invalide (storage data null).");

  return data;
}
