import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createSeed, SEED_VERSION } from "../data/seed";
import type {
  ActionResult,
  FleetState,
  NewDriver,
  NewExpense,
  NewFuel,
  NewJob,
  NewTrip,
  NewVehicle,
  PublicUser,
  Role,
  VehicleStatus,
} from "../types";
import {
  applyAddDriver,
  applyAddExpense,
  applyAddFuel,
  applyAddJob,
  applyAddVehicle,
  applyAssign,
  applyCancelTrip,
  applyCompleteJob,
  applyCompleteTrip,
  applyCreateTrip,
  applyLogin,
  applyLogout,
  applyReadNotices,
  applyStartTrip,
  applyVehicleStatus,
} from "./actions";
import { advanceFleet } from "./motion";

const STORAGE_KEY = "samvanta-fleet-mvp-v1";

type LoginResult = { error: string } | { role: Role };

type FleetApi = {
  vehicles: FleetState["vehicles"];
  drivers: FleetState["drivers"];
  trips: FleetState["trips"];
  fuel: FleetState["fuel"];
  expenses: FleetState["expenses"];
  maintenance: FleetState["maintenance"];
  audit: FleetState["audit"];
  notices: FleetState["notices"];
  trails: FleetState["trails"];
  sessionUser: PublicUser | null;
  toast: string | null;
  login: (email: string, password: string) => LoginResult;
  logout: () => void;
  dismissToast: () => void;
  resetDemo: () => void;
  addVehicle: (input: NewVehicle) => boolean;
  addDriver: (input: NewDriver) => boolean;
  assignDriver: (vehicleId: string, driverId: string | null) => boolean;
  setVehicleStatus: (vehicleId: string, status: VehicleStatus) => boolean;
  createTrip: (input: NewTrip) => boolean;
  startTrip: (tripId: string) => boolean;
  completeTrip: (tripId: string) => boolean;
  cancelTrip: (tripId: string) => boolean;
  addFuel: (input: NewFuel) => boolean;
  addExpense: (input: NewExpense) => boolean;
  addJob: (input: NewJob) => boolean;
  completeJob: (jobId: string, costInr: number) => boolean;
  markNoticesRead: () => void;
};

const FleetContext = createContext<FleetApi | null>(null);

function loadState(): FleetState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeed();
    const parsed = JSON.parse(raw) as FleetState;
    if (parsed.seedVersion !== SEED_VERSION || !Array.isArray(parsed.vehicles)) return createSeed();
    return parsed;
  } catch {
    return createSeed();
  }
}

function persist(state: FleetState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The demo keeps running in memory if storage is full.
  }
}

function publish(user: FleetState["users"][number]): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    driverId: user.driverId,
  };
}

export function FleetProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FleetState>(loadState);
  const [toast, setToast] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const id = window.setInterval(() => {
      setState((current) => advanceFleet(current));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    persist(state);
  }, [state.rev]);

  useEffect(() => {
    const id = window.setInterval(() => persist(stateRef.current), 8000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const api = useMemo<FleetApi>(() => {
    const run = (apply: (current: FleetState) => ActionResult) => {
      const result = apply(stateRef.current);
      stateRef.current = result.state;
      setState(result.state);
      if (result.toast) setToast(result.toast);
      return result;
    };

    return {
      vehicles: state.vehicles,
      drivers: state.drivers,
      trips: state.trips,
      fuel: state.fuel,
      expenses: state.expenses,
      maintenance: state.maintenance,
      audit: state.audit,
      notices: state.notices,
      trails: state.trails,
      sessionUser: state.users.find((user) => user.id === state.sessionUserId)
        ? publish(state.users.find((user) => user.id === state.sessionUserId)!)
        : null,
      toast,
      dismissToast: () => setToast(null),
      login: (email, password) => {
        const result = run((current) => applyLogin(current, email, password));
        const user = result.state.users.find((item) => item.id === result.state.sessionUserId);
        if (!result.ok || !user) return { error: result.toast || "Those credentials are not in the demo." };
        return { role: user.role };
      },
      logout: () => {
        run(applyLogout);
      },
      resetDemo: () => {
        const fresh = createSeed();
        fresh.sessionUserId = stateRef.current.sessionUserId;
        fresh.rev = stateRef.current.rev + 1;
        stateRef.current = fresh;
        setState(fresh);
        setToast("Demo data restored");
      },
      addVehicle: (input) => run((current) => applyAddVehicle(current, input)).ok,
      addDriver: (input) => run((current) => applyAddDriver(current, input)).ok,
      assignDriver: (vehicleId, driverId) => run((current) => applyAssign(current, vehicleId, driverId)).ok,
      setVehicleStatus: (vehicleId, status) => run((current) => applyVehicleStatus(current, vehicleId, status)).ok,
      createTrip: (input) => run((current) => applyCreateTrip(current, input)).ok,
      startTrip: (tripId) => run((current) => applyStartTrip(current, tripId)).ok,
      completeTrip: (tripId) => run((current) => applyCompleteTrip(current, tripId)).ok,
      cancelTrip: (tripId) => run((current) => applyCancelTrip(current, tripId)).ok,
      addFuel: (input) => run((current) => applyAddFuel(current, input)).ok,
      addExpense: (input) => run((current) => applyAddExpense(current, input)).ok,
      addJob: (input) => run((current) => applyAddJob(current, input)).ok,
      completeJob: (jobId, costInr) => run((current) => applyCompleteJob(current, jobId, costInr)).ok,
      markNoticesRead: () => {
        const userId = stateRef.current.sessionUserId;
        if (!userId) return;
        const next = applyReadNotices(stateRef.current, userId);
        stateRef.current = next;
        setState(next);
      },
    };
  }, [state, toast]);

  return <FleetContext.Provider value={api}>{children}</FleetContext.Provider>;
}

export function useFleet() {
  const value = useContext(FleetContext);
  if (!value) throw new Error("useFleet must be used inside FleetProvider");
  return value;
}
