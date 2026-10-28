import { buildRoute, loopRoute, pointAlong, routeLengthKm } from "../lib/geo";
import { hoursAgo, isoDate, minutesFromNow } from "../lib/format";
import type {
  AuditEvent,
  DocumentRecord,
  Driver,
  Expense,
  FleetState,
  FuelEntry,
  GpsPing,
  LatLng,
  MaintenanceJob,
  Notice,
  Trip,
  User,
  Vehicle,
  VehicleType,
} from "../types";

export const SEED_VERSION = 2;

export const DEMO_ACCOUNTS = [
  {
    email: "ops@samvanta.demo",
    password: "demo123",
    role: "admin" as const,
    name: "Anika Rao",
    blurb: "Portal, reports, and audit",
  },
  {
    email: "fleet@samvanta.demo",
    password: "demo123",
    role: "manager" as const,
    name: "Rohan Mehta",
    blurb: "Day-to-day fleet operations",
  },
  {
    email: "driver@samvanta.demo",
    password: "demo123",
    role: "driver" as const,
    name: "Imran Qureshi",
    blurb: "Assigned trips and phone GPS",
  },
];

export type Place = { id: string; city: string; name: string; lat: number; lng: number };

export const PLACES: Place[] = [
  { id: "hyd-hub", city: "Hyderabad", name: "HITEC City hub", lat: 17.4474, lng: 78.3762 },
  { id: "hyd-air", city: "Hyderabad", name: "Shamshabad cargo", lat: 17.2403, lng: 78.4294 },
  { id: "hyd-depot", city: "Hyderabad", name: "Uppal depot", lat: 17.4012, lng: 78.5587 },
  { id: "blr-hub", city: "Bengaluru", name: "Whitefield hub", lat: 12.9698, lng: 77.7499 },
  { id: "blr-far", city: "Bengaluru", name: "Peenya industrial", lat: 13.0285, lng: 77.519 },
  { id: "blr-depot", city: "Bengaluru", name: "Electronic City depot", lat: 12.8452, lng: 77.6602 },
  { id: "maa-hub", city: "Chennai", name: "Guindy hub", lat: 13.0067, lng: 80.2206 },
  { id: "maa-far", city: "Chennai", name: "Sriperumbudur plant", lat: 12.967, lng: 79.941 },
  { id: "maa-depot", city: "Chennai", name: "Ambattur depot", lat: 13.1143, lng: 80.1548 },
  { id: "bom-hub", city: "Mumbai", name: "Bhiwandi hub", lat: 19.2813, lng: 73.0483 },
  { id: "bom-far", city: "Mumbai", name: "JNPT cargo", lat: 18.948, lng: 72.951 },
  { id: "bom-depot", city: "Mumbai", name: "Andheri depot", lat: 19.1197, lng: 72.8464 },
  { id: "pnq-hub", city: "Pune", name: "Hinjewadi hub", lat: 18.591, lng: 73.738 },
  { id: "pnq-far", city: "Pune", name: "Chakan plant", lat: 18.7606, lng: 73.863 },
  { id: "pnq-depot", city: "Pune", name: "Hadapsar depot", lat: 18.508, lng: 73.926 },
  { id: "del-hub", city: "Delhi", name: "Okhla hub", lat: 28.5308, lng: 77.271 },
  { id: "del-far", city: "Delhi", name: "Kundli cargo", lat: 28.869, lng: 77.116 },
  { id: "del-depot", city: "Delhi", name: "Dwarka depot", lat: 28.5921, lng: 77.046 },
];

const CITY_META = [
  { slug: "hyd", city: "Hyderabad", code: "TS09", hub: "hyd-hub", far: "hyd-air", depot: "hyd-depot" },
  { slug: "blr", city: "Bengaluru", code: "KA03", hub: "blr-hub", far: "blr-far", depot: "blr-depot" },
  { slug: "maa", city: "Chennai", code: "TN09", hub: "maa-hub", far: "maa-far", depot: "maa-depot" },
  { slug: "bom", city: "Mumbai", code: "MH04", hub: "bom-hub", far: "bom-far", depot: "bom-depot" },
  { slug: "pnq", city: "Pune", code: "MH12", hub: "pnq-hub", far: "pnq-far", depot: "pnq-depot" },
  { slug: "del", city: "Delhi", code: "DL01", hub: "del-hub", far: "del-far", depot: "del-depot" },
] as const;

