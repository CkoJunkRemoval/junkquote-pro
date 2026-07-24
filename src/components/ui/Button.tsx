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
        bg-[var(--brand-orange)]
        hover:bg-[var(--brand-orange-hover)]
        disabled:bg-slate-400
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
