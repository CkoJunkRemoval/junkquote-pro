import { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button({
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        rounded-xl
        bg-blue-700
        hover:bg-blue-800
        disabled:bg-slate-400
        disabled:cursor-not-allowed
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