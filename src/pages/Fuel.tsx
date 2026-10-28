import { useState } from "react";
import { Modal, PageHead } from "../components/ui";
import { inr, km, when } from "../lib/format";
import { driverName, vehicleReg } from "../lib/lookup";
import { efficiencyRows, fuelSpend } from "../lib/metrics";
import { useFleet } from "../store/fleet";

export function FuelPage() {
  const fleet = useFleet();
  const [open, setOpen] = useState(false);
  const spend = fuelSpend(fleet.fuel, 30);
  const litres = fleet.fuel.reduce((sum, entry) => sum + entry.litres, 0);
  const rows = efficiencyRows(fleet.vehicles, fleet.fuel);
  const average = rows.length ? rows.reduce((sum, row) => sum + row.kmPerL, 0) / rows.length : 0;

  return (
    <>
      <div className="page-scene">
        <img src="/art/scene-fuel.jpg?v=2" alt="Fuel nozzle filling a white van" />
        <PageHead title="Fuel" lede="Quantity, cost, odometer, and kilometres per litre between fills.">
        <button type="button" className="btn primary" onClick={() => setOpen(true)}>
          Log fuel
        </button>
      </PageHead>
      </div>
      <section className="stats">
        <article className="stat">
          <span className="kicker">Spend, 30 days</span>
          <strong>{inr(spend)}</strong>
          <em>All recorded fills</em>
        </article>
        <article className="stat">
          <span className="kicker">Litres</span>
          <strong>{Math.round(litres)}</strong>
          <em>On file in this demo</em>
        </article>
        <article className="stat">
          <span className="kicker">Fleet average</span>
          <strong>{average ? average.toFixed(1) : "—"}</strong>
          <em>km per litre</em>
        </article>
      </section>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Vehicle</th>
              <th>Station</th>
              <th>Litres</th>
              <th>Cost</th>
              <th>Odometer</th>
              <th>km/L</th>
            </tr>
          </thead>
          <tbody>
            {fleet.fuel.map((entry) => {
              const eff = rows.find((row) => row.vehicle.id === entry.vehicleId);
              return (
                <tr key={entry.id}>
                  <td>{when(entry.at)}</td>
                  <td className="plate">{vehicleReg(fleet.vehicles, entry.vehicleId)}</td>
                  <td>{entry.station}</td>
                  <td>{entry.litres}</td>
                  <td>{inr(entry.costInr)}</td>
                  <td>{km(entry.odometer)}</td>
                  <td>{eff ? eff.kmPerL.toFixed(1) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <section className="card" style={{ marginTop: 12 }}>
        <h2>Driver expenses</h2>
        <p className="note">Tolls, parking, and other costs logged from the road.</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Vehicle</th>
                <th>Driver</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {fleet.expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{when(expense.at)}</td>
                  <td className="plate">{vehicleReg(fleet.vehicles, expense.vehicleId)}</td>
                  <td>{driverName(fleet.drivers, expense.driverId)}</td>
                  <td>{expense.category}</td>
                  <td>{inr(expense.amountInr)}</td>
                  <td>{expense.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {fleet.expenses.length === 0 ? <p className="empty">No expenses yet.</p> : null}
        </div>
      </section>
      {open ? <FuelForm onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function FuelForm({ onClose }: { onClose: () => void }) {
  const { vehicles, addFuel } = useFleet();
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? "");
  const vehicle = vehicles.find((item) => item.id === vehicleId);
  const [litres, setLitres] = useState(40);
  const [costInr, setCost] = useState(3700);
  const [odometer, setOdometer] = useState(vehicle?.odometer ?? 0);
  const [station, setStation] = useState("HP fuel station");

  return (
    <Modal title="Log fuel" onClose={onClose}>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          if (addFuel({ vehicleId, driverId: vehicle?.driverId ?? null, litres, costInr, odometer, station })) onClose();
        }}
      >
        <label className="field">
          Vehicle
          <select
            value={vehicleId}
            onChange={(event) => {
              const next = event.target.value;
              setVehicleId(next);
              const chosen = vehicles.find((item) => item.id === next);
              if (chosen) setOdometer(chosen.odometer);
            }}
          >
            {vehicles.map((item) => (
              <option key={item.id} value={item.id}>
                {item.regNo} · {item.city}
              </option>
            ))}
          </select>
        </label>
        <div className="form-grid">
          <label className="field">
            Litres
            <input type="number" min={1} step="0.1" value={litres} onChange={(event) => setLitres(Number(event.target.value))} />
          </label>
          <label className="field">
            Cost (INR)
            <input type="number" min={0} value={costInr} onChange={(event) => setCost(Number(event.target.value))} />
          </label>
          <label className="field">
            Odometer
            <input type="number" min={1} value={odometer} onChange={(event) => setOdometer(Number(event.target.value))} />
          </label>
          <label className="field">
            Station
            <input value={station} onChange={(event) => setStation(event.target.value)} required />
          </label>
        </div>
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" type="submit">
            Save fuel
          </button>
        </div>
      </form>
    </Modal>
  );
}
