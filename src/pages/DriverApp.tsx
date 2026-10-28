import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FleetMap } from "../components/FleetMap";
import { Pill } from "../components/ui";
import { ago, daysUntil, inr, km, label, stamp, when } from "../lib/format";
import { buildAlerts, jobTone } from "../lib/metrics";
import { useFleet } from "../store/fleet";
import type { ExpenseCategory } from "../types";

export function DriverApp() {
  const fleet = useFleet();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"trips" | "fuel" | "alerts">("trips");
  const user = fleet.sessionUser;
  const driver = fleet.drivers.find((item) => item.id === user?.driverId) ?? null;
  const vehicle = fleet.vehicles.find((item) => item.driverId === driver?.id) ?? null;
  const mine = fleet.trips
    .filter((trip) => trip.driverId === driver?.id)
    .sort((a, b) => rank(a.status) - rank(b.status) || Date.parse(a.scheduledStart) - Date.parse(b.scheduledStart));
  const live = mine.find((trip) => trip.status === "in_progress") ?? null;
  const pings = vehicle ? [...(fleet.trails[vehicle.id] ?? [])].slice(-4).reverse() : [];
  const notices = fleet.notices.filter((notice) => notice.userId === user?.id);
  useEffect(() => {
    document.title = "Driver · Samvanta Fleet";
  }, []);
  const alerts = driver && vehicle ? buildAlerts([vehicle], [driver], fleet.maintenance.filter((job) => job.vehicleId === vehicle.id)) : [];

  return (
    <div className="drive-desk">
      <section className="drive-visual">
        <div className="caption">
          <span className="kicker on-dark">Driver application</span>
          <h1>On the road</h1>
          <p>Assigned trips, phone GPS, fuel, expenses, and maintenance alerts. Signed in as {user?.name}.</p>
        </div>
      </section>
      <section className="phone">
        <header className="phone-top">
          <div>
            <span className="kicker">Samvanta Fleet</span>
            <strong style={{ display: "block" }}>{driver?.name ?? "Driver"}</strong>
          </div>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              fleet.logout();
              navigate("/login");
            }}
          >
            Sign out
          </button>
        </header>
        <div className="phone-body">
          {tab === "trips" ? (
            <>
              {vehicle ? (
                <section className="gps-card">
                  <div>
                    <span className="plate">{vehicle.regNo}</span>
                    <span className="sub">
                      {vehicle.make} {vehicle.model} · {km(vehicle.odometer)}
                    </span>
                  </div>
                  {live ? (
                    <>
                      <div>
                        <span className="live-dot" /> Phone GPS reporting · {Math.round(vehicle.speedKmh)} km/h · {ago(vehicle.lastSeen)}
                      </div>
                      <div className="driver-map">
                        <FleetMap
                          vehicles={[vehicle]}
                          trails={fleet.trails}
                          selectedId={vehicle.id}
                          onSelect={() => undefined}
                          follow
                        />
                      </div>
                      <ul className="ping-list">
                        {pings.map((ping) => (
                          <li key={ping.at}>
                            {stamp(ping.at)} · {Math.round(ping.speedKmh)} km/h · {label(ping.source)}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="note">GPS reporting starts when you start a trip.</p>
                  )}
                </section>
              ) : (
                <p className="empty">No vehicle is assigned to you.</p>
              )}
              {mine.map((trip) => (
                <article className="trip-card" key={trip.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span className="mono">{trip.code}</span>
                    <Pill tone={trip.status}>{label(trip.status)}</Pill>
                  </div>
                  <h2>{trip.origin}</h2>
                  <p className="note">
                    to {trip.destination} · {km(trip.distanceKm)} · {trip.purpose}
                  </p>
                  <p className="note">{when(trip.scheduledStart)}</p>
                  {trip.status === "scheduled" ? (
                    <button type="button" className="btn primary" onClick={() => fleet.startTrip(trip.id)}>
                      Start trip
                    </button>
                  ) : null}
                  {trip.status === "in_progress" ? (
                    <button type="button" className="btn primary" onClick={() => fleet.completeTrip(trip.id)}>
                      End trip
                    </button>
                  ) : null}
                </article>
              ))}
            </>
          ) : null}
          {tab === "fuel" && driver && vehicle ? (
            <FuelPanel vehicleId={vehicle.id} driverId={driver.id} odometer={vehicle.odometer} />
          ) : null}
          {tab === "alerts" ? (
            <>
              {driver ? (
                <article className="trip-card">
                  <strong>Licence</strong>
                  <p className="note">
                    {driver.licenseNo} · {daysUntil(driver.licenseExpiry) < 0 ? "expired" : `${daysUntil(driver.licenseExpiry)} days left`}
                  </p>
                </article>
              ) : null}
              {alerts.map((alert) => (
                <article className="trip-card" key={alert.id}>
                  <strong>{alert.title}</strong>
                  <p className="note">{alert.detail}</p>
                </article>
              ))}
              {fleet.maintenance
                .filter((job) => job.vehicleId === vehicle?.id && jobTone(job) !== "completed")
                .map((job) => (
                  <article className="trip-card" key={job.id}>
                    <strong>{job.title}</strong>
                    <p className="note">{job.notes || "Scheduled service"} · due {job.dueOn}</p>
                  </article>
                ))}
              {notices.map((notice) => (
                <article className="trip-card" key={notice.id}>
                  <strong>{notice.title}</strong>
                  <p className="note">
                    {notice.body} · {when(notice.at)}
                  </p>
                </article>
              ))}
              {notices.some((notice) => !notice.read) ? (
                <button type="button" className="btn" onClick={fleet.markNoticesRead}>
                  Mark alerts read
                </button>
              ) : null}
            </>
          ) : null}
        </div>
        <nav className="phone-nav">
          {(["trips", "fuel", "alerts"] as const).map((item) => (
            <button key={item} type="button" aria-pressed={tab === item} onClick={() => setTab(item)}>
              {item === "trips" ? "Trips" : item === "fuel" ? "Fuel" : "Alerts"}
            </button>
          ))}
        </nav>
      </section>
    </div>
  );
}

function FuelPanel({ vehicleId, driverId, odometer }: { vehicleId: string; driverId: string; odometer: number }) {
  const { addFuel, addExpense, fuel, expenses } = useFleet();
  const [litres, setLitres] = useState(30);
  const [cost, setCost] = useState(2800);
  const [reading, setReading] = useState(odometer);
  const [station, setStation] = useState("HP HITEC City");
  const [category, setCategory] = useState<ExpenseCategory>("Toll");
  const [amount, setAmount] = useState(200);
  const [note, setNote] = useState("");
  const fills = fuel.filter((entry) => entry.vehicleId === vehicleId).slice(0, 3);
  const costs = expenses.filter((entry) => entry.driverId === driverId).slice(0, 4);

  return (
    <>
      <form
        className="trip-card stack"
        onSubmit={(event) => {
          event.preventDefault();
          addFuel({ vehicleId, driverId, litres, costInr: cost, odometer: reading, station });
        }}
      >
        <strong>Log fuel</strong>
        <label className="field">
          Litres
          <input type="number" min={1} step="0.1" value={litres} onChange={(event) => setLitres(Number(event.target.value))} />
        </label>
        <label className="field">
          Amount (INR)
          <input type="number" min={0} value={cost} onChange={(event) => setCost(Number(event.target.value))} />
        </label>
        <label className="field">
          Odometer
          <input type="number" min={1} value={reading} onChange={(event) => setReading(Number(event.target.value))} />
        </label>
        <label className="field">
          Station
          <input value={station} onChange={(event) => setStation(event.target.value)} />
        </label>
        <button className="btn primary" type="submit">
          Save fuel
        </button>
      </form>
      <form
        className="trip-card stack"
        onSubmit={(event) => {
          event.preventDefault();
          if (addExpense({ vehicleId, driverId, category, amountInr: amount, note })) setNote("");
        }}
      >
        <strong>Log expense</strong>
        <label className="field">
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value as ExpenseCategory)}>
            {["Toll", "Parking", "Repair", "Other"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Amount (INR)
          <input type="number" min={1} value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
        </label>
        <label className="field">
          Note
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Plaza or bay" />
        </label>
        <button className="btn primary" type="submit">
          Save expense
        </button>
      </form>
      <ul className="ping-list">
        {fills.map((entry) => (
          <li key={entry.id}>
            Fuel {entry.litres} L · {inr(entry.costInr)} · {when(entry.at)}
          </li>
        ))}
        {costs.map((entry) => (
          <li key={entry.id}>
            {entry.category} · {inr(entry.amountInr)} · {entry.note}
          </li>
        ))}
      </ul>
    </>
  );
}

function rank(status: string) {
  if (status === "in_progress") return 0;
  if (status === "scheduled") return 1;
  if (status === "completed") return 2;
  return 3;
}
