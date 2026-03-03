import type { PostgrestSingleResponse } from "@supabase/supabase-js";

export async function supabaseSafe<T>(
  fn: () => PromiseLike<PostgrestSingleResponse<T>>,
): Promise<T> {
  const { data, error } = await fn();

  if (error) throw error;

  return data as T;
}
