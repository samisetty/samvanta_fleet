import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "./components/ui";
import { AuditPage } from "./pages/Audit";
import { Dashboard } from "./pages/Dashboard";
import { DriverApp } from "./pages/DriverApp";
import { DriversPage } from "./pages/Drivers";
import { FuelPage } from "./pages/Fuel";
import { LiveMapPage } from "./pages/LiveMap";
import { LoginPage } from "./pages/Login";
import { MaintenancePage } from "./pages/Maintenance";
import { ReportsPage } from "./pages/Reports";
import { Shell } from "./pages/Shell";
import { TripsPage } from "./pages/Trips";
import { VehiclesPage } from "./pages/Vehicles";
import { FleetProvider, useFleet } from "./store/fleet";
import type { ReactNode } from "react";

function Guard({ children, driver }: { children: ReactNode; driver?: boolean }) {
  const { sessionUser } = useFleet();
  const location = useLocation();
  if (!sessionUser) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (sessionUser.role === "driver" && !driver) return <Navigate to="/drive" replace />;
  if (sessionUser.role !== "driver" && driver) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/drive"
          element={
            <Guard driver>
              <DriverApp />
            </Guard>
          }
        />
        <Route
          element={
            <Guard>
              <Shell />
            </Guard>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="map" element={<LiveMapPage />} />
          <Route path="vehicles" element={<VehiclesPage />} />
          <Route path="drivers" element={<DriversPage />} />
          <Route path="trips" element={<TripsPage />} />
          <Route path="fuel" element={<FuelPage />} />
          <Route path="maintenance" element={<MaintenancePage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="audit" element={<AuditPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <FleetProvider>
        <AppRoutes />
      </FleetProvider>
    </BrowserRouter>
  );
}
