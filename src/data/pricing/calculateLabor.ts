export interface LaborCalculation {
  recommendedCrew: number;

  laborHours: number;

  laborCost: number;
}

export function calculateLabor(
  truckVolume: number,
  heavyItems: number,
  laborRate: number
): LaborCalculation {
  let recommendedCrew = 1;

  if (truckVolume >= 40) {
    recommendedCrew = 2;
  }

  if (truckVolume >= 120) {
    recommendedCrew = 3;
  }

  if (heavyItems >= 6) {
    recommendedCrew++;
  }

  const laborHours = Math.max(
    1,
    Math.ceil(truckVolume / 30)
  );

  const laborCost =
    recommendedCrew *
    laborHours *
    laborRate;

  return {
    recommendedCrew,
    laborHours,
    laborCost,
  };
}