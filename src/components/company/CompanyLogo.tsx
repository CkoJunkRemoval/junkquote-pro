"use client";
/* eslint-disable @next/next/no-img-element -- private same-origin assets must bypass the server-side Next image optimizer */

import { useEffect, useRef, useState } from "react";

type CompanyLogoProps = {
  src: string | null | undefined;
  companyName?: string | null;
  size: number;
  className?: string;
  fallbackClassName?: string;
};

type LogoState = {
  src: string;
  attempt: 0 | 1;
  loaded: boolean;
  failed: boolean;
};
export function nextCompanyLogoState(
  state: LogoState,
  event: "loaded" | "failed",
): LogoState {
  if (event === "loaded") return { ...state, loaded: true, failed: false };
  return state.attempt === 0
    ? { ...state, attempt: 1, loaded: false, failed: false }
    : { ...state, loaded: false, failed: true };
}

export function companyLogoRequestUrl(src: string, attempt: 0 | 1) {
  if (attempt === 0) return src;
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}logoRetry=1`;
}

export function CompanyLogo({
  src,
  companyName,
  size,
  className = "",
  fallbackClassName = "",
}: CompanyLogoProps) {
  const normalizedSrc = src?.trim() || "";
  const [state, setState] = useState<LogoState>({
    src: normalizedSrc,
    attempt: 0,
    loaded: false,
    failed: false,
  });
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current =
    state.src === normalizedSrc
      ? state
      : {
          src: normalizedSrc,
          attempt: 0 as const,
          loaded: false,
          failed: false,
        };
  const showFallback = !normalizedSrc || current.failed;
  const initials = (companyName?.trim() || "JQ")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  useEffect(
    () => () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    },
    [],
  );

  function handleError() {
    if (current.attempt === 0) {
      retryTimer.current = setTimeout(() => {
        setState(nextCompanyLogoState(current, "failed"));
      }, 250);
      return;
    }
    setState(nextCompanyLogoState(current, "failed"));
  }

  return (
    <span
      aria-busy={Boolean(normalizedSrc && !current.loaded && !current.failed)}
      aria-label={
        showFallback ? `${companyName || "Company"} logo fallback` : undefined
      }
      className={`relative grid shrink-0 place-items-center overflow-hidden bg-blue-600 font-bold text-white ${fallbackClassName}`}
      style={{ width: size, height: size }}
    >
      <span
        className={showFallback ? "" : "invisible"}
        aria-hidden={!showFallback}
      >
        {initials}
      </span>
      {normalizedSrc && !current.failed && (
        <img
          key={companyLogoRequestUrl(normalizedSrc, current.attempt)}
          src={companyLogoRequestUrl(normalizedSrc, current.attempt)}
          alt={`${companyName || "Company"} logo`}
          width={size}
          height={size}
          className={`absolute inset-0 h-full w-full bg-white object-contain transition-opacity ${current.loaded ? "opacity-100" : "opacity-0"} ${className}`}
          onLoad={() => setState(nextCompanyLogoState(current, "loaded"))}
          onError={handleError}
          decoding="async"
        />
      )}
    </span>
  );
}
