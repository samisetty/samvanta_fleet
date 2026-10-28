import { PLACES } from "../data/seed";
import { buildRoute, loopRoute, routeLengthKm } from "../lib/geo";
import { isoDate } from "../lib/format";
import { uid } from "../lib/id";
import type {
  ActionResult,
  AuditEvent,
  FleetState,
  NewDriver,
  NewExpense,
  NewFuel,
  NewJob,
  NewTrip,
  NewVehicle,
  Notice,
  Vehicle,
  VehicleStatus,
} from "../types";

function actorName(state: FleetState) {
  return state.users.find((user) => user.id === state.sessionUserId)?.name ?? "System";
}

function withAudit(
  state: FleetState,
  actor: string,
  action: string,
  detail: string,
  patch: Partial<FleetState>,
): FleetState {
  const event: AuditEvent = { id: uid("a"), at: new Date().toISOString(), actor, action, detail };
  return {
    ...state,
    ...patch,
    audit: [event, ...state.audit].slice(0, 200),
    rev: state.rev + 1,
  };
}

function pushNotice(notices: Notice[], userIds: string[], title: string, body: string) {
  const at = new Date().toISOString();
  const added = [...new Set(userIds)].map((userId) => ({
    id: uid("n"),
    userId,
    at,
    title,
    body,
    read: false,
  }));
  return [...added, ...notices].slice(0, 120);
}

function opsIds(state: FleetState) {
  return state.users.filter((user) => user.role !== "driver").map((user) => user.id);
}

function driverUserId(state: FleetState, driverId: string | null) {
  if (!driverId) return null;
  return state.users.find((user) => user.driverId === driverId)?.id ?? null;
}

function liveTrip(state: FleetState, vehicleId: string) {
  return state.trips.find((trip) => trip.vehicleId === vehicleId && trip.status === "in_progress");
}

export function applyLogin(state: FleetState, email: string, password: string): ActionResult {
  const user = state.users.find(
    (item) => item.email.toLowerCase() === email.trim().toLowerCase() && item.password === password,
  );
  if (!user) return { ok: false, state, toast: "Those credentials are not in the demo." };
  return {
    ok: true,
    state: withAudit(state, user.name, "Signed in", `${user.role} session`, { sessionUserId: user.id }),
    toast: `Signed in as ${user.name}`,
  };
}

export function applyLogout(state: FleetState): ActionResult {
  const name = actorName(state);
  return {
    ok: true,
    state: withAudit(state, name, "Signed out", "Session closed", { sessionUserId: null }),
    toast: "Signed out",
  };
}

export function applyAddVehicle(state: FleetState, input: NewVehicle): ActionResult {
  const regNo = input.regNo.toUpperCase().replace(/\s+/g, " ").trim();
  if (!regNo || !input.make.trim() || !input.model.trim()) {
    return { ok: false, state, toast: "Registration, make, and model are required." };
  }
  if (state.vehicles.some((vehicle) => vehicle.regNo.replace(/\s/g, "") === regNo.replace(/\s/g, ""))) {
    return { ok: false, state, toast: "That registration is already on the fleet." };
  }
  const home = PLACES.find((item) => item.city === input.city) ?? PLACES[0];
  if (!home) return { ok: false, state, toast: "Pick a city." };
  const vehicle: Vehicle = {
    id: uid("v"),
    regNo,
    make: input.make.trim(),
    model: input.model.trim(),
    year: input.year,
    type: input.type,
    fuelType: input.fuelType,
    status: "idle",
    driverId: null,
    odometer: Math.max(0, Math.round(input.odometer)),
    city: input.city,
    lat: home.lat,
    lng: home.lng,
    heading: 0,
    speedKmh: 0,
    cruiseKmh: 40,
    lastSeen: new Date().toISOString(),
    locationSource: "telematics",
    loop: false,
    progress: 0,
    routeKm: 0,
    animSeconds: 80,
    route: [],
    documents: [
      { id: uid("doc"), name: "Registration", number: `RC-${regNo.replace(/\s/g, "")}`, expiresOn: isoDate(800) },
      { id: uid("doc"), name: "Insurance", number: `POL-${Date.now().toString().slice(-6)}`, expiresOn: isoDate(365) },
      { id: uid("doc"), name: "Fitness", number: `FIT-${Date.now().toString().slice(-6)}`, expiresOn: isoDate(180) },
    ],
  };
  return {
    ok: true,
    state: withAudit(state, actorName(state), "Vehicle added", regNo, {
      vehicles: [vehicle, ...state.vehicles],
    }),
    toast: `${regNo} added`,
  };
}

