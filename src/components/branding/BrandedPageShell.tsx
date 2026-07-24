import type { ReactNode } from "react";

export function BrandedBackground() {
  return (
    <div className="branded-background" aria-hidden="true">
      <div className="branded-background__grid" />
      <div className="branded-background__glow" />
    </div>
  );
}

export default function BrandedPageShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`branded-page-shell ${className}`}>
      <BrandedBackground />
      <div className="branded-page-shell__content">{children}</div>
    </div>
  );
}
