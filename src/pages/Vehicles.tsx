import { useMemo, useState } from "react";
import { Modal, PageHead, Pill } from "../components/ui";
import { CITIES } from "../data/seed";
import { day, daysUntil, km, vehicleLabel, vehicleTone, when } from "../lib/format";
import { driverName } from "../lib/lookup";
import { vehicleArt } from "../lib/art";
import { currentTrip, lastCompletedTrip, routeOf, soonestDocument } from "../lib/metrics";
import { useFleet } from "../store/fleet";
import type { FuelType, VehicleStatus, VehicleType } from "../types";

export function VehiclesPage() {
  const { vehicles, drivers, trips, assignDriver, setVehicleStatus, addVehicle } = useFleet();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const vehicle = vehicles.find((item) => item.id === selected) ?? null;
  const movingNow = vehicle ? currentTrip(trips, vehicle.id) : null;
  const lastDone = vehicle ? lastCompletedTrip(trips, vehicle.id) : null;
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vehicles.filter((item) => `${item.regNo} ${item.city} ${item.make} ${item.model} ${driverName(drivers, item.driverId)}`.toLowerCase().includes(q));
  }, [vehicles, drivers, query]);

  return (
    <>
      <PageHead title="Vehicles" lede="Registration, status, assignment, and documents.">
        <input className="search" placeholder="Search" value={query} onChange={(event) => setQuery(event.target.value)} />
        <button type="button" className="btn primary" onClick={() => setOpen(true)}>
          Add vehicle
        </button>
      </PageHead>
      <div className={vehicle ? "split" : undefined}>
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>City</th>
                <th>Driver</th>
                <th>Status</th>
                <th>Odometer</th>
                <th>Document</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const doc = soonestDocument(item);
                const days = doc ? daysUntil(doc.expiresOn) : 99;
                return (
                  <tr key={item.id} className={item.id === selected ? "click selected" : "click"} onClick={() => setSelected(item.id)}>
                    <td>
                      <div className="vehicle-cell">
                        <img className="v-art" src={vehicleArt(item.type)} alt="" />
                        <div>
                          <span className="plate">{item.regNo}</span>
                          <span className="sub">
                            {item.year} {item.make} {item.model}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>{item.city}</td>
                    <td>{driverName(drivers, item.driverId)}</td>
                    <td>
                      <Pill tone={vehicleTone(item)}>{vehicleLabel(item)}</Pill>
                    </td>
                    <td>{km(item.odometer)}</td>
                    <td className={days <= 30 ? "warn" : undefined}>{doc ? `${doc.name} · ${days < 0 ? "expired" : `${days}d`}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 ? <p className="empty">No vehicles match.</p> : null}
        </div>
        {vehicle ? (
          <aside className="card detail">
            <img className="detail-art" src={vehicleArt(vehicle.type)} alt="" />
            <h3 className="plate">{vehicle.regNo}</h3>
            <p className="note">
              {vehicle.type} · {vehicle.fuelType} · changes save immediately
            </p>
            <label className="field">
              Status
              <select
                value={vehicle.status}
                onChange={(event) => setVehicleStatus(vehicle.id, event.target.value as VehicleStatus)}
              >
                <option value="idle">Idle</option>
                <option value="moving">Moving</option>
                <option value="maintenance">In workshop</option>
                <option value="offline">Offline</option>
              </select>
            </label>
            <label className="field">
              Assigned driver
              <select
                value={vehicle.driverId ?? ""}
                onChange={(event) => assignDriver(vehicle.id, event.target.value || null)}
              >
                <option value="">Unassigned</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                  </option>
                ))}
              </select>
            </label>
            <dl>
              <dt>Last ping</dt>
              <dd>{vehicleLabel(vehicle)} · {Math.round(vehicle.speedKmh)} km/h</dd>
              <dt>Source</dt>
              <dd>{vehicle.locationSource === "phone" ? "Phone GPS" : "Telematics"}</dd>
            </dl>
            <span className="kicker">Documents</span>
            <ul className="ping-list">
              {vehicle.documents.map((doc) => (
                <li key={doc.id}>
                  {doc.name} · {doc.number} · {day(doc.expiresOn)}
                </li>
              ))}
            </ul>
            <div className="leg">
              <span className="kicker">Moving now</span>
              <p>{movingNow ? routeOf(movingNow) : "Not on a trip"}</p>
            </div>
            <div className="leg">
              <span className="kicker">Last completed</span>
              {lastDone ? (
                <>
                  <p>{routeOf(lastDone)}</p>
                  <small>{when(lastDone.endedAt ?? lastDone.scheduledStart)} · {km(lastDone.actualKm ?? lastDone.distanceKm)}</small>
                </>
              ) : (
                <p>None on file</p>
              )}
            </div>
          </aside>
        ) : null}
      </div>
      {open ? <VehicleForm onClose={() => setOpen(false)} onCreate={addVehicle} /> : null}
    </>
  );
}

function VehicleForm({ onClose, onCreate }: { onClose: () => void; onCreate: ReturnType<typeof useFleet>["addVehicle"] }) {
  const [regNo, setRegNo] = useState("");
  const [city, setCity] = useState<string>(CITIES[0] ?? "Hyderabad");
  const [type, setType] = useState<VehicleType>("Van");
  const [make, setMake] = useState("Tata");
  const [model, setModel] = useState("Winger");
  const [year, setYear] = useState(2024);
  const [fuelType, setFuelType] = useState<FuelType>("Diesel");
  const [odometer, setOdometer] = useState(12000);

  return (
    <Modal title="Add vehicle" onClose={onClose}>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          if (onCreate({ regNo, city, type, make, model, year, fuelType, odometer })) onClose();
        }}
      >
        <div className="form-grid">
          <label className="field">
            Registration
            <input value={regNo} onChange={(event) => setRegNo(event.target.value)} required placeholder="TS 09 AB 1234" />
          </label>
          <label className="field">
            City
            <select value={city} onChange={(event) => setCity(event.target.value)}>
              {CITIES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Type
            <select value={type} onChange={(event) => setType(event.target.value as VehicleType)}>
              {["Truck", "Van", "Car", "Bus"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Fuel
            <select value={fuelType} onChange={(event) => setFuelType(event.target.value as FuelType)}>
              {["Diesel", "Petrol", "CNG"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Make
            <input value={make} onChange={(event) => setMake(event.target.value)} required />
          </label>
          <label className="field">
            Model
            <input value={model} onChange={(event) => setModel(event.target.value)} required />
          </label>
          <label className="field">
            Year
            <input type="number" min={2012} max={2026} value={year} onChange={(event) => setYear(Number(event.target.value))} />
          </label>
          <label className="field">
            Odometer (km)
            <input type="number" min={0} value={odometer} onChange={(event) => setOdometer(Number(event.target.value))} />
          </label>
        </div>
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary">
            Save vehicle
          </button>
        </div>
      </form>
    </Modal>
  );
}
