import { useMemo, useState } from "react";
import { Modal, PageHead, Pill } from "../components/ui";
import { CITIES } from "../data/seed";
import { day, daysUntil, label } from "../lib/format";
import { dutyOf } from "../lib/metrics";
import { useFleet } from "../store/fleet";

export function DriversPage() {
  const { drivers, vehicles, trips, addDriver, assignDriver } = useFleet();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const driver = drivers.find((item) => item.id === selected) ?? null;
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return drivers.filter((item) => `${item.name} ${item.city} ${item.licenseNo} ${item.phone}`.toLowerCase().includes(q));
  }, [drivers, query]);

  return (
    <>
      <PageHead title="Drivers" lede="Profiles, licences, and the vehicle each person is assigned to.">
        <input className="search" placeholder="Search" value={query} onChange={(event) => setQuery(event.target.value)} />
        <button type="button" className="btn primary" onClick={() => setOpen(true)}>
          Add driver
        </button>
      </PageHead>
      <div className={driver ? "split" : undefined}>
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Driver</th>
                <th>City</th>
                <th>Licence</th>
                <th>Expires</th>
                <th>Duty</th>
                <th>Vehicle</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const days = daysUntil(item.licenseExpiry);
                const duty = dutyOf(item, trips);
                const vehicle = vehicles.find((entry) => entry.driverId === item.id);
                return (
                  <tr key={item.id} className={item.id === selected ? "click selected" : "click"} onClick={() => setSelected(item.id)}>
                    <td>
                      {item.name}
                      <span className="sub">{item.phone}</span>
                    </td>
                    <td>{item.city}</td>
                    <td className="mono">{item.licenseNo}</td>
                    <td className={days <= 45 ? "warn" : undefined}>{days < 0 ? "Expired" : day(item.licenseExpiry)}</td>
                    <td>
                      <Pill tone={duty}>{label(duty)}</Pill>
                    </td>
                    <td>{vehicle?.regNo ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {driver ? (
          <aside className="card detail">
            <h3>{driver.name}</h3>
            <p className="note">{driver.phone}</p>
            <label className="field">
              Assigned vehicle
              <select
                value={vehicles.find((item) => item.driverId === driver.id)?.id ?? ""}
                onChange={(event) => {
                  const current = vehicles.find((item) => item.driverId === driver.id);
                  const next = event.target.value;
                  if (!next && current) assignDriver(current.id, null);
                  else if (next) assignDriver(next, driver.id);
                }}
              >
                <option value="">Unassigned</option>
                {vehicles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.regNo} · {item.city}
                  </option>
                ))}
              </select>
            </label>
            <dl>
              <dt>Licence</dt>
              <dd>{driver.licenseNo}</dd>
              <dt>Expires</dt>
              <dd>{day(driver.licenseExpiry)}</dd>
            </dl>
            <span className="kicker">Trips</span>
            <ul className="ping-list">
              {trips
                .filter((trip) => trip.driverId === driver.id)
                .slice(0, 5)
                .map((trip) => (
                  <li key={trip.id}>
                    {trip.code} · {label(trip.status)} · {trip.origin} → {trip.destination}
                  </li>
                ))}
            </ul>
          </aside>
        ) : null}
      </div>
      {open ? (
        <DriverForm
          onClose={() => setOpen(false)}
          onCreate={(input) => {
            if (addDriver(input)) setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function DriverForm({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (input: { name: string; phone: string; licenseNo: string; licenseExpiry: string; city: string }) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState("");
  const [city, setCity] = useState<string>(CITIES[0] ?? "Hyderabad");
  return (
    <Modal title="Add driver" onClose={onClose}>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          onCreate({ name, phone, licenseNo, licenseExpiry, city });
        }}
      >
        <div className="form-grid">
          <label className="field">
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className="field">
            Phone
            <input value={phone} onChange={(event) => setPhone(event.target.value)} required />
          </label>
          <label className="field">
            Licence number
            <input value={licenseNo} onChange={(event) => setLicenseNo(event.target.value)} required />
          </label>
          <label className="field">
            Licence expiry
            <input type="date" value={licenseExpiry} onChange={(event) => setLicenseExpiry(event.target.value)} required />
          </label>
          <label className="field">
            City
            <select value={city} onChange={(event) => setCity(event.target.value)}>
              {CITIES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" type="submit">
            Save driver
          </button>
        </div>
      </form>
    </Modal>
  );
}
