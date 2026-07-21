import { prisma } from "@/lib/prisma";
import type { FeatureFlag, SubscriptionPlan } from "@/generated/prisma/client";

type FlagContext = {
  companyId?: string;
  plan?: SubscriptionPlan;
  environment?: string;
  subject?: string;
};

export function rolloutBucket(key: string, subject: string) {
  let value = 0;
  for (const character of `${key}:${subject}`)
    value = (value * 31 + character.charCodeAt(0)) % 100;
  return value;
}

export function resolveFeatureFlag(
  flags: Pick<FeatureFlag, "companyId" | "plan" | "environment" | "enabled" | "rolloutPercent" | "createdAt" | "id">[],
  context: FlagContext,
) {
  const tiers = [
    flags.filter((flag) => Boolean(context.companyId) && flag.companyId === context.companyId),
    flags.filter((flag) => Boolean(context.plan) && !flag.companyId && flag.plan === context.plan),
    flags.filter((flag) => Boolean(context.environment) && !flag.companyId && !flag.plan && flag.environment === context.environment),
    flags.filter((flag) => !flag.companyId && !flag.plan && !flag.environment),
  ];
  const candidates = tiers.find((tier) => tier.length > 0);
  return candidates?.sort((a, b) =>
    b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id),
  )[0];
}

export async function isFeatureEnabled(key: string, input: FlagContext = {}) {
  const environment = input.environment ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development";
  try {
    const flags = await prisma.featureFlag.findMany({
      where: {
        key,
        OR: [
          ...(input.companyId ? [{ companyId: input.companyId }] : []),
          ...(input.plan ? [{ companyId: null, plan: input.plan }] : []),
          { companyId: null, plan: null, environment },
          { companyId: null, plan: null, environment: null },
        ],
      },
    });
    const flag = resolveFeatureFlag(flags, { ...input, environment });
    return Boolean(
      flag?.enabled &&
        rolloutBucket(key, input.subject ?? input.companyId ?? "global") < flag.rolloutPercent,
    );
  } catch {
    // Feature availability must fail closed when the flag store is unavailable.
    return false;
  }
}

export function validateRollout(percent: number) {
  if (!Number.isInteger(percent) || percent < 0 || percent > 100)
    throw new Error("Rollout percentage must be from 0 to 100.");
}
