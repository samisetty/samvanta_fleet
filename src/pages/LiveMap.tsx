import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FleetMap } from "../components/FleetMap";
import { Pill } from "../components/ui";
import { vehicleArt } from "../lib/art";
import { CITIES } from "../data/seed";
import { ago, km, label, stamp, vehicleLabel, vehicleTone, when } from "../lib/format";
import { driverName } from "../lib/lookup";
import { currentTrip, lastCompletedTrip, routeOf } from "../lib/metrics";
import { useFleet } from "../store/fleet";
import type { VehicleStatus } from "../types";

const STATUSES: Array<VehicleStatus | "all"> = ["all", "moving", "idle", "maintenance", "offline"];

export function LiveMapPage() {
  const { vehicles, drivers, trails, trips } = useFleet();
  const [params] = useSearchParams();
  const requested = params.get("vehicle");
  const applied = useRef(false);
  const [city, setCity] = useState("Hyderabad");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (applied.current || !requested) return;
    const vehicle = vehicles.find((item) => item.id === requested);
    if (!vehicle) return;
    applied.current = true;
    setCity(vehicle.city);
    setSelected(vehicle.id);
  }, [requested, vehicles]);

  const inCity = city === "All" ? vehicles : vehicles.filter((vehicle) => vehicle.city === city);
  const visible = inCity.filter((vehicle) => {
    if (status !== "all" && vehicle.status !== status) return false;
    const hay = `${vehicle.regNo} ${vehicle.city} ${driverName(drivers, vehicle.driverId)} ${vehicle.make}`.toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });
  const ordered = useMemo(() => {
    const rank = { moving: 0, idle: 1, maintenance: 2, offline: 3 };
    return [...visible].sort((a, b) => rank[a.status] - rank[b.status] || a.regNo.localeCompare(b.regNo));
  }, [visible]);
  const current = vehicles.find((vehicle) => vehicle.id === selected) ?? null;
  const history = current ? [...(trails[current.id] ?? [])].slice(-5).reverse() : [];
  const movingNow = current ? currentTrip(trips, current.id) : null;
  const lastDone = current ? lastCompletedTrip(trips, current.id) : null;
  const captions = Object.fromEntries(
    vehicles.map((vehicle) => {
      const trip = currentTrip(trips, vehicle.id);
      return [vehicle.id, trip ? `${vehicle.regNo} · ${routeOf(trip)}` : vehicle.regNo];
    }),
  );

  return (
    <div className="live-layout">
      <aside className="live-side">
        <div className="chips">
          {["All", ...CITIES].map((name) => (
            <button key={name} type="button" className="btn" aria-pressed={city === name} onClick={() => setCity(name)}>
              {name === "All" ? "All cities" : name}
            </button>
          ))}
        </div>
        <input className="search" placeholder="Search plate or driver" value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="chips">
          {STATUSES.map((item) => (
            <button key={item} type="button" className="btn" aria-pressed={status === item} onClick={() => setStatus(item)}>
              {item === "all" ? "Any status" : label(item)}
            </button>
          ))}
        </div>
        <div className="live-list">
          {ordered.map((vehicle) => {
            const now = currentTrip(trips, vehicle.id);
            const last = lastCompletedTrip(trips, vehicle.id);
            return (
            <button
              key={vehicle.id}
              type="button"
              className={vehicle.id === selected ? "v-row selected" : "v-row"}
              onClick={() => setSelected(vehicle.id)}
            >
              <img className="v-art" src={vehicleArt(vehicle.type)} alt="" />
              <span>
                <b className="plate">{vehicle.regNo}</b>
                <small>
                  {vehicle.city} · {driverName(drivers, vehicle.driverId)}
                </small>
                {now ? <small className="route-now">{routeOf(now)}</small> : null}
                {last ? <small>Last · {routeOf(last)}</small> : null}
              </span>
              <span>
                <Pill tone={vehicleTone(vehicle)}>{vehicleLabel(vehicle)}</Pill>
                <small>
                  {Math.round(vehicle.speedKmh)} km/h · {ago(vehicle.lastSeen)}
                </small>
              </span>
            </button>
            );
          })}
          {ordered.length === 0 ? <p className="empty">No vehicles match.</p> : null}
        </div>
        {current ? (
          <section className="card detail">
            <h3 className="plate">{current.regNo}</h3>
            <p className="note">
              {current.make} {current.model} · {label(current.locationSource)}
            </p>
            <dl>
              <dt>Driver</dt>
              <dd>{driverName(drivers, current.driverId)}</dd>
              <dt>Last ping</dt>
              <dd>{when(current.lastSeen)}</dd>
              <dt>Speed</dt>
              <dd>{Math.round(current.speedKmh)} km/h</dd>
            </dl>
            <div className="leg">
              <span className="kicker">Moving now</span>
              <p>{movingNow ? routeOf(movingNow) : "Not on a trip"}</p>
            </div>
            <div className="leg">
              <span className="kicker">Last completed</span>
              <p>{lastDone ? routeOf(lastDone) : "None on file"}</p>
              {lastDone ? <small>{when(lastDone.endedAt ?? lastDone.scheduledStart)} · {km(lastDone.actualKm ?? lastDone.distanceKm)}</small> : null}
            </div>
            <span className="kicker">Recent pings</span>
            <ul className="ping-list">
              {history.map((ping) => (
                <li key={ping.at}>
                  {stamp(ping.at)} · {Math.round(ping.speedKmh)} km/h · {label(ping.source)}
                </li>
              ))}
              {history.length === 0 ? <li>History builds as new pings arrive.</li> : null}
            </ul>
          </section>
        ) : null}
      </aside>
      <div className="map-canvas">
        <FleetMap vehicles={inCity} trails={trails} selectedId={selected} onSelect={setSelected} fitKey={city} captions={captions} />
        <p className="map-note">Pins move faster than the speed reading so a city route is visible in about a minute.</p>
      </div>
    </div>
  );
}
