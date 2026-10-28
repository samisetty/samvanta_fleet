import { useMemo, useState } from "react";
import { Modal, PageHead, Pill } from "../components/ui";
import { PLACES } from "../data/seed";
import { buildRoute, routeLengthKm } from "../lib/geo";
import { km, label, localInputValue, when } from "../lib/format";
import { driverName, vehicleReg } from "../lib/lookup";
import { useFleet } from "../store/fleet";
import type { TripStatus } from "../types";

const FILTERS: Array<TripStatus | "all"> = ["all", "scheduled", "in_progress", "completed", "cancelled"];

export function TripsPage() {
  const fleet = useFleet();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [open, setOpen] = useState(false);
  const rows = useMemo(() => {
    return [...fleet.trips]
      .filter((trip) => filter === "all" || trip.status === filter)
      .sort((a, b) => Date.parse(b.scheduledStart) - Date.parse(a.scheduledStart));
  }, [fleet.trips, filter]);

  return (
    <>
      <PageHead title="Trips" lede="Create a trip, assign it, then start, complete, or cancel it.">
        <button type="button" className="btn primary" onClick={() => setOpen(true)}>
          New trip
        </button>
      </PageHead>
      <div className="chips" style={{ marginBottom: 12 }}>
        {FILTERS.map((item) => (
          <button key={item} type="button" className="btn" aria-pressed={filter === item} onClick={() => setFilter(item)}>
            {item === "all" ? "All" : label(item)}
          </button>
        ))}
      </div>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Trip</th>
              <th>Route</th>
              <th>When</th>
              <th>Vehicle</th>
              <th>Driver</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((trip) => (
              <tr key={trip.id}>
                <td>
                  <span className="mono">{trip.code}</span>
                  <span className="sub">{trip.purpose}</span>
                </td>
                <td>
                  {trip.origin}
                  <span className="sub">
                    to {trip.destination} · {km(trip.actualKm ?? trip.distanceKm)}
                  </span>
                </td>
                <td>{when(trip.startedAt ?? trip.scheduledStart)}</td>
                <td className="plate">{vehicleReg(fleet.vehicles, trip.vehicleId)}</td>
                <td>{driverName(fleet.drivers, trip.driverId)}</td>
                <td>
                  <Pill tone={trip.status}>{label(trip.status)}</Pill>
                </td>
                <td>
                  {trip.status === "scheduled" ? (
                    <button type="button" className="btn primary" onClick={() => fleet.startTrip(trip.id)}>
                      Start
                    </button>
                  ) : null}
                  {trip.status === "in_progress" ? (
                    <button type="button" className="btn primary" onClick={() => fleet.completeTrip(trip.id)}>
                      End
                    </button>
                  ) : null}
                  {trip.status === "scheduled" || trip.status === "in_progress" ? (
                    <button type="button" className="btn danger" onClick={() => fleet.cancelTrip(trip.id)}>
                      Cancel
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="empty">No trips in this view.</p> : null}
      </div>
      {open ? <TripForm onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function TripForm({ onClose }: { onClose: () => void }) {
  const { vehicles, drivers, createTrip } = useFleet();
  const ready = vehicles.filter((vehicle) => vehicle.status === "idle" || vehicle.status === "moving");
  const [vehicleId, setVehicleId] = useState(ready[0]?.id ?? "");
  const vehicle = vehicles.find((item) => item.id === vehicleId);
  const [driverId, setDriverId] = useState(vehicle?.driverId ?? drivers[0]?.id ?? "");
  const origins = PLACES.filter((place) => !vehicle || place.city === vehicle.city);
  const [originId, setOriginId] = useState(origins[0]?.id ?? PLACES[0]?.id ?? "");
  const [destinationId, setDestinationId] = useState(origins[1]?.id ?? PLACES[1]?.id ?? "");
  const [purpose, setPurpose] = useState("Delivery");
  const [scheduledStart, setScheduledStart] = useState(localInputValue(60));
  const origin = PLACES.find((place) => place.id === originId);
  const destination = PLACES.find((place) => place.id === destinationId);
  const distance =
    origin && destination && origin.id !== destination.id
      ? Math.round(routeLengthKm(buildRoute(origin, destination)))
      : 0;

  return (
    <Modal title="New trip" onClose={onClose}>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          if (createTrip({ vehicleId, driverId, originId, destinationId, purpose, scheduledStart })) onClose();
        }}
      >
        <div className="form-grid">
          <label className="field">
            Vehicle
            <select
              value={vehicleId}
              onChange={(event) => {
                const next = event.target.value;
                setVehicleId(next);
                const chosen = vehicles.find((item) => item.id === next);
                if (chosen?.driverId) setDriverId(chosen.driverId);
                const place = PLACES.find((item) => item.city === chosen?.city);
                const other = PLACES.find((item) => item.city === chosen?.city && item.id !== place?.id);
                if (place) setOriginId(place.id);
                if (other) setDestinationId(other.id);
              }}
            >
              {ready.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.regNo} · {item.city}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Driver
            <select value={driverId} onChange={(event) => setDriverId(event.target.value)}>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Origin
            <select value={originId} onChange={(event) => setOriginId(event.target.value)}>
              {PLACES.map((place) => (
                <option key={place.id} value={place.id}>
                  {place.city} · {place.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Destination
            <select value={destinationId} onChange={(event) => setDestinationId(event.target.value)}>
              {PLACES.map((place) => (
                <option key={place.id} value={place.id}>
                  {place.city} · {place.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Purpose
            <input value={purpose} onChange={(event) => setPurpose(event.target.value)} required />
          </label>
          <label className="field">
            Start
            <input type="datetime-local" value={scheduledStart} onChange={(event) => setScheduledStart(event.target.value)} required />
          </label>
        </div>
        <p className="note">Estimated distance {km(distance)}.</p>
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" type="submit">
            Schedule trip
          </button>
        </div>
      </form>
    </Modal>
  );
}
