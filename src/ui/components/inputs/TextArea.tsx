import type { ChangeEventHandler, ReactNode, TextareaHTMLAttributes } from "react";
import "../../../styles/textArea.css";


export type TextAreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> & {
  label?: ReactNode;
  value?: string | number | readonly string[];
  onChange?: ChangeEventHandler<HTMLTextAreaElement>;
  placeholder?: string;
  className?: string;
  textAreaClassName?: string;
};

export default function TextArea({
  label,
  value,
  onChange,
  placeholder,
  className = "",
  textAreaClassName = "",
  ...rest
}: TextAreaProps) {
  return (
    <label className={["ui-field", className].filter(Boolean).join(" ")}>
      {label ? <div className="ui-field__label">{label}</div> : null}
      <textarea
        className={["ui-textArea", textAreaClassName].filter(Boolean).join(" ")}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        {...rest}
      />
    </label>
  );
}