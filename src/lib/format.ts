import type { Vehicle } from "../types";

const LABELS: Record<string, string> = {
  moving: "Moving",
  idle: "Idle",
  maintenance: "In workshop",
  offline: "Offline",
  scheduled: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  on_trip: "On trip",
  available: "Available",
  off_duty: "Off duty",
  admin: "Operations admin",
  manager: "Fleet manager",
  driver: "Driver",
  telematics: "Telematics",
  phone: "Phone GPS",
  hold: "At stop",
};

export function label(value: string) {
  return LABELS[value] ?? value;
}

export function vehicleLabel(vehicle: Vehicle) {
  if (vehicle.status === "moving" && vehicle.speedKmh < 1) return "At stop";
  return label(vehicle.status);
}

export function vehicleTone(vehicle: Vehicle) {
  if (vehicle.status === "moving" && vehicle.speedKmh < 1) return "hold";
  return vehicle.status;
}

export function inr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function km(value: number) {
  return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value)} km`;
}

export function when(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function day(isoDate: string) {
  const [year, month, date] = isoDate.slice(0, 10).split("-").map(Number);
  if (!year || !month || !date) return isoDate;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, date)));
}

export function stamp(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function clock(date = new Date()) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export function ago(iso: string) {
  const seconds = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${Math.floor(seconds)}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function isoDate(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 3600000).toISOString();
}

export function minutesFromNow(minutes: number) {
  return new Date(Date.now() + minutes * 60000).toISOString();
}

export function daysUntil(dayString: string) {
  const today = Date.parse(`${isoDate(0)}T00:00:00+05:30`);
  const target = Date.parse(`${dayString.slice(0, 10)}T00:00:00+05:30`);
  return Math.round((target - today) / 86400000);
}

export function isSameDay(iso: string, now = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date(iso)) === fmt.format(now);
}

export function localInputValue(offsetMinutes: number) {
  const date = new Date(Date.now() + offsetMinutes * 60000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
