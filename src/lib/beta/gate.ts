export type GateCheck = { name: string; passed: boolean; detail?: string };
export function evaluateBetaGate(checks: GateCheck[]) {
  const failed = checks.filter((x) => !x.passed);
  return { passed: failed.length === 0, failed, checks };
}
