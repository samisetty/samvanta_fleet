import { daysUntil, isSameDay, isoDate } from "./format";
import type { Driver, FuelEntry, MaintenanceJob, Trip, Vehicle } from "../types";

export type AlertItem = {
  id: string;
  level: "high" | "watch";
  title: string;
  detail: string;
};

export function jobTone(job: MaintenanceJob) {
  if (job.status === "completed") return "completed" as const;
  if (job.dueOn < isoDate(0)) return "overdue" as const;
  return "scheduled" as const;
}

export function dutyOf(driver: Driver, trips: Trip[]) {
  if (trips.some((trip) => trip.driverId === driver.id && trip.status === "in_progress")) {
    return "on_trip" as const;
  }
  if (!driver.status || driver.status === "off_duty") return "off_duty" as const;
  return "available" as const;
}

export function buildAlerts(vehicles: Vehicle[], drivers: Driver[], jobs: MaintenanceJob[]) {
  const items: AlertItem[] = [];
  for (const vehicle of vehicles) {
    for (const doc of vehicle.documents) {
      const days = daysUntil(doc.expiresOn);
      if (days < 0) {
        items.push({
          id: doc.id,
          level: "high",
          title: `${doc.name} expired`,
          detail: `${vehicle.regNo} · ${Math.abs(days)}d overdue`,
        });
      } else if (days <= 30) {
        items.push({
          id: doc.id,
          level: "watch",
          title: `${doc.name} expiring`,
          detail: `${vehicle.regNo} · ${days}d left`,
        });
      }
    }
  }
  const offline = vehicles.filter((vehicle) => vehicle.status === "offline");
  if (offline.length > 0) {
    const sample = offline
      .slice(0, 3)
      .map((vehicle) => vehicle.regNo)
      .join(", ");
    items.push({
      id: "offline",
      level: "watch",
      title: `${offline.length} vehicles offline`,
      detail: offline.length > 3 ? `${sample}…` : sample,
    });
  }
  for (const driver of drivers) {
    const days = daysUntil(driver.licenseExpiry);
    if (days < 0) {
      items.push({
        id: `lic-${driver.id}`,
        level: "high",
        title: "Licence expired",
        detail: `${driver.name} · ${Math.abs(days)}d overdue`,
      });
    } else if (days <= 45) {
      items.push({
        id: `lic-${driver.id}`,
        level: "watch",
        title: "Licence expiring",
        detail: `${driver.name} · ${days}d left`,
      });
    }
  }
  for (const job of jobs) {
    if (job.status === "completed") continue;
    const vehicle = vehicles.find((item) => item.id === job.vehicleId);
    const days = daysUntil(job.dueOn);
    if (days < 0) {
      items.push({
        id: job.id,
        level: "high",
        title: job.title,
        detail: `${vehicle?.regNo ?? "Vehicle"} · overdue ${Math.abs(days)}d`,
      });
    } else if (days <= 14) {
      items.push({
        id: job.id,
        level: "watch",
        title: job.title,
        detail: `${vehicle?.regNo ?? "Vehicle"} · due in ${days}d`,
      });
    }
  }
  return items.sort((a, b) => (a.level === b.level ? 0 : a.level === "high" ? -1 : 1));
}

export function fuelSpend(entries: FuelEntry[], days: number) {
  const cutoff = Date.now() - days * 86400000;
  return entries
    .filter((entry) => Date.parse(entry.at) >= cutoff)
    .reduce((sum, entry) => sum + entry.costInr, 0);
}

export function efficiencyRows(vehicles: Vehicle[], entries: FuelEntry[]) {
  const rows = [];
  for (const vehicle of vehicles) {
    const fills = entries
      .filter((entry) => entry.vehicleId === vehicle.id)
      .sort((a, b) => a.odometer - b.odometer);
    const first = fills[0];
    const last = fills[fills.length - 1];
    if (!first || !last || fills.length < 2) continue;
    const distance = last.odometer - first.odometer;
    const litres = fills.slice(1).reduce((sum, entry) => sum + entry.litres, 0);
    if (distance <= 0 || litres <= 0) continue;
    rows.push({
      vehicle,
      km: distance,
      litres,
      kmPerL: distance / litres,
      spend: fills.reduce((sum, entry) => sum + entry.costInr, 0),
    });
  }
  return rows.sort((a, b) => a.kmPerL - b.kmPerL);
}

export function currentTrip(trips: Trip[], vehicleId: string) {
  return trips.find((trip) => trip.vehicleId === vehicleId && trip.status === "in_progress") ?? null;
}

export function lastCompletedTrip(trips: Trip[], vehicleId: string) {
  return (
    trips
      .filter((trip) => trip.vehicleId === vehicleId && trip.status === "completed")
      .sort((a, b) => Date.parse(b.endedAt ?? b.scheduledStart) - Date.parse(a.endedAt ?? a.scheduledStart))[0] ?? null
  );
}

export function routeOf(trip: Pick<Trip, "origin" | "destination">) {
  return `${trip.origin} → ${trip.destination}`;
}

export function tripsToday(trips: Trip[]) {
  return trips.filter(
    (trip) => isSameDay(trip.scheduledStart) || (trip.startedAt ? isSameDay(trip.startedAt) : false),
  );
}

export function soonestDocument(vehicle: Vehicle) {
  return [...vehicle.documents].sort((a, b) => a.expiresOn.localeCompare(b.expiresOn))[0] ?? null;
}
