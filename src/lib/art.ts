import type { VehicleType } from "../types";

const VEHICLE_ART: Record<VehicleType, string> = {
  Truck: "/art/vehicle-truck.jpg?v=2",
  Van: "/art/vehicle-van.jpg?v=2",
  Car: "/art/vehicle-car.jpg?v=2",
  Bus: "/art/vehicle-bus.jpg?v=2",
};

export function vehicleArt(type: VehicleType) {
  return VEHICLE_ART[type];
}
