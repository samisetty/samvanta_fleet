import type { LatLng } from "../types";

export function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function routeLengthKm(route: LatLng[]) {
  let total = 0;
  for (let i = 1; i < route.length; i += 1) {
    const prev = route[i - 1];
    const next = route[i];
    if (prev && next) total += haversineKm(prev, next);
  }
  return total;
}

export function bearing(a: LatLng, b: LatLng) {
  if (Math.abs(a.lat - b.lat) < 1e-7 && Math.abs(a.lng - b.lng) < 1e-7) return 0;
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x =
    Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
    Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return (deg + 360) % 360;
}

export function buildRoute(a: LatLng, b: LatLng, bend = 0.28): LatLng[] {
  const mid = {
    lat: (a.lat + b.lat) / 2 + (b.lng - a.lng) * bend * 0.35,
    lng: (a.lng + b.lng) / 2 + (a.lat - b.lat) * bend * 0.35,
  };
  const points: LatLng[] = [];
  const steps = 28;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    points.push({
      lat: (1 - t) * (1 - t) * a.lat + 2 * (1 - t) * t * mid.lat + t * t * b.lat,
      lng: (1 - t) * (1 - t) * a.lng + 2 * (1 - t) * t * mid.lng + t * t * b.lng,
    });
  }
  return points;
}

export function loopRoute(center: LatLng, radius = 0.02): LatLng[] {
  const ring: LatLng[] = [];
  const steps = 28;
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * Math.PI * 2;
    ring.push({
      lat: center.lat + Math.sin(t) * radius,
      lng: center.lng + Math.cos(t) * radius * 1.15,
    });
  }
  return ring;
}

export function pointAlong(route: LatLng[], progress: number) {
  const first = route[0];
  if (!first || route.length === 1) return { point: first ?? { lat: 0, lng: 0 }, heading: 0 };
  const clamped = Math.min(1, Math.max(0, progress));
  const scaled = clamped * (route.length - 1);
  const index = Math.min(route.length - 2, Math.floor(scaled));
  const fraction = scaled - index;
  const start = route[index] ?? first;
  const end = route[index + 1] ?? start;
  return {
    point: {
      lat: start.lat + (end.lat - start.lat) * fraction,
      lng: start.lng + (end.lng - start.lng) * fraction,
    },
    heading: bearing(start, end),
  };
}

function rad(deg: number) {
  return (deg * Math.PI) / 180;
}