export function applyAddDriver(state: FleetState, input: NewDriver): ActionResult {
  const name = input.name.trim();
  const licenseNo = input.licenseNo.trim().toUpperCase();
  if (!name || !licenseNo || !input.phone.trim()) {
    return { ok: false, state, toast: "Name, phone, and licence are required." };
  }
  if (state.drivers.some((driver) => driver.licenseNo.toLowerCase() === licenseNo.toLowerCase())) {
    return { ok: false, state, toast: "That licence is already on file." };
  }
  const driver = {
    id: uid("d"),
    name,
    phone: input.phone.trim(),
    licenseNo,
    licenseExpiry: input.licenseExpiry,
    status: "off_duty" as const,
    city: input.city,
  };
  return {
    ok: true,
    state: withAudit(state, actorName(state), "Driver added", name, { drivers: [driver, ...state.drivers] }),
    toast: `${name} added`,
  };
}

export function applyAssign(state: FleetState, vehicleId: string, driverId: string | null): ActionResult {
  const vehicle = state.vehicles.find((item) => item.id === vehicleId);
  if (!vehicle) return { ok: false, state, toast: "Vehicle not found." };
  if (liveTrip(state, vehicleId)) {
    return { ok: false, state, toast: "Finish the live trip before changing the driver." };
  }
  const vehicles = state.vehicles.map((item) => {
    if (item.id === vehicleId) return { ...item, driverId };
    if (driverId && item.driverId === driverId) return { ...item, driverId: null };
    return item;
  });
  const drivers = state.drivers.map((driver) => {
    const assigned = vehicles.some((item) => item.driverId === driver.id);
    if (!assigned) return { ...driver, status: "off_duty" as const };
    if (driver.status === "off_duty") return { ...driver, status: "available" as const, city: vehicle.city };
    return driver;
  });
  const driver = state.drivers.find((item) => item.id === driverId);
  const detail = driver ? `${driver.name} assigned to ${vehicle.regNo}` : `${vehicle.regNo} unassigned`;
  return {
    ok: true,
    state: withAudit(state, actorName(state), "Assignment updated", detail, { vehicles, drivers }),
    toast: detail,
  };
}

export function applyVehicleStatus(state: FleetState, vehicleId: string, status: VehicleStatus): ActionResult {
  const vehicle = state.vehicles.find((item) => item.id === vehicleId);
  if (!vehicle) return { ok: false, state, toast: "Vehicle not found." };
  if (status !== "moving" && liveTrip(state, vehicleId)) {
    return { ok: false, state, toast: "Complete the live trip before changing status." };
  }
  const vehicles = state.vehicles.map((item) => {
    if (item.id !== vehicleId) return item;
    if (status === "moving") {
      if (item.route.length > 1 && !item.loop) {
        return { ...item, status, speedKmh: item.cruiseKmh };
      }
      const route = loopRoute({ lat: item.lat, lng: item.lng }, 0.016);
      return {
        ...item,
        status,
        loop: true,
        route,
        routeKm: routeLengthKm(route),
        progress: 0,
        speedKmh: item.cruiseKmh,
        locationSource: "telematics" as const,
        animSeconds: 90,
      };
    }
    return { ...item, status, loop: false, speedKmh: 0 };
  });
  return {
    ok: true,
    state: withAudit(state, actorName(state), "Vehicle status", `${vehicle.regNo} set to ${status}`, { vehicles }),
    toast: `${vehicle.regNo} is ${status === "maintenance" ? "in the workshop" : status}`,
  };
}

