export type Role = "admin" | "manager" | "driver";

export type VehicleStatus = "moving" | "idle" | "maintenance" | "offline";

export type TripStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export type VehicleType = "Truck" | "Van" | "Car" | "Bus";

export type FuelType = "Diesel" | "Petrol" | "CNG";

export type LocationSource = "telematics" | "phone";

export type LatLng = { lat: number; lng: number };

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  driverId?: string;
};

export type PublicUser = Omit<User, "password">;

export type DocumentRecord = {
  id: string;
  name: string;
  number: string;
  expiresOn: string;
};

export type Vehicle = {
  id: string;
  regNo: string;
  make: string;
  model: string;
  year: number;
  type: VehicleType;
  fuelType: FuelType;
  status: VehicleStatus;
  driverId: string | null;
  odometer: number;
  city: string;
  lat: number;
  lng: number;
  heading: number;
  speedKmh: number;
  cruiseKmh: number;
  lastSeen: string;
  locationSource: LocationSource;
  loop: boolean;
  progress: number;
  routeKm: number;
  animSeconds: number;
  route: LatLng[];
  documents: DocumentRecord[];
};

export type Driver = {
  id: string;
  name: string;
  phone: string;
  licenseNo: string;
  licenseExpiry: string;
  status: "available" | "on_trip" | "off_duty";
  city: string;
};

export type Trip = {
  id: string;
  code: string;
  vehicleId: string;
  driverId: string;
  origin: string;
  destination: string;
  originPoint: LatLng;
  destPoint: LatLng;
  purpose: string;
  scheduledStart: string;
  status: TripStatus;
  startedAt: string | null;
  endedAt: string | null;
  distanceKm: number;
  actualKm: number | null;
};

export type FuelEntry = {
  id: string;
  vehicleId: string;
  driverId: string | null;
  at: string;
  litres: number;
  costInr: number;
  odometer: number;
  station: string;
};

export type ExpenseCategory = "Toll" | "Parking" | "Repair" | "Other";

export type Expense = {
  id: string;
  vehicleId: string;
  driverId: string;
  at: string;
  category: ExpenseCategory;
  amountInr: number;
  note: string;
};

export type MaintenanceJob = {
  id: string;
  vehicleId: string;
  title: string;
  dueOn: string;
  status: "scheduled" | "completed";
  costInr: number | null;
  odometer: number | null;
  notes: string;
  completedOn: string | null;
};

export type AuditEvent = {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail: string;
};

export type Notice = {
  id: string;
  userId: string;
  at: string;
  title: string;
  body: string;
  read: boolean;
};

export type GpsPing = {
  at: string;
  lat: number;
  lng: number;
  speedKmh: number;
  source: LocationSource;
};

export type FleetState = {
  seedVersion: number;
  rev: number;
  sessionUserId: string | null;
  users: User[];
  vehicles: Vehicle[];
  drivers: Driver[];
  trips: Trip[];
  fuel: FuelEntry[];
  expenses: Expense[];
  maintenance: MaintenanceJob[];
  audit: AuditEvent[];
  notices: Notice[];
  trails: Record<string, GpsPing[]>;
};

export type NewVehicle = {
  regNo: string;
  city: string;
  type: VehicleType;
  make: string;
  model: string;
  year: number;
  fuelType: FuelType;
  odometer: number;
};

export type NewDriver = {
  name: string;
  phone: string;
  licenseNo: string;
  licenseExpiry: string;
  city: string;
};

export type NewTrip = {
  vehicleId: string;
  driverId: string;
  originId: string;
  destinationId: string;
  purpose: string;
  scheduledStart: string;
};

export type NewFuel = {
  vehicleId: string;
  driverId: string | null;
  litres: number;
  costInr: number;
  odometer: number;
  station: string;
};

export type NewExpense = {
  vehicleId: string;
  driverId: string;
  category: ExpenseCategory;
  amountInr: number;
  note: string;
};

export type NewJob = {
  vehicleId: string;
  title: string;
  dueOn: string;
  notes: string;
};

export type ActionResult = { state: FleetState; toast: string; ok: boolean };
