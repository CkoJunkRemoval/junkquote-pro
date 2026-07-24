type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`glass-card p-6 ${className}`}
    >
      {children}
    </div>
  );
}
