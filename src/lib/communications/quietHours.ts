export function nextAllowedDelivery(input: {
  now: Date;
  timeZone: string;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  urgent?: boolean;
}) {
  if (input.urgent || !validTime(input.quietHoursStart) || !validTime(input.quietHoursEnd)) return { scheduledFor: input.now, delayed: false, reason: null };
  const parts = zonedParts(input.now, input.timeZone);
  const minute = parts.hour * 60 + parts.minute;
  const start = minutes(input.quietHoursStart!);
  const end = minutes(input.quietHoursEnd!);
  const quiet = start < end ? minute >= start && minute < end : minute >= start || minute < end;
  if (!quiet) return { scheduledFor: input.now, delayed: false, reason: null };
  const minutesUntilEnd = start < end || minute < end ? (end - minute + 1440) % 1440 : 1440 - minute + end;
  return { scheduledFor: new Date(input.now.getTime() + Math.max(1, minutesUntilEnd) * 60000), delayed: true, reason: "Deferred until company quiet hours end." };
}
const validTime = (value?: string | null) => Boolean(value && /^([01]\d|2[0-3]):[0-5]\d$/.test(value));
const minutes = (value: string) => Number(value.slice(0,2)) * 60 + Number(value.slice(3,5));
function zonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const values = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return { hour: Number(values.hour), minute: Number(values.minute) };
}
