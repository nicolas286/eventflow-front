export const FIELD_TYPES = [
  { value: "text", label: "Texte" },
  { value: "email", label: "Email" },
  { value: "date", label: "Date" },
  { value: "phone", label: "Téléphone" },
  { value: "country", label: "Pays" },
  { value: "textarea", label: "Texte long" },
  { value: "number", label: "Nombre" },
  { value: "checkbox", label: "Case à cocher" },
  { value: "select", label: "Liste (select)" },
  { value: "radio", label: "Radio" },
] as const;

export type FieldType = (typeof FIELD_TYPES)[number]["value"];
