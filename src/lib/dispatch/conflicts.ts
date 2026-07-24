export type ScheduleConflict = {
  code: string;
  severity: "blocking" | "warning";
  message: string;
};

export type ScheduleWindow = {
  start: Date | null;
  end: Date | null;
  arrivalStart?: Date | null;
  arrivalEnd?: Date | null;
  employeeIds: string[];
  vehicleIds: string[];
  requiredCrewSize: number;
  businessHours?: { startMinutes: number; endMinutes: number } | null;
};

export const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
  aStart < bEnd && aEnd > bStart;

export function validateScheduleWindow(input: ScheduleWindow): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  if (!input.start || !input.end) {
    conflicts.push({ code: "MISSING_TIME", severity: "blocking", message: "Scheduled start and end are required." });
    return conflicts;
  }
  if (input.end <= input.start) conflicts.push({ code: "INVALID_TIME", severity: "blocking", message: "Scheduled end must be after scheduled start." });
  if ((input.arrivalStart && !input.arrivalEnd) || (!input.arrivalStart && input.arrivalEnd)) {
    conflicts.push({ code: "INCOMPLETE_ARRIVAL_WINDOW", severity: "blocking", message: "Arrival windows require both a start and end." });
  } else if (input.arrivalStart && input.arrivalEnd && input.arrivalEnd <= input.arrivalStart) {
    conflicts.push({ code: "INVALID_ARRIVAL_WINDOW", severity: "blocking", message: "Arrival window end must be after its start." });
  }
  if (!input.employeeIds.length) conflicts.push({ code: "MISSING_CREW", severity: "warning", message: "No employees are assigned." });
  if (!input.vehicleIds.length) conflicts.push({ code: "MISSING_VEHICLE", severity: "warning", message: "No vehicle is assigned." });
  if (input.employeeIds.length < input.requiredCrewSize) conflicts.push({ code: "SHORT_CREW", severity: "warning", message: `This job requires at least ${input.requiredCrewSize} crew members.` });
  if (input.businessHours) {
    const startMinutes = input.start.getHours() * 60 + input.start.getMinutes();
    const endMinutes = input.end.getHours() * 60 + input.end.getMinutes();
    if (startMinutes < input.businessHours.startMinutes || endMinutes > input.businessHours.endMinutes) {
      conflicts.push({ code: "OUTSIDE_BUSINESS_HOURS", severity: "warning", message: "The scheduled time is outside company business hours." });
    }
  }
  return conflicts;
}

export function parseBusinessHours(value?: string | null) {
  const match = value?.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return { startMinutes: Number(match[1]) * 60 + Number(match[2]), endMinutes: Number(match[3]) * 60 + Number(match[4]) };
}
