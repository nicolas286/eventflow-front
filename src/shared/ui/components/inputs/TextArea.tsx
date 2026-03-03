import {
  type ChangeEventHandler,
  type ReactNode,
  type TextareaHTMLAttributes,
  forwardRef,
} from "react";

import "./textArea.desktop.css";

export type TextAreaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "onChange"
> & {
  label?: ReactNode;
  value?: string | number | readonly string[];
  onChange?: ChangeEventHandler<HTMLTextAreaElement>;
  placeholder?: string;
  className?: string;
  textAreaClassName?: string;
};

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      label,
      value,
      onChange,
      placeholder,
      className = "",
      textAreaClassName = "",
      ...rest
    },
    ref
  ) => {
    return (
      <label className={["ui-field", className].filter(Boolean).join(" ")}>
        {label ? <div className="ui-field__label">{label}</div> : null}
        <textarea
          ref={ref}   
          className={["ui-textArea", textAreaClassName]
            .filter(Boolean)
            .join(" ")}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          {...rest}
        />
      </label>
    );
  }
);

export default TextArea;