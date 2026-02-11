import { useCallback, useState } from "react";
import type { z } from "zod";

type FieldErrors<T> = Partial<Record<keyof T, string>>;
type Touched<T> = Partial<Record<keyof T, boolean>>;

export function useLiveForm<T extends Record<string, unknown>>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: z.ZodObject<any>,
  initialValues: T,
) {
  const [form, setForm] = useState<T>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<T>>({});
  const [touched, setTouched] = useState<Touched<T>>({});

  const validateField = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      const shape = schema.shape[key as string];
      const result = shape.safeParse(value);

      setFieldErrors((prev) => ({
        ...prev,
        [key]: result.success ? undefined : result.error.issues[0]?.message ?? "Champ invalide",
      }));

      return result.success;
    },
    [schema],
  );

  const shouldShowFieldError = useCallback(
    <K extends keyof T>(key: K, opts?: { hideUntilTouched?: boolean }) => {
      if (opts?.hideUntilTouched) return !!touched[key];
      const v = form[key];
      const hasValue = typeof v === "string" ? v.length > 0 : !!v;
      return !!touched[key] || hasValue;
    },
    [form, touched],
  );

  const handleChange = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
      validateField(key, value);
    },
    [validateField],
  );

  const handleBlur = useCallback(
    <K extends keyof T>(key: K) => {
      setTouched((t) => ({ ...t, [key]: true }));
      validateField(key, form[key]);
    },
    [form, validateField],
  );

  const touchAll = useCallback((keys: Array<keyof T>) => {
    const next: Touched<T> = {};
    for (const k of keys) next[k] = true;
    setTouched(next);
  }, []);

  const validateAll = useCallback(() => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errors: FieldErrors<T> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof T | undefined;
        if (field) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return { ok: false as const, errors };
    }

    setFieldErrors({});
    return { ok: true as const, data: parsed.data as T };
  }, [schema, form]);

  return {
    form,
    setForm,
    fieldErrors,
    touched,
    validateField,
    shouldShowFieldError,
    handleChange,
    handleBlur,
    touchAll,
    validateAll,
  };
}
