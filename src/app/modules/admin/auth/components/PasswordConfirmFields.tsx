import PasswordInput from "@ui/components/inputs/PasswordInput";
import { MessageBox } from "@ui/components/message/MessageBox";

type FieldErrorMap<T extends string> = Partial<Record<T, string>>;

type LiveFormLike<TFields extends string> = {
  form: Record<TFields, string>;
  fieldErrors: FieldErrorMap<TFields>;
  handleChange: (field: TFields, value: string) => void;
  handleBlur: (field: TFields) => void;
  shouldShowFieldError: (field: TFields, opts?: { hideUntilTouched?: boolean }) => boolean;
};

type Props<
  TPasswordKey extends string,
  TConfirmKey extends string,
> = {
  live: LiveFormLike<TPasswordKey | TConfirmKey>;
  passwordKey: TPasswordKey;
  confirmKey: TConfirmKey;

  labels?: {
    password?: string;
    confirm?: string;
  };

  placeholders?: {
    password?: string;
    confirm?: string;
  };

  autoComplete?: string; 
  onAnyChange?: () => void; 
};

export function PasswordConfirmFields<
  TPasswordKey extends string,
  TConfirmKey extends string,
>({
  live,
  passwordKey,
  confirmKey,
  labels,
  placeholders,
  autoComplete = "new-password",
  onAnyChange,
}: Props<TPasswordKey, TConfirmKey>) {
  const { form, fieldErrors, handleChange, handleBlur, shouldShowFieldError } = live;

  const passwordValue = form[passwordKey] ?? "";
  const confirmValue = form[confirmKey] ?? "";

  return (
    <>
      <PasswordInput
        label={labels?.password ?? "Mot de passe"}
        placeholder={placeholders?.password ?? "Votre mot de passe"}
        value={passwordValue}
        onChange={(e) => {
          onAnyChange?.();
          const next = e.target.value;
          handleChange(passwordKey, next);

          if (confirmValue) handleChange(confirmKey, confirmValue);
        }}
        onBlur={() => handleBlur(passwordKey)}
        autoComplete={autoComplete}
      />
      {shouldShowFieldError(passwordKey) && fieldErrors[passwordKey] && (
        <MessageBox variant="error">{fieldErrors[passwordKey]}</MessageBox>
      )}

      <PasswordInput
        label={labels?.confirm ?? "Confirmer le mot de passe"}
        placeholder={placeholders?.confirm ?? "Confirmez le mot de passe"}
        value={confirmValue}
        onChange={(e) => {
          onAnyChange?.();
          handleChange(confirmKey, e.target.value);
        }}
        onBlur={() => handleBlur(confirmKey)}
        autoComplete={autoComplete}
      />
      {shouldShowFieldError(confirmKey) && fieldErrors[confirmKey] && (
        <MessageBox variant="error">{fieldErrors[confirmKey]}</MessageBox>
      )}
    </>
  );
}