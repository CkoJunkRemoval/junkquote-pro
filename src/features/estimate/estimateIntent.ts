export function resolveEstimateIntent(input: {
  explicitNew: boolean;
  explicitEstimateId: string | null;
  selectedEstimateId: string | null;
  persistedEstimateId: string | null;
}) {
  if (input.explicitNew) return "new";
  return (
    input.explicitEstimateId ??
    input.selectedEstimateId ??
    input.persistedEstimateId
  );
}
