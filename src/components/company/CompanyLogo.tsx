"use client";
/* eslint-disable @next/next/no-img-element -- private same-origin assets must bypass the server-side Next image optimizer */

import { useState } from "react";

type CompanyLogoProps = {
  src: string | null | undefined;
  companyName?: string | null;
  size: number;
  className?: string;
  fallbackClassName?: string;
};

export function CompanyLogo({
  src,
  companyName,
  size,
  className = "",
  fallbackClassName = "",
}: CompanyLogoProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = Boolean(src && failedSrc === src);
  const initials = (companyName?.trim() || "JQ")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <span
      aria-label={
        src && !failed ? undefined : `${companyName || "Company"} logo fallback`
      }
      className={`relative grid shrink-0 place-items-center overflow-hidden bg-blue-600 font-bold text-white ${fallbackClassName}`}
      style={{ width: size, height: size }}
    >
      <span aria-hidden={Boolean(src && !failed)}>{initials}</span>
      {src && !failed && (
        <img
          src={src}
          alt={`${companyName || "Company"} logo`}
          width={size}
          height={size}
          className={`absolute inset-0 h-full w-full bg-white object-contain ${className}`}
          onError={() => setFailedSrc(src ?? null)}
          decoding="async"
        />
      )}
    </span>
  );
}
