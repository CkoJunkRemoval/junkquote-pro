export type PriceVarianceFlag = "underbid" | "overbid" | "high-profit" | "low-profit" | "on-target";
export function classifyPriceVariance(quoted: number, finalInvoice: number, collected: number, profit: number): PriceVarianceFlag[] {
  const flags: PriceVarianceFlag[] = [];
  if (finalInvoice > quoted * 1.05) flags.push("underbid");
  if (finalInvoice < quoted * 0.95) flags.push("overbid");
  const margin = collected ? profit / collected : 0;
  if (margin >= 0.4) flags.push("high-profit");
  if (margin < 0.15) flags.push("low-profit");
  return flags.length ? flags : ["on-target"];
}
