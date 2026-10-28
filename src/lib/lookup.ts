import type { Driver, Vehicle } from "../types";

export function driverName(drivers: Driver[], id: string | null) {
  if (!id) return "Unassigned";
  return drivers.find((driver) => driver.id === id)?.name ?? "Unassigned";
}

export function vehicleReg(vehicles: Vehicle[], id: string) {
  return vehicles.find((vehicle) => vehicle.id === id)?.regNo ?? "—";
}