export const CITIES = CITY_META.map((city) => city.city);

const MODELS: { type: VehicleType; make: string; model: string; fuelType: Vehicle["fuelType"]; cruise: number }[] = [
  { type: "Truck", make: "Tata", model: "Ultra T.16", fuelType: "Diesel", cruise: 38 },
  { type: "Truck", make: "Ashok Leyland", model: "Partner 6T", fuelType: "Diesel", cruise: 36 },
  { type: "Van", make: "Tata", model: "Winger", fuelType: "Diesel", cruise: 42 },
  { type: "Car", make: "Toyota", model: "Innova Crysta", fuelType: "Diesel", cruise: 48 },
  { type: "Bus", make: "Eicher", model: "Skyline Pro", fuelType: "CNG", cruise: 34 },
  { type: "Van", make: "Mahindra", model: "Supro", fuelType: "Diesel", cruise: 40 },
];

const DRIVER_NAMES = [
  "Imran Qureshi",
  "Kavya Nair",
  "Suresh Patel",
  "Deepa Iyer",
  "Arjun Reddy",
  "Farhan Sheikh",
  "Meera Joshi",
  "Harish Kumar",
  "Lakshmi Rao",
  "Nikhil Verma",
  "Ayesha Khan",
  "Ravi Teja",
  "Pooja Menon",
  "Vikram Singh",
  "Anjali Das",
  "Mohammed Irfan",
  "Sneha Kulkarni",
  "Ajay Yadav",
  "Divya Krishnan",
  "Prakash Rao",
  "Neha Kapoor",
  "Sanjay Ghosh",
  "Fatima Noor",
  "Karthik Subramanian",
  "Rekha Pillai",
  "Amit Bansal",
  "Shalini Dutta",
  "Joseph Mathew",
];

const STATIONS: Record<string, string> = {
  Hyderabad: "HP HITEC City",
  Bengaluru: "IOCL Whitefield",
  Chennai: "Nayara Guindy",
  Mumbai: "BPCL Bhiwandi",
  Pune: "HP Hinjewadi",
  Delhi: "IOCL Okhla",
};

const SERIES = "ABCDEFGHJKLMNPRSTUVWXYZ";

function place(id: string) {
  const found = PLACES.find((item) => item.id === id);
  if (!found) throw new Error(`Missing place ${id}`);
  return found;
}

function plate(code: string, n: number) {
  const suffix = String(1000 + ((n * 173) % 9000));
  const letters = `${SERIES[n % SERIES.length] ?? "A"}${SERIES[Math.floor(n / SERIES.length) % SERIES.length] ?? "B"}`;
  return `${code.slice(0, 2)} ${code.slice(2)} ${letters} ${suffix}`;
}

function documents(regNo: string, n: number, type: VehicleType): DocumentRecord[] {
  const insuranceDays = n === 4 || n === 10 ? -6 : n === 1 ? 9 : n === 7 ? 16 : n === 15 ? 22 : 240;
  const compact = regNo.replace(/\s/g, "");
  const docs: DocumentRecord[] = [
    { id: `doc-${n}-rc`, name: "Registration", number: `RC-${compact}`, expiresOn: isoDate(800) },
    { id: `doc-${n}-ins`, name: "Insurance", number: `POL-${10000 + n}`, expiresOn: isoDate(insuranceDays) },
    { id: `doc-${n}-fit`, name: "Fitness", number: `FIT-${20000 + n}`, expiresOn: isoDate(120 + (n % 5) * 20) },
  ];
  if (type === "Truck" || type === "Bus") {
    docs.push({
      id: `doc-${n}-permit`,
      name: "Permit",
      number: `NP-${30000 + n}`,
      expiresOn: isoDate(n === 12 ? 18 : 400),
    });
  }
  return docs;
}

