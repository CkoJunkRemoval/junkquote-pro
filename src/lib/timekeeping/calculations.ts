import type {
  PayPeriodFrequency,
  TimeClockEventType,
} from "@/generated/prisma/client";

export type ClockPoint = {
  eventType: TimeClockEventType;
  eventTimestamp: Date;
  voidedAt?: Date | null;
};

export function reduceClockState(
  events: Pick<ClockPoint, "eventType" | "voidedAt">[],
) {
  let clockedIn = false;
  let onBreak = false;
  for (const event of events.filter((entry) => !entry.voidedAt)) {
    if (event.eventType === "ClockIn") {
      clockedIn = true;
      onBreak = false;
    }
    if (event.eventType === "BreakStart" && clockedIn) onBreak = true;
    if (event.eventType === "BreakEnd") onBreak = false;
    if (event.eventType === "ClockOut") {
      clockedIn = false;
      onBreak = false;
    }
  }
  return {
    clockedIn,
    onBreak,
    nextEvents: clockedIn
      ? onBreak
        ? (["BreakEnd"] as TimeClockEventType[])
        : (["BreakStart", "ClockOut"] as TimeClockEventType[])
      : (["ClockIn"] as TimeClockEventType[]),
  };
}

export function deriveSessionMinutes(events: ClockPoint[]) {
  const active = events
    .filter((event) => !event.voidedAt)
    .sort((a, b) => a.eventTimestamp.getTime() - b.eventTimestamp.getTime());
  const clockIn = active.find((event) => event.eventType === "ClockIn");
  const clockOut = [...active]
    .reverse()
    .find((event) => event.eventType === "ClockOut");
  if (!clockIn || !clockOut || clockOut.eventTimestamp < clockIn.eventTimestamp)
    throw new Error(
      "A completed session requires a valid clock-in and clock-out.",
    );
  let breakStart: Date | null = null,
    unpaidBreakMinutes = 0;
  for (const event of active) {
    if (event.eventType === "BreakStart") breakStart = event.eventTimestamp;
    if (event.eventType === "BreakEnd" && breakStart) {
      unpaidBreakMinutes += Math.max(
        0,
        Math.round(
          (event.eventTimestamp.getTime() - breakStart.getTime()) / 60000,
        ),
      );
      breakStart = null;
    }
  }
  const grossMinutes = Math.max(
    0,
    Math.round(
      (clockOut.eventTimestamp.getTime() - clockIn.eventTimestamp.getTime()) /
        60000,
    ),
  );
  return {
    clockInAt: clockIn.eventTimestamp,
    clockOutAt: clockOut.eventTimestamp,
    grossMinutes,
    unpaidBreakMinutes,
    payableMinutes: Math.max(0, grossMinutes - unpaidBreakMinutes),
    openBreak: Boolean(breakStart),
  };
}

export function splitRegularOvertime(
  minutes: number,
  priorMinutes: number,
  thresholdMinutes = 2400,
) {
  const regular = Math.max(
    0,
    Math.min(minutes, thresholdMinutes - priorMinutes),
  );
  return {
    regularMinutes: regular,
    overtimeMinutes: Math.max(0, minutes - regular),
  };
}

export function workweekStart(timestamp: Date, startDay: number) {
  const normalizedStartDay = Math.min(6, Math.max(0, Math.trunc(startDay)));
  const start = new Date(
    Date.UTC(
      timestamp.getUTCFullYear(),
      timestamp.getUTCMonth(),
      timestamp.getUTCDate(),
    ),
  );
  const daysSinceStart = (start.getUTCDay() - normalizedStartDay + 7) % 7;
  start.setUTCDate(start.getUTCDate() - daysSinceStart);
  return start;
}

export function payPeriodRange(frequency: PayPeriodFrequency, anchor: Date) {
  const start = new Date(
    Date.UTC(
      anchor.getUTCFullYear(),
      anchor.getUTCMonth(),
      anchor.getUTCDate(),
    ),
  );
  let end = new Date(start);
  if (frequency === "Weekly" || frequency === "Biweekly") {
    const days = frequency === "Weekly" ? 7 : 14;
    start.setUTCDate(start.getUTCDate() - start.getUTCDay());
    end = new Date(start);
    end.setUTCDate(end.getUTCDate() + days - 1);
    end.setUTCHours(23, 59, 59, 999);
  } else if (frequency === "Semimonthly") {
    start.setUTCDate(anchor.getUTCDate() <= 15 ? 1 : 16);
    end =
      anchor.getUTCDate() <= 15
        ? new Date(
            Date.UTC(
              anchor.getUTCFullYear(),
              anchor.getUTCMonth(),
              15,
              23,
              59,
              59,
              999,
            ),
          )
        : new Date(
            Date.UTC(
              anchor.getUTCFullYear(),
              anchor.getUTCMonth() + 1,
              0,
              23,
              59,
              59,
              999,
            ),
          );
  } else if (frequency === "Monthly") {
    start.setUTCDate(1);
    end = new Date(
      Date.UTC(
        anchor.getUTCFullYear(),
        anchor.getUTCMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      ),
    );
  }
  return { startDate: start, endDate: end };
}

export function csvCell(value: unknown) {
  return `"${String(value ?? "")
    .replaceAll('"', '""')
    .replaceAll(/\r?\n/g, " ")}"`;
}
