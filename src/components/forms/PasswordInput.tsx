"use client";

import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useId, useState, type InputHTMLAttributes } from "react";

export type PasswordVisibilityState = { visible: boolean; value: string };

export function togglePasswordVisibility(
  state: PasswordVisibilityState,
): PasswordVisibilityState {
  return { ...state, visible: !state.visible };
}

type PasswordInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label: string;
  hint?: string;
  wrapperClassName?: string;
};

export default function PasswordInput({
  label,
  hint,
  wrapperClassName = "",
  id,
  className,
  ...inputProps
}: PasswordInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const [visible, setVisible] = useState(false);
  return (
    <div className={`auth-field ${wrapperClassName}`.trim()}>
      <label htmlFor={inputId}>{label}</label>
      <LockKeyhole aria-hidden="true" size={18} />
      <input
        {...inputProps}
        id={inputId}
        type={visible ? "text" : "password"}
        aria-describedby={
          [inputProps["aria-describedby"], hintId].filter(Boolean).join(" ") ||
          undefined
        }
        className={className}
      />
      <button
        type="button"
        className="password-visibility-toggle"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? (
          <EyeOff aria-hidden="true" size={20} />
        ) : (
          <Eye aria-hidden="true" size={20} />
        )}
      </button>
      {hint && (
        <small id={hintId} className="auth-field__hint">
          {hint}
        </small>
      )}
    </div>
  );
}