function park(base: Place, slot: number, cityIndex: number): LatLng {
  return { lat: base.lat + slot * 0.007, lng: base.lng + cityIndex * 0.005 };
}

function pingHistory(route: Vehicle["route"], progress: number, speed: number): GpsPing[] {
  const pings: GpsPing[] = [];
  for (let step = 6; step >= 1; step -= 1) {
    const along = progress - step * 0.035;
    if (along <= 0) continue;
    const { point } = pointAlong(route, along);
    pings.push({
      at: hoursAgo(step * 0.12),
      lat: point.lat,
      lng: point.lng,
      speedKmh: speed,
      source: "telematics",
    });
  }
  return pings;
}

export function createSeed(): FleetState {
  const drivers: Driver[] = DRIVER_NAMES.map((name, index) => {
    const expiry = index === 4 ? -4 : index === 9 ? 12 : index === 14 ? 28 : 420 + index * 11;
    return {
      id: `d${index + 1}`,
      name,
      phone: String(9876500001 + index),
      licenseNo: `LIC-${4200000 + index}`,
      licenseExpiry: isoDate(expiry),
      status: "off_duty",
      city: CITIES[index % CITIES.length] ?? "Hyderabad",
    };
  });

  const vehicles: Vehicle[] = [];
  const trails: Record<string, GpsPing[]> = {};
  let n = 0;
  for (const [cityIndex, city] of CITY_META.entries()) {
    const hub = place(city.hub);
    const far = place(city.far);
    const depot = place(city.depot);
    for (let slot = 0; slot < 6; slot += 1) {
      const spec = MODELS[slot] ?? MODELS[0]!;
      const id = `v-${city.slug}-${slot}`;
      const status =
        slot === 0 || slot === 1 ? "moving" : slot === 4 ? "maintenance" : slot === 5 ? "offline" : "idle";
      const odometer = 42000 + cityIndex * 9000 + slot * 6400;
      let route: LatLng[] = [];
      let progress = 0;
      let loop = false;
      let position = park(slot === 4 ? depot : hub, slot, cityIndex);
      let heading = 0;
      const animSeconds = slot === 0 ? 80 : 95;
      if (slot === 0) {
        route = buildRoute(hub, far, 0.22 + cityIndex * 0.02);
        progress = 0.16 + cityIndex * 0.08;
        const along = pointAlong(route, progress);
        position = along.point;
        heading = along.heading;
      } else if (slot === 1) {
        route = loopRoute(depot, 0.018);
        loop = true;
        progress = (0.12 + cityIndex * 0.15) % 1;
        const along = pointAlong(route, progress);
        position = along.point;
        heading = along.heading;
      }
      const routeKm = route.length > 1 ? routeLengthKm(route) : 0;
      const lastSeen =
        status === "moving"
          ? new Date().toISOString()
          : status === "idle"
            ? hoursAgo(0.2 + slot * 0.15)
            : status === "maintenance"
              ? hoursAgo(2 + cityIndex * 0.4)
              : hoursAgo(8 + cityIndex * 3.5);
      const vehicle: Vehicle = {
        id,
        regNo: plate(city.code, n),
        make: spec.make,
        model: spec.model,
        year: 2021 + ((cityIndex + slot) % 4),
        type: spec.type,
        fuelType: spec.fuelType,
        status,
        driverId: null,
        odometer,
        city: city.city,
        lat: position.lat,
        lng: position.lng,
        heading,
        speedKmh: status === "moving" ? spec.cruise : 0,
        cruiseKmh: spec.cruise,
        lastSeen,
        locationSource: "telematics",
        loop,
        progress,
        routeKm,
        animSeconds,
        route,
        documents: documents(plate(city.code, n), n, spec.type),
      };
      if (status === "moving") trails[id] = pingHistory(route, progress, spec.cruise);
      vehicles.push(vehicle);
      n += 1;
    }
  }

  let cursor = 1;
  for (const vehicle of vehicles) {
    if (vehicle.id === "v-hyd-2") {
      vehicle.driverId = "d1";
      continue;
    }
    if (vehicle.status === "offline" || vehicle.id.endsWith("-3")) continue;
    const driver = drivers[cursor];
    if (!driver) continue;
    vehicle.driverId = driver.id;
    cursor += 1;
  }

  const trips: Trip[] = [];
  for (const [cityIndex, city] of CITY_META.entries()) {
    const vehicle = vehicles.find((item) => item.id === `v-${city.slug}-0`);
    const hub = place(city.hub);
    const far = place(city.far);
    if (!vehicle?.driverId) continue;
    trips.push({
      id: `t-live-${city.slug}`,
      code: `TR-${2410 + cityIndex}`,
      vehicleId: vehicle.id,
      driverId: vehicle.driverId,
      origin: hub.name,
      destination: far.name,
      originPoint: { lat: hub.lat, lng: hub.lng },
      destPoint: { lat: far.lat, lng: far.lng },
      purpose: cityIndex % 2 === 0 ? "Linehaul" : "Plant delivery",
      scheduledStart: hoursAgo(1.4),
      status: "in_progress",
      startedAt: hoursAgo(0.9),
      endedAt: null,
      distanceKm: Math.max(1, Math.round(vehicle.routeKm)),
      actualKm: null,
    });
    const depot = place(city.depot);
    trips.push({
      id: `t-prev-${city.slug}`,
      code: `TR-${2280 + cityIndex}`,
      vehicleId: vehicle.id,
      driverId: vehicle.driverId,
      origin: depot.name,
      destination: hub.name,
      originPoint: { lat: depot.lat, lng: depot.lng },
      destPoint: { lat: hub.lat, lng: hub.lng },
      purpose: "Hub transfer",
      scheduledStart: hoursAgo(20 + cityIndex),
      status: "completed",
      startedAt: hoursAgo(19 + cityIndex),
      endedAt: hoursAgo(16 + cityIndex),
      distanceKm: 18 + cityIndex * 4,
      actualKm: 19 + cityIndex * 4,
    });
    const loopVehicle = vehicles.find((item) => item.id === `v-${city.slug}-1`);
    if (loopVehicle?.driverId) {
      trips.push({
        id: `t-done-${city.slug}`,
        code: `TR-${2320 + cityIndex}`,
        vehicleId: loopVehicle.id,
        driverId: loopVehicle.driverId,
        origin: depot.name,
        destination: hub.name,
        originPoint: { lat: depot.lat, lng: depot.lng },
        destPoint: { lat: hub.lat, lng: hub.lng },
        purpose: "Store delivery",
        scheduledStart: hoursAgo(30 + cityIndex),
        status: "completed",
        startedAt: hoursAgo(29 + cityIndex),
        endedAt: hoursAgo(26 + cityIndex),
        distanceKm: 42 + cityIndex * 3,
        actualKm: 44 + cityIndex * 3,
      });
    }
  }

  const hydHub = place("hyd-hub");
  const hydAir = place("hyd-air");
  const hydRouteKm = routeLengthKm(buildRoute(hydHub, hydAir));
  trips.push({
    id: "t-imran",
    code: "TR-2448",
    vehicleId: "v-hyd-2",
    driverId: "d1",
    origin: hydHub.name,
    destination: hydAir.name,
    originPoint: { lat: hydHub.lat, lng: hydHub.lng },
    destPoint: { lat: hydAir.lat, lng: hydAir.lng },
    purpose: "Airport cargo",
    scheduledStart: minutesFromNow(35),
    status: "scheduled",
    startedAt: null,
    endedAt: null,
    distanceKm: Math.max(1, Math.round(hydRouteKm)),
    actualKm: null,
  });
  trips.push({
    id: "t-imran-old",
    code: "TR-2388",
    vehicleId: "v-hyd-2",
    driverId: "d1",
    origin: place("hyd-depot").name,
    destination: hydHub.name,
    originPoint: { lat: place("hyd-depot").lat, lng: place("hyd-depot").lng },
    destPoint: { lat: hydHub.lat, lng: hydHub.lng },
    purpose: "Depot transfer",
    scheduledStart: hoursAgo(52),
    status: "completed",
    startedAt: hoursAgo(51),
    endedAt: hoursAgo(48),
    distanceKm: 22,
    actualKm: 24,
  });

  for (const id of ["v-blr-2", "v-del-2"]) {
    const vehicle = vehicles.find((item) => item.id === id);
    if (!vehicle?.driverId) continue;
    const meta = CITY_META.find((city) => vehicle.id.includes(city.slug));
    if (!meta) continue;
    const hub = place(meta.hub);
    const far = place(meta.far);
    trips.push({
      id: `t-soon-${meta.slug}`,
      code: meta.slug === "blr" ? "TR-2452" : "TR-2460",
      vehicleId: vehicle.id,
      driverId: vehicle.driverId,
      origin: hub.name,
      destination: far.name,
      originPoint: { lat: hub.lat, lng: hub.lng },
      destPoint: { lat: far.lat, lng: far.lng },
      purpose: "Customer pickup",
      scheduledStart: meta.slug === "blr" ? minutesFromNow(360) : minutesFromNow(60 * 26),
      status: "scheduled",
      startedAt: null,
      endedAt: null,
      distanceKm: Math.max(1, Math.round(routeLengthKm(buildRoute(hub, far)))),
      actualKm: null,
    });
  }

  for (const driver of drivers) {
    const assigned = vehicles.find((vehicle) => vehicle.driverId === driver.id);
    if (assigned) driver.city = assigned.city;
    driver.status = trips.some((trip) => trip.driverId === driver.id && trip.status === "in_progress")
      ? "on_trip"
      : assigned
        ? "available"
        : "off_duty";
  }

  const fuel: FuelEntry[] = [];
  let fuelIndex = 0;
  for (const vehicle of vehicles) {
    if (!["0", "1", "2"].some((slot) => vehicle.id.endsWith(`-${slot}`))) continue;
    const rate = vehicle.fuelType === "CNG" ? 87 : vehicle.fuelType === "Petrol" ? 105 : 93;
    const litres = vehicle.type === "Car" ? 22 : vehicle.type === "Bus" ? 48 : 42;
    const gap = vehicle.type === "Car" ? 280 : vehicle.type === "Bus" ? 220 : 190;
    for (const [offset, back] of [
      [gap + 20, 18],
      [20, 2],
    ] as const) {
      fuel.push({
        id: `f-${fuelIndex}`,
        vehicleId: vehicle.id,
        driverId: vehicle.driverId,
        at: hoursAgo(back * 24),
        litres,
        costInr: Math.round(litres * rate),
        odometer: vehicle.odometer - offset,
        station: STATIONS[vehicle.city] ?? "Fuel station",
      });
      fuelIndex += 1;
    }
  }

  const expenses: Expense[] = [
    {
      id: "e-1",
      vehicleId: "v-hyd-2",
      driverId: "d1",
      at: hoursAgo(50),
      category: "Toll",
      amountInr: 285,
      note: "ORR plaza",
    },
    {
      id: "e-2",
      vehicleId: "v-hyd-2",
      driverId: "d1",
      at: hoursAgo(49),
      category: "Parking",
      amountInr: 120,
      note: "Uppal depot bay",
    },
    {
      id: "e-3",
      vehicleId: "v-blr-0",
      driverId: vehicles.find((vehicle) => vehicle.id === "v-blr-0")?.driverId ?? "d2",
      at: hoursAgo(6),
      category: "Toll",
      amountInr: 410,
      note: "NICE Road",
    },
    {
      id: "e-4",
      vehicleId: "v-bom-0",
      driverId: vehicles.find((vehicle) => vehicle.id === "v-bom-0")?.driverId ?? "d2",
      at: hoursAgo(8),
      category: "Parking",
      amountInr: 200,
      note: "JNPT holding yard",
    },
  ];

  const maintenance: MaintenanceJob[] = [];
  CITY_META.forEach((city, cityIndex) => {
    const vehicle = vehicles.find((item) => item.id === `v-${city.slug}-4`);
    if (!vehicle) return;
    maintenance.push({
      id: `m-open-${city.slug}`,
      vehicleId: vehicle.id,
      title: cityIndex < 3 ? "Brake inspection" : "Scheduled service",
      dueOn: isoDate(cityIndex < 3 ? -4 : 2),
      status: "scheduled",
      costInr: null,
      odometer: null,
      notes: cityIndex < 3 ? "Held in workshop" : "Booked this week",
      completedOn: null,
    });
  });
  for (const slug of ["hyd", "maa", "pnq"]) {
    const vehicle = vehicles.find((item) => item.id === `v-${slug}-0`);
    if (!vehicle) continue;
    maintenance.push({
      id: `m-soon-${slug}`,
      vehicleId: vehicle.id,
      title: "Oil service",
      dueOn: isoDate(10),
      status: "scheduled",
      costInr: null,
      odometer: null,
      notes: "Due by odometer band",
      completedOn: null,
    });
  }
  vehicles.slice(0, 8).forEach((vehicle, index) => {
    maintenance.push({
      id: `m-done-${index}`,
      vehicleId: vehicle.id,
      title: index % 2 === 0 ? "Oil service" : "Tyre replacement",
      dueOn: isoDate(-40 - index),
      status: "completed",
      costInr: 6500 + index * 1800,
      odometer: vehicle.odometer - 900 - index * 120,
      notes: "Closed in workshop",
      completedOn: isoDate(-32 - index),
    });
  });

  const users: User[] = [
    {
      id: "u-admin",
      name: "Anika Rao",
      email: "ops@samvanta.demo",
      password: "demo123",
      role: "admin",
    },
    {
      id: "u-manager",
      name: "Rohan Mehta",
      email: "fleet@samvanta.demo",
      password: "demo123",
      role: "manager",
    },
    {
      id: "u-driver",
      name: "Imran Qureshi",
      email: "driver@samvanta.demo",
      password: "demo123",
      role: "driver",
      driverId: "d1",
    },
  ];

  const notices: Notice[] = [
    {
      id: "n-1",
      userId: "u-driver",
      at: hoursAgo(2),
      title: "Trip assigned",
      body: "TR-2448 · HITEC City hub to Shamshabad cargo",
      read: false,
    },
    {
      id: "n-2",
      userId: "u-admin",
      at: hoursAgo(5),
      title: "Insurance expired",
      body: "Two vehicles have an expired insurance policy.",
      read: false,
    },
    {
      id: "n-3",
      userId: "u-manager",
      at: hoursAgo(3),
      title: "Offline vehicles",
      body: "Six vehicles have not sent a GPS ping in more than five hours.",
      read: false,
    },
  ];

  const audit: AuditEvent[] = [
    {
      id: "a-1",
      at: hoursAgo(0.6),
      actor: "System",
      action: "GPS ingest",
      detail: "Telematics feed healthy for the moving fleet.",
    },
    {
      id: "a-2",
      at: hoursAgo(5),
      actor: "Anika Rao",
      action: "Document review",
      detail: "Insurance expiry list checked.",
    },
    {
      id: "a-3",
      at: hoursAgo(20),
      actor: "Rohan Mehta",
      action: "Trip scheduled",
      detail: "TR-2448 assigned to Imran Qureshi.",
    },
    {
      id: "a-4",
      at: hoursAgo(26),
      actor: "System",
      action: "Maintenance opened",
      detail: "Brake inspection jobs opened for workshop vehicles.",
    },
  ];

  return {
    seedVersion: SEED_VERSION,
    rev: 1,
    sessionUserId: null,
    users,
    vehicles,
    drivers,
    trips,
    fuel,
    expenses,
    maintenance,
    audit,
    notices,
    trails,
  };
}
