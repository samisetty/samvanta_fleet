import { Link } from "react-router-dom";
import { FleetMap } from "../components/FleetMap";
import { PageHead, Pill } from "../components/ui";
import { ago, inr, isoDate, km, label, when } from "../lib/format";
import { driverName } from "../lib/lookup";
import { buildAlerts, currentTrip, fuelSpend, lastCompletedTrip, routeOf, tripsToday } from "../lib/metrics";
import { useFleet } from "../store/fleet";
import { useState } from "react";

export function Dashboard() {
  const fleet = useFleet();
  const [selected, setSelected] = useState<string | null>(null);
  const { vehicles, trips, fuel, maintenance, drivers, trails } = fleet;
  const moving = vehicles.filter((vehicle) => vehicle.status === "moving").length;
  const live = trips.filter((trip) => trip.status === "in_progress").length;
  const openJobs = maintenance.filter((job) => job.status !== "completed");
  const overdue = openJobs.filter((job) => job.dueOn < isoDate(0));
  const today = tripsToday(trips);
  const alerts = buildAlerts(vehicles, drivers, maintenance).slice(0, 6);
  const hyd = vehicles.filter((vehicle) => vehicle.city === "Hyderabad");
  const movingVehicles = vehicles
    .filter((vehicle) => vehicle.status === "moving")
    .sort((a, b) => Number(Boolean(currentTrip(trips, b.id))) - Number(Boolean(currentTrip(trips, a.id))) || a.regNo.localeCompare(b.regNo));
  const captions = Object.fromEntries(
    hyd.map((vehicle) => {
      const trip = currentTrip(trips, vehicle.id);
      return [vehicle.id, trip ? `${vehicle.regNo} · ${routeOf(trip)}` : vehicle.regNo];
    }),
  );
  const total = vehicles.length || 1;
  const share = (status: string) => (vehicles.filter((vehicle) => vehicle.status === status).length / total) * 100;

  return (
    <>
      <div className="hero-banner">
        <img src="/art/banner-fleet.jpg?v=2" alt="Trucks, a van, a car, and a bus on a highway" />
        <span>{vehicles.length} vehicles on the road network</span>
      </div>
      <PageHead
        title="Overview"
        lede={`${vehicles.length} vehicles across ${[...new Set(vehicles.map((vehicle) => vehicle.city))].join(", ")}.`}
      >
        <Link className="btn" to="/map">
          Open live map
        </Link>
      </PageHead>
      <section className="stats">
        <article className="stat">
          <span className="kicker">Moving</span>
          <strong>{moving}</strong>
          <em>of {vehicles.length} vehicles</em>
        </article>
        <article className="stat">
          <span className="kicker">Live trips</span>
          <strong>{live}</strong>
          <em>{today.length} touched today</em>
        </article>
        <article className="stat">
          <span className="kicker">Fuel, 30 days</span>
          <strong>{inr(fuelSpend(fuel, 30))}</strong>
          <em>{fuel.length} fills on file</em>
        </article>
        <article className="stat">
          <span className="kicker">Overdue jobs</span>
          <strong>{overdue.length}</strong>
          <em>{openJobs.length} maintenance jobs open</em>
        </article>
        <article className="stat">
          <span className="kicker">Utilization</span>
          <strong>{Math.round((moving / total) * 100)}%</strong>
          <em>vehicles with a moving fix</em>
        </article>
      </section>
      <div className="mix" aria-hidden="true">
        <span className="moving" style={{ width: `${share("moving")}%` }} />
        <span className="idle" style={{ width: `${share("idle")}%` }} />
        <span className="maintenance" style={{ width: `${share("maintenance")}%` }} />
        <span className="offline" style={{ width: `${share("offline")}%` }} />
      </div>
      <div className="legend">
        <span><i className="moving" /> Moving {vehicles.filter((v) => v.status === "moving").length}</span>
        <span><i className="idle" /> Idle {vehicles.filter((v) => v.status === "idle").length}</span>
        <span><i className="maintenance" /> Workshop {vehicles.filter((v) => v.status === "maintenance").length}</span>
        <span><i className="offline" /> Offline {vehicles.filter((v) => v.status === "offline").length}</span>
      </div>
      <div className="dash-grid">
        <section className="card">
          <h2>Hyderabad</h2>
          <p className="note">City view of the demo hub. Pins on a trip slide across the route in about a minute.</p>
          <div className="map-frame">
            <FleetMap vehicles={hyd} trails={trails} selectedId={selected} onSelect={setSelected} fitKey="Hyderabad" captions={captions} />
          </div>
        </section>
        <section className="card">
          <h2>Needs attention</h2>
          <p className="note">Documents, licences, offline units, and maintenance.</p>
          <ul className="alert-list">
            {alerts.map((alert) => (
              <li key={alert.id} className={alert.level === "high" ? "level-high" : undefined}>
                <strong>{alert.title}</strong>
                <span>{alert.detail}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className="card">
        <h2>Where vehicles are moving</h2>
        <p className="note">The trip in progress, and the last one that vehicle finished.</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Moving now</th>
                <th>Last completed</th>
              </tr>
            </thead>
            <tbody>
              {movingVehicles.map((vehicle) => {
                const now = currentTrip(trips, vehicle.id);
                const last = lastCompletedTrip(trips, vehicle.id);
                return (
                  <tr key={vehicle.id}>
                    <td>
                      <Link to={`/map?vehicle=${vehicle.id}`}>{vehicle.regNo}</Link>
                      <span className="sub">{vehicle.city} · {driverName(drivers, vehicle.driverId)}</span>
                    </td>
                    <td>{now ? routeOf(now) : "Not on a trip"}</td>
                    <td>
                      {last ? routeOf(last) : "None on file"}
                      {last ? <span className="sub">{when(last.endedAt ?? last.scheduledStart)} · {km(last.actualKm ?? last.distanceKm)}</span> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card">
        <h2>Today’s trips</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Trip</th>
                <th>Route</th>
                <th>Vehicle</th>
                <th>Driver</th>
                <th>Status</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {today.map((trip) => {
                const vehicle = vehicles.find((item) => item.id === trip.vehicleId);
                return (
                  <tr key={trip.id}>
                    <td className="mono">{trip.code}</td>
                    <td>
                      {trip.origin}
                      <span className="sub">to {trip.destination} · {km(trip.distanceKm)}</span>
                    </td>
                    <td>
                      <Link to={`/map?vehicle=${trip.vehicleId}`}>{vehicle?.regNo}</Link>
                      <span className="sub">{vehicle ? `${ago(vehicle.lastSeen)} · ${Math.round(vehicle.speedKmh)} km/h` : ""}</span>
                    </td>
                    <td>{driverName(drivers, trip.driverId)}</td>
                    <td>
                      <Pill tone={trip.status}>{label(trip.status)}</Pill>
                    </td>
                    <td>{when(trip.startedAt ?? trip.scheduledStart)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
