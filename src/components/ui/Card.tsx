type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`
        rounded-2xl
        bg-white
        shadow-sm
        border
        border-slate-200
        p-6
        text-slate-900
        ${className}
      `}
    >
      {children}
    </div>
  );
}