export function applyCreateTrip(state: FleetState, input: NewTrip): ActionResult {
  const vehicle = state.vehicles.find((item) => item.id === input.vehicleId);
  const driver = state.drivers.find((item) => item.id === input.driverId);
  const origin = PLACES.find((item) => item.id === input.originId);
  const destination = PLACES.find((item) => item.id === input.destinationId);
  if (!vehicle || !driver || !origin || !destination) return { ok: false, state, toast: "Choose a vehicle, driver, and both stops." };
  if (origin.id === destination.id) return { ok: false, state, toast: "Origin and destination must differ." };
  if (vehicle.status === "offline" || vehicle.status === "maintenance") {
    return { ok: false, state, toast: `${vehicle.regNo} cannot take a trip in its current status.` };
  }
  if (!input.purpose.trim()) return { ok: false, state, toast: "Add a purpose." };
  const when = new Date(input.scheduledStart);
  if (Number.isNaN(when.getTime())) return { ok: false, state, toast: "Choose a start time." };
  const distanceKm = Math.max(1, Math.round(routeLengthKm(buildRoute(origin, destination))));
  const nums = state.trips.map((trip) => Number(trip.code.replace("TR-", ""))).filter((num) => Number.isFinite(num));
  const code = `TR-${Math.max(2400, ...nums) + 1}`;
  const trip = {
    id: uid("t"),
    code,
    vehicleId: vehicle.id,
    driverId: driver.id,
    origin: origin.name,
    destination: destination.name,
    originPoint: { lat: origin.lat, lng: origin.lng },
    destPoint: { lat: destination.lat, lng: destination.lng },
    purpose: input.purpose.trim(),
    scheduledStart: when.toISOString(),
    status: "scheduled" as const,
    startedAt: null,
    endedAt: null,
    distanceKm,
    actualKm: null,
  };
  const notify = [...opsIds(state)];
  const driverUser = driverUserId(state, driver.id);
  if (driverUser) notify.push(driverUser);
  return {
    ok: true,
    state: withAudit(state, actorName(state), "Trip scheduled", `${code} · ${driver.name} · ${vehicle.regNo}`, {
      trips: [trip, ...state.trips],
      notices: pushNotice(state.notices, notify, "Trip assigned", `${code} · ${origin.name} to ${destination.name}`),
    }),
    toast: `${code} scheduled`,
  };
}

export function applyStartTrip(state: FleetState, tripId: string): ActionResult {
  const trip = state.trips.find((item) => item.id === tripId);
  if (!trip) return { ok: false, state, toast: "Trip not found." };
  if (trip.status !== "scheduled") return { ok: false, state, toast: "Only a scheduled trip can be started." };
  const vehicle = state.vehicles.find((item) => item.id === trip.vehicleId);
  if (!vehicle) return { ok: false, state, toast: "Vehicle not found." };
  if (vehicle.status === "maintenance" || vehicle.status === "offline") {
    return { ok: false, state, toast: `${vehicle.regNo} is ${vehicle.status === "maintenance" ? "in the workshop" : "offline"}.` };
  }
  if (liveTrip(state, vehicle.id)) return { ok: false, state, toast: "That vehicle already has a live trip." };
  const user = state.users.find((item) => item.id === state.sessionUserId);
  const source = user?.role === "driver" ? "phone" : "telematics";
  const route = buildRoute({ lat: vehicle.lat, lng: vehicle.lng }, trip.destPoint, 0.3);
  const now = new Date().toISOString();
  const vehicles = state.vehicles.map((item) =>
    item.id === vehicle.id
      ? {
          ...item,
          status: "moving" as const,
          loop: false,
          route,
          routeKm: routeLengthKm(route),
          progress: 0.02,
          speedKmh: item.cruiseKmh,
          locationSource: source as Vehicle["locationSource"],
          animSeconds: 80,
          lastSeen: now,
        }
      : item,
  );
  const trips = state.trips.map((item) =>
    item.id === trip.id ? { ...item, status: "in_progress" as const, startedAt: now } : item,
  );
  const drivers = state.drivers.map((driver) =>
    driver.id === trip.driverId ? { ...driver, status: "on_trip" as const } : driver,
  );
  return {
    ok: true,
    state: withAudit(state, actorName(state), "Trip started", `${trip.code} · ${source === "phone" ? "phone GPS" : "telematics"}`, {
      vehicles,
      trips,
      drivers,
      notices: pushNotice(state.notices, opsIds(state), "Trip started", `${trip.code} · ${vehicle.regNo}`),
    }),
    toast: source === "phone" ? "Trip started · phone GPS is reporting" : `${trip.code} started`,
  };
}

