import { haversineKm, pointAlong } from "../lib/geo";
import type { FleetState } from "../types";

export function advanceFleet(state: FleetState, seconds = 1): FleetState {
  const now = new Date().toISOString();
  let moved = false;
  const trails = { ...state.trails };
  const vehicles = state.vehicles.map((vehicle) => {
    if (vehicle.status !== "moving" || vehicle.route.length < 2) return vehicle;
    if (!vehicle.loop && vehicle.progress >= 1) {
      moved = true;
      return { ...vehicle, speedKmh: 0, lastSeen: now };
    }
    moved = true;
    let progress = vehicle.progress + seconds / Math.max(20, vehicle.animSeconds);
    let speedKmh = vehicle.cruiseKmh;
    if (vehicle.loop) progress = progress % 1;
    else if (progress >= 1) {
      progress = 1;
      speedKmh = 0;
    }
    const { point, heading } = pointAlong(vehicle.route, progress);
    const next = {
      ...vehicle,
      progress,
      lat: point.lat,
      lng: point.lng,
      heading,
      speedKmh,
      lastSeen: now,
    };
    const prev = trails[vehicle.id] ?? [];
    const last = prev[prev.length - 1];
    if (!last || haversineKm(last, point) >= 0.05) {
      trails[vehicle.id] = [
        ...prev,
        { at: now, lat: point.lat, lng: point.lng, speedKmh, source: vehicle.locationSource },
      ].slice(-48);
    }
    return next;
  });
  if (!moved) return state;
  return { ...state, vehicles, trails };
}
