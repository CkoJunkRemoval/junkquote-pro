import { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "warning";
};

export default function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`ui-button ui-button--${variant}
        rounded-xl
        disabled:cursor-not-allowed
        shadow-[0_10px_25px_rgba(242,140,40,0.2)]
        transition
        px-6
        py-3
        font-semibold
        text-white
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
