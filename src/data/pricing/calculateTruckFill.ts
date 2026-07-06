export interface TruckFill {
  percentage: number;
  label: string;
}

const MAX_TRUCK_VOLUME = 300;

export function calculateTruckFill(
  truckVolume: number
): TruckFill {
  const percentage = Math.min(
    100,
    Math.round((truckVolume / MAX_TRUCK_VOLUME) * 100)
  );

  let label = "Minimum Load";

  if (percentage >= 90) {
    label = "Full Truck";
  } else if (percentage >= 70) {
    label = "3/4 Truck";
  } else if (percentage >= 45) {
    label = "Half Truck";
  } else if (percentage >= 20) {
    label = "Quarter Truck";
  }

  return {
    percentage,
    label,
  };
}