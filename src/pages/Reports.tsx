import { Bars, PageHead } from "../components/ui";
import { downloadAllCsv, downloadCsv, type CsvFile, type CsvMetric } from "../lib/csv";
import { inr, isoDate, km, label } from "../lib/format";
import { driverName } from "../lib/lookup";
import { efficiencyRows, jobTone } from "../lib/metrics";
import { useFleet } from "../store/fleet";
import type { TripStatus } from "../types";

const TRIP_STATUSES: TripStatus[] = ["scheduled", "in_progress", "completed", "cancelled"];

type Metric = { label: string; value: number; display: string };

function metricsOf(items: Metric[]): CsvMetric[] {
  return items.map((item) => ({ label: item.label, value: item.value }));
}

function ReportMetrics({ items }: { items: Metric[] }) {
  return (
    <dl className="report-metrics">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.display}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ReportsPage() {
  const { vehicles, trips, fuel, maintenance, drivers } = useFleet();
  const stamp = isoDate(0);
  const cities = [...new Set(vehicles.map((vehicle) => vehicle.city))];
  const utilization = cities.map((city) => {
    const group = vehicles.filter((vehicle) => vehicle.city === city);
    const moving = group.filter((vehicle) => vehicle.status === "moving").length;
    const idle = group.filter((vehicle) => vehicle.status === "idle").length;
    const workshop = group.filter((vehicle) => vehicle.status === "maintenance").length;
    const offline = group.filter((vehicle) => vehicle.status === "offline").length;
    const pct = group.length ? Math.round((moving / group.length) * 100) : 0;
    return { city, total: group.length, moving, idle, workshop, offline, pct };
  });
  const fleetTotal = utilization.reduce((sum, row) => sum + row.total, 0);
  const fleetMoving = utilization.reduce((sum, row) => sum + row.moving, 0);
  const fleetIdle = utilization.reduce((sum, row) => sum + row.idle, 0);
  const fleetWorkshop = utilization.reduce((sum, row) => sum + row.workshop, 0);
  const fleetOffline = utilization.reduce((sum, row) => sum + row.offline, 0);
  const fleetUtil = fleetTotal ? Math.round((fleetMoving / fleetTotal) * 100) : 0;
  const utilizationMetrics: Metric[] = [
    { label: "Utilization", value: fleetUtil, display: `${fleetUtil}%` },
    { label: "Moving", value: fleetMoving, display: String(fleetMoving) },
    { label: "Idle", value: fleetIdle, display: String(fleetIdle) },
    { label: "Workshop", value: fleetWorkshop, display: String(fleetWorkshop) },
    { label: "Offline", value: fleetOffline, display: String(fleetOffline) },
  ];

  const tripCounts = TRIP_STATUSES.map((status) => ({
    label: label(status),
    value: trips.filter((trip) => trip.status === status).length,
    display: String(trips.filter((trip) => trip.status === status).length),
  }));
  const completed = trips.filter((trip) => trip.status === "completed");
  const completedKm = completed.reduce((sum, trip) => sum + (trip.actualKm ?? 0), 0);
  const plannedKm = completed.reduce((sum, trip) => sum + trip.distanceKm, 0);
  const kmGap = completedKm - plannedKm;
  const tripMetrics: Metric[] = [
    { label: "Trips", value: trips.length, display: String(trips.length) },
    { label: "Completed km", value: completedKm, display: km(completedKm) },
    { label: "Planned km", value: plannedKm, display: km(plannedKm) },
    { label: "Against plan", value: kmGap, display: `${kmGap > 0 ? "+" : ""}${km(kmGap)}` },
  ];

  const efficiency = efficiencyRows(vehicles, fuel);
  const fuelChart = efficiency.slice(0, 8).map((row) => ({
    label: row.vehicle.regNo,
    value: row.kmPerL,
    display: `${row.kmPerL.toFixed(1)} km/L`,
  }));
  const fuelKm = efficiency.reduce((sum, row) => sum + row.km, 0);
  const fuelLitres = efficiency.reduce((sum, row) => sum + row.litres, 0);
  const fuelSpendTotal = fuel.reduce((sum, entry) => sum + entry.costInr, 0);
  const fuelLitresTotal = fuel.reduce((sum, entry) => sum + entry.litres, 0);
  const fleetKmPerL = fuelLitres > 0 ? Number((fuelKm / fuelLitres).toFixed(2)) : 0;
  const fuelMetrics: Metric[] = [
    { label: "Fuel spend", value: fuelSpendTotal, display: inr(fuelSpendTotal) },
    { label: "Litres", value: fuelLitresTotal, display: fuelLitresTotal.toLocaleString("en-IN") },
    { label: "Fleet km/L", value: fleetKmPerL, display: fleetKmPerL ? `${fleetKmPerL.toFixed(1)}` : "—" },
    { label: "Vehicles measured", value: efficiency.length, display: String(efficiency.length) },
  ];

  const spend = new Map<string, number>();
  for (const job of maintenance) {
    if (job.costInr === null) continue;
    const reg = vehicles.find((vehicle) => vehicle.id === job.vehicleId)?.regNo ?? "Vehicle";
    spend.set(reg, (spend.get(reg) ?? 0) + job.costInr);
  }
  const maintChart = [...spend.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([reg, amount]) => ({ label: reg, value: amount, display: `₹${amount.toLocaleString("en-IN")}` }));
  const openJobs = maintenance.filter((job) => job.status !== "completed");
  const overdueJobs = openJobs.filter((job) => jobTone(job) === "overdue");
  const closedSpend = maintenance.reduce((sum, job) => sum + (job.costInr ?? 0), 0);
  const maintenanceMetrics: Metric[] = [
    { label: "Open jobs", value: openJobs.length, display: String(openJobs.length) },
    { label: "Overdue", value: overdueJobs.length, display: String(overdueJobs.length) },
    { label: "Closed spend", value: closedSpend, display: inr(closedSpend) },
    { label: "Jobs on file", value: maintenance.length, display: String(maintenance.length) },
  ];

  const files: Record<string, CsvFile> = {
    utilization: {
      filename: `samvanta-fleet-utilization-${stamp}.csv`,
      metrics: metricsOf(utilizationMetrics),
      headers: ["City", "Vehicles", "Moving", "Idle", "Workshop", "Offline", "Utilization %"],
      rows: utilization.map((row) => [row.city, row.total, row.moving, row.idle, row.workshop, row.offline, row.pct]),
    },
    trips: {
      filename: `samvanta-fleet-trips-${stamp}.csv`,
      metrics: metricsOf(tripMetrics),
      headers: [
        "Trip",
        "Status",
        "Purpose",
        "Origin",
        "Destination",
        "Vehicle",
        "Driver",
        "Scheduled",
        "Started",
        "Ended",
        "Planned km",
        "Actual km",
      ],
      rows: [...trips]
        .sort((a, b) => Date.parse(b.scheduledStart) - Date.parse(a.scheduledStart))
        .map((trip) => [
          trip.code,
          label(trip.status),
          trip.purpose,
          trip.origin,
          trip.destination,
          vehicles.find((vehicle) => vehicle.id === trip.vehicleId)?.regNo ?? "",
          driverName(drivers, trip.driverId),
          trip.scheduledStart,
          trip.startedAt ?? "",
          trip.endedAt ?? "",
          trip.distanceKm,
          trip.actualKm ?? "",
        ]),
    },
    fuel: {
      filename: `samvanta-fleet-fuel-${stamp}.csv`,
      metrics: metricsOf(fuelMetrics),
      headers: ["Vehicle", "City", "Type", "Fills counted", "Kilometres", "Litres", "Spend INR", "km per litre"],
      rows: efficiency.map((row) => [
        row.vehicle.regNo,
        row.vehicle.city,
        row.vehicle.type,
        fuel.filter((entry) => entry.vehicleId === row.vehicle.id).length,
        row.km,
        row.litres,
        row.spend,
        Number(row.kmPerL.toFixed(2)),
      ]),
    },
    maintenance: {
      filename: `samvanta-fleet-maintenance-${stamp}.csv`,
      metrics: metricsOf(maintenanceMetrics),
      headers: ["Job", "Vehicle", "City", "Status", "Due", "Completed", "Cost INR", "Odometer", "Notes"],
      rows: [...maintenance]
        .sort((a, b) => a.dueOn.localeCompare(b.dueOn))
        .map((job) => {
          const vehicle = vehicles.find((item) => item.id === job.vehicleId);
          const tone = jobTone(job);
          return [
            job.title,
            vehicle?.regNo ?? "",
            vehicle?.city ?? "",
            tone === "overdue" ? "Overdue" : label(tone),
            job.dueOn,
            job.completedOn ?? "",
            job.costInr ?? "",
            job.odometer ?? "",
            job.notes,
          ];
        }),
    },
  };

  return (
    <>
      <div className="hero-banner">
        <img src="/art/banner-fleet.jpg?v=2" alt="Trucks, a van, a car, and a bus on a highway" />
        <span>Utilization, trips, fuel, and maintenance</span>
      </div>
      <PageHead
        title="Reports"
        lede="Each report opens with the headline numbers. The chart is the breakdown, and the CSV carries both the metrics and the full register."
      >
        <button type="button" className="btn primary" onClick={() => downloadAllCsv(Object.values(files))}>
          Download all CSV
        </button>
      </PageHead>
      <div className="report-grid">
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Utilization by city</h2>
              <p className="note">Moving GPS fixes divided by vehicles based in that city.</p>
            </div>
            <button type="button" className="btn" onClick={() => downloadCsv(files.utilization)}>
              Download
            </button>
          </div>
          <ReportMetrics items={utilizationMetrics} />
          <Bars rows={utilization.map((row) => ({ label: row.city, value: row.pct, display: `${row.pct}%` }))} />
        </section>
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Trips</h2>
              <p className="note">Completed distance compared with the kilometres that were planned.</p>
            </div>
            <button type="button" className="btn" onClick={() => downloadCsv(files.trips)}>
              Download
            </button>
          </div>
          <ReportMetrics items={tripMetrics} />
          <Bars rows={tripCounts} />
        </section>
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Fuel efficiency</h2>
              <p className="note">Kilometres between fills, divided by litres of the later fill. The chart shows the first eight.</p>
            </div>
            <button type="button" className="btn" onClick={() => downloadCsv(files.fuel)}>
              Download
            </button>
          </div>
          <ReportMetrics items={fuelMetrics} />
          <Bars rows={fuelChart} />
        </section>
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Maintenance spend</h2>
              <p className="note">Closed-job cost on the chart. Open and overdue counts sit with the metrics.</p>
            </div>
            <button type="button" className="btn" onClick={() => downloadCsv(files.maintenance)}>
              Download
            </button>
          </div>
          <ReportMetrics items={maintenanceMetrics} />
          <Bars rows={maintChart} />
        </section>
      </div>
    </>
  );
}
