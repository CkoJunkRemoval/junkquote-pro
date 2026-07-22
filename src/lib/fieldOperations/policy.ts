import type { FieldJobStage, FieldTimeEventType } from "@/generated/prisma/client";

export const FIELD_STAGE_ORDER = ["Scheduled", "EnRoute", "Arrived", "Working", "Loading", "Cleanup", "Completed", "ReadyForInvoice"] as const satisfies readonly FieldJobStage[];
export const REQUIRED_FIELD_CHECKLIST = [
  ["arrival", "Arrival checklist"], ["walkthrough", "Property walkthrough"], ["photos", "Required photos taken"],
  ["customer-confirmation", "Customer confirmation"], ["cleanup", "Cleanup complete"], ["final-walkthrough", "Final walkthrough"],
] as const;

export function canTransitionFieldStage(from: FieldJobStage, to: FieldJobStage, authorizedSkip = false) {
  if (from === to) return true;
  const fromIndex = FIELD_STAGE_ORDER.indexOf(from);
  const toIndex = FIELD_STAGE_ORDER.indexOf(to);
  return toIndex > fromIndex && (authorizedSkip || toIndex === fromIndex + 1);
}

export function validNextTimeEvents(last?: FieldTimeEventType): FieldTimeEventType[] {
  if (!last || last === "ClockOut") return ["ClockIn"];
  if (last === "ClockIn" || last === "BreakEnd") return ["BreakStart", "ClockOut"];
  return ["BreakEnd"];
}

export function calculateFieldDurations(events:{type:FieldTimeEventType;timestamp:Date}[]){let work=0,breakMs=0,clockedAt:Date|undefined,breakAt:Date|undefined;for(const event of events){if(event.type==="ClockIn")clockedAt=event.timestamp;if(event.type==="BreakStart")breakAt=event.timestamp;if(event.type==="BreakEnd"&&breakAt){breakMs+=event.timestamp.getTime()-breakAt.getTime();breakAt=undefined}if(event.type==="ClockOut"&&clockedAt){work+=event.timestamp.getTime()-clockedAt.getTime();clockedAt=undefined}}return {laborMinutes:Math.max(0,Math.round((work-breakMs)/60000)),idleMinutes:Math.max(0,Math.round(breakMs/60000))};}

export function assertCoordinate(value: number | undefined, label: string) {
  if (value !== undefined && (!Number.isFinite(value) || value < (label.includes("latitude") ? -90 : -180) || value > (label.includes("latitude") ? 90 : 180))) throw new Error(`Invalid ${label}.`);
}
