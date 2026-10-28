import { useEffect, useRef } from "react";
import L from "leaflet";
import type { GpsPing, Vehicle } from "../types";

type FleetMapProps = {
  vehicles: Vehicle[];
  trails: Record<string, GpsPing[]>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  follow?: boolean;
  fitKey?: string;
  captions?: Record<string, string>;
};

export function FleetMap({ vehicles, trails, selectedId, onSelect, follow = false, fitKey, captions }: FleetMapProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef(new Map<string, L.Marker>());
  const metaRef = useRef(new Map<string, string>());
  const trailRef = useRef<L.Polyline | null>(null);
  const onSelectRef = useRef(onSelect);
  const flyRef = useRef<string | null>(null);
  const didFollow = useRef(false);
  const vehiclesRef = useRef(vehicles);
  const followRef = useRef(follow);
  const fitKeyRef = useRef(fitKey);
  const selectedRef = useRef(selectedId);
  onSelectRef.current = onSelect;
  vehiclesRef.current = vehicles;
  followRef.current = follow;
  fitKeyRef.current = fitKey;
  selectedRef.current = selectedId;

  useEffect(() => {
    const element = elRef.current;
    if (!element || mapRef.current) return;
    const leafletMap = L.map(element, { zoomControl: true });
    leafletMap.setView([21.2, 78.9], 5);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(leafletMap);
    mapRef.current = leafletMap;
    const onResize = () => leafletMap.invalidateSize();
    window.addEventListener("resize", onResize);
    const timer = window.setTimeout(() => {
      onResize();
      const current = vehiclesRef.current;
      if (followRef.current || selectedRef.current || !fitKeyRef.current || current.length === 0) return;
      leafletMap.fitBounds(
        L.latLngBounds(current.map((vehicle) => [vehicle.lat, vehicle.lng] as [number, number])).pad(0.35),
        { maxZoom: 12 },
      );
    }, 200);
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(timer);
      leafletMap.remove();
      mapRef.current = null;
      markersRef.current.clear();
      metaRef.current.clear();
      trailRef.current = null;
    };
  }, []);

  useEffect(() => {
    didFollow.current = false;
    flyRef.current = null;
  }, [selectedId, follow]);

  useEffect(() => {
    const leafletMap = mapRef.current;
    if (!leafletMap) return;
    const seen = new Set<string>();
    for (const vehicle of vehicles) {
      seen.add(vehicle.id);
      const selected = vehicle.id === selectedId;
      const hold = vehicle.status === "moving" && vehicle.speedKmh < 1;
      const caption = captions?.[vehicle.id] ?? vehicle.regNo;
      const signature = `${vehicle.status}:${selected}:${hold}:${caption}`;
      const icon = L.divIcon({
        className: "vh-icon",
        html: `<span class="pin st-${vehicle.status}${selected ? " is-sel" : ""}${hold ? " is-hold" : ""}"><i style="transform:rotate(${vehicle.heading}deg)"></i></span>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      let pin = markersRef.current.get(vehicle.id);
      if (!pin) {
        pin = L.marker([vehicle.lat, vehicle.lng], { icon, zIndexOffset: selected ? 600 : 0 });
        pin.bindTooltip(caption, { direction: "top", offset: [0, -10] });
        pin.on("click", () => onSelectRef.current(vehicle.id));
        pin.addTo(leafletMap);
        markersRef.current.set(vehicle.id, pin);
        metaRef.current.set(vehicle.id, signature);
      } else {
        pin.setLatLng([vehicle.lat, vehicle.lng]);
        pin.setZIndexOffset(selected ? 600 : 0);
        if (metaRef.current.get(vehicle.id) !== signature) {
          pin.setIcon(icon);
          pin.setTooltipContent(caption);
          metaRef.current.set(vehicle.id, signature);
        } else {
          const arrow = pin.getElement()?.querySelector("i");
          if (arrow) (arrow as HTMLElement).style.transform = `rotate(${vehicle.heading}deg)`;
        }
      }
    }
    for (const [id, pin] of markersRef.current) {
      if (!seen.has(id)) {
        pin.remove();
        markersRef.current.delete(id);
        metaRef.current.delete(id);
      }
    }

    trailRef.current?.remove();
    trailRef.current = null;
    const trail = selectedId ? trails[selectedId] : undefined;
    if (trail && trail.length > 1) {
      trailRef.current = L.polyline(
        trail.map((ping) => [ping.lat, ping.lng] as [number, number]),
        { color: "#0e7c66", weight: 3, opacity: 0.85 },
      ).addTo(leafletMap);
    }
  }, [vehicles, selectedId, trails, captions]);

  useEffect(() => {
    const leafletMap = mapRef.current;
    if (!leafletMap || follow || !fitKey || vehicles.length === 0) return;
    const bounds = L.latLngBounds(vehicles.map((vehicle) => [vehicle.lat, vehicle.lng] as [number, number]));
    leafletMap.fitBounds(bounds.pad(0.35), { maxZoom: 12, animate: true });
  }, [fitKey, follow, vehicles.length]);

  useEffect(() => {
    const leafletMap = mapRef.current;
    if (!leafletMap || follow || !selectedId) return;
    if (flyRef.current === selectedId) return;
    const vehicle = vehicles.find((item) => item.id === selectedId);
    if (!vehicle) return;
    flyRef.current = selectedId;
    leafletMap.flyTo([vehicle.lat, vehicle.lng], 12, { duration: 0.6 });
  }, [selectedId, follow, vehicles]);

  useEffect(() => {
    const leafletMap = mapRef.current;
    if (!leafletMap || !follow || !selectedId) return;
    const vehicle = vehicles.find((item) => item.id === selectedId);
    if (!vehicle) return;
    if (!didFollow.current) {
      leafletMap.setView([vehicle.lat, vehicle.lng], 13);
      didFollow.current = true;
      return;
    }
    leafletMap.panTo([vehicle.lat, vehicle.lng], { animate: true, duration: 0.8 });
  }, [follow, selectedId, vehicles]);

  return <div ref={elRef} className="leaflet-wrap" />;
}
