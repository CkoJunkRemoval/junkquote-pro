export type AuditLike = {
  vulnerabilities?: Record<string, { severity?: string; via?: unknown[] }>;
};
const accepted: Record<string, string> = {
  "@hono/node-server":
    "Build-time Prisma CLI path; the application does not expose Hono serveStatic. Reassess on every Prisma upgrade.",
  "@prisma/dev": "Transitive build-time path to the accepted Hono advisory.",
  prisma:
    "Direct Prisma CLI path to the accepted Hono advisory; the generated client runtime does not expose serveStatic.",
  postcss:
    "Next.js build-time CSS processing with repository-controlled CSS input; no untrusted CSS reaches the stringifier.",
  next: "Direct framework path to the accepted bundled PostCSS build-time advisory; application users cannot provide CSS source.",
};
export function evaluateDependencyPolicy(audit: AuditLike) {
  const findings = Object.entries(audit.vulnerabilities ?? {}).map(
    ([name, value]) => ({
      name,
      severity: value.severity ?? "unknown",
      accepted: Boolean(accepted[name]),
      rationale: accepted[name] ?? null,
    }),
  );
  const blocking = findings.filter(
    (x) => !x.accepted && ["moderate", "high", "critical"].includes(x.severity),
  );
  return { passed: blocking.length === 0, findings, blocking };
}