export function applyCompleteTrip(state: FleetState, tripId: string): ActionResult {
  return finishTrip(state, tripId, "completed");
}

export function applyCancelTrip(state: FleetState, tripId: string): ActionResult {
  return finishTrip(state, tripId, "cancelled");
}

function finishTrip(state: FleetState, tripId: string, status: "completed" | "cancelled"): ActionResult {
  const trip = state.trips.find((item) => item.id === tripId);
  if (!trip) return { ok: false, state, toast: "Trip not found." };
  if (status === "completed" && trip.status !== "in_progress") {
    return { ok: false, state, toast: "Start the trip before ending it." };
  }
  if (status === "cancelled" && trip.status !== "scheduled" && trip.status !== "in_progress") {
    return { ok: false, state, toast: "That trip is already closed." };
  }
  const vehicle = state.vehicles.find((item) => item.id === trip.vehicleId);
  const now = new Date().toISOString();
  const driven =
    trip.status === "in_progress" && vehicle
      ? Math.max(1, Math.round(vehicle.routeKm * Math.min(1, Math.max(vehicle.progress, 0.05))))
      : 0;
  const trips = state.trips.map((item) =>
    item.id === trip.id
      ? { ...item, status, endedAt: now, actualKm: status === "cancelled" && driven === 0 ? null : driven || item.actualKm }
      : item,
  );
  const vehicles = state.vehicles.map((item) => {
    if (item.id !== trip.vehicleId || trip.status !== "in_progress") return item;
    return {
      ...item,
      status: "idle" as const,
      speedKmh: 0,
      loop: false,
      route: [],
      routeKm: 0,
      progress: 0,
      locationSource: "telematics" as const,
      odometer: item.odometer + driven,
      lastSeen: now,
    };
  });
  const drivers = state.drivers.map((driver) => {
    if (driver.id !== trip.driverId) return driver;
    const stillOut = trips.some((item) => item.driverId === driver.id && item.status === "in_progress");
    return { ...driver, status: stillOut ? ("on_trip" as const) : ("available" as const) };
  });
  const verb = status === "completed" ? "Trip completed" : "Trip cancelled";
  return {
    ok: true,
    state: withAudit(state, actorName(state), verb, `${trip.code}${driven ? ` · ${driven} km` : ""}`, {
      trips,
      vehicles,
      drivers,
      notices: pushNotice(state.notices, opsIds(state), verb, trip.code),
    }),
    toast: status === "completed" ? `${trip.code} completed` : `${trip.code} cancelled`,
  };
}

export function applyAddFuel(state: FleetState, input: NewFuel): ActionResult {
  const vehicle = state.vehicles.find((item) => item.id === input.vehicleId);
  if (!vehicle) return { ok: false, state, toast: "Choose a vehicle." };
  if (input.litres <= 0 || input.costInr < 0 || input.odometer <= 0 || !input.station.trim()) {
    return { ok: false, state, toast: "Enter litres, cost, odometer, and a station." };
  }
  const entry = {
    id: uid("f"),
    vehicleId: vehicle.id,
    driverId: input.driverId,
    at: new Date().toISOString(),
    litres: input.litres,
    costInr: Math.round(input.costInr),
    odometer: Math.round(input.odometer),
    station: input.station.trim(),
  };
  const vehicles = state.vehicles.map((item) =>
    item.id === vehicle.id ? { ...item, odometer: Math.max(item.odometer, entry.odometer) } : item,
  );
  return {
    ok: true,
    state: withAudit(state, actorName(state), "Fuel logged", `${vehicle.regNo} · ${entry.litres} L`, {
      fuel: [entry, ...state.fuel],
      vehicles,
      notices: pushNotice(state.notices, opsIds(state), "Fuel logged", `${vehicle.regNo} · ${entry.station}`),
    }),
    toast: "Fuel entry saved",
  };
}

export function applyAddExpense(state: FleetState, input: NewExpense): ActionResult {
  if (input.amountInr <= 0) return { ok: false, state, toast: "Enter an amount." };
  const vehicle = state.vehicles.find((item) => item.id === input.vehicleId);
  if (!vehicle) return { ok: false, state, toast: "Choose a vehicle." };
  const expense = {
    id: uid("e"),
    vehicleId: input.vehicleId,
    driverId: input.driverId,
    at: new Date().toISOString(),
    category: input.category,
    amountInr: Math.round(input.amountInr),
    note: input.note.trim() || input.category,
  };
  return {
    ok: true,
    state: withAudit(state, actorName(state), "Expense logged", `${vehicle.regNo} · ${expense.category}`, {
      expenses: [expense, ...state.expenses],
    }),
    toast: "Expense saved",
  };
}

export function applyAddJob(state: FleetState, input: NewJob): ActionResult {
  const vehicle = state.vehicles.find((item) => item.id === input.vehicleId);
  if (!vehicle || !input.title.trim() || !input.dueOn) return { ok: false, state, toast: "Vehicle, job, and due date are required." };
  const job = {
    id: uid("m"),
    vehicleId: vehicle.id,
    title: input.title.trim(),
    dueOn: input.dueOn,
    status: "scheduled" as const,
    costInr: null,
    odometer: null,
    notes: input.notes.trim(),
    completedOn: null,
  };
  const driverUser = driverUserId(state, vehicle.driverId);
  const notify = opsIds(state);
  if (driverUser) notify.push(driverUser);
  return {
    ok: true,
    state: withAudit(state, actorName(state), "Maintenance scheduled", `${vehicle.regNo} · ${job.title}`, {
      maintenance: [job, ...state.maintenance],
      notices: pushNotice(state.notices, notify, "Maintenance due", `${job.title} · ${vehicle.regNo}`),
    }),
    toast: "Maintenance scheduled",
  };
}

export function applyCompleteJob(state: FleetState, jobId: string, costInr: number): ActionResult {
  const job = state.maintenance.find((item) => item.id === jobId);
  if (!job || job.status === "completed") return { ok: false, state, toast: "That job is already closed." };
  if (costInr < 0 || Number.isNaN(costInr)) return { ok: false, state, toast: "Enter the cost." };
  const vehicle = state.vehicles.find((item) => item.id === job.vehicleId);
  const maintenance = state.maintenance.map((item) =>
    item.id === jobId
      ? {
          ...item,
          status: "completed" as const,
          costInr: Math.round(costInr),
          completedOn: isoDate(0),
          odometer: vehicle?.odometer ?? null,
        }
      : item,
  );
  return {
    ok: true,
    state: withAudit(state, actorName(state), "Maintenance completed", `${vehicle?.regNo ?? "Vehicle"} · ${job.title}`, {
      maintenance,
    }),
    toast: "Job closed",
  };
}

export function applyReadNotices(state: FleetState, userId: string): FleetState {
  return {
    ...state,
    notices: state.notices.map((notice) => (notice.userId === userId ? { ...notice, read: true } : notice)),
    rev: state.rev + 1,
  };
}
