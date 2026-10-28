import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { clock, label, when } from "../lib/format";
import { useFleet } from "../store/fleet";

const NAV = [
  { to: "/", label: "Overview", end: true },
  { to: "/map", label: "Live map" },
  { to: "/vehicles", label: "Vehicles" },
  { to: "/drivers", label: "Drivers" },
  { to: "/trips", label: "Trips" },
  { to: "/fuel", label: "Fuel" },
  { to: "/maintenance", label: "Maintenance" },
  { to: "/reports", label: "Reports" },
  { to: "/audit", label: "Audit log" },
];

const TITLES: Record<string, string> = {
  "/": "Overview",
  "/map": "Live map",
  "/vehicles": "Vehicles",
  "/drivers": "Drivers",
  "/trips": "Trips",
  "/fuel": "Fuel",
  "/maintenance": "Maintenance",
  "/reports": "Reports",
  "/audit": "Audit log",
};

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return <span className="mono">{clock(now)} IST</span>;
}

export function Shell() {
  const { sessionUser, notices, vehicles, logout, resetDemo, markNoticesRead } = useFleet();
  const location = useLocation();
  const navigate = useNavigate();
  const [bell, setBell] = useState(false);
  const [account, setAccount] = useState(false);
  const mine = notices.filter((notice) => notice.userId === sessionUser?.id);
  const unread = mine.filter((notice) => !notice.read).length;
  const moving = vehicles.filter((vehicle) => vehicle.status === "moving" && vehicle.speedKmh >= 1).length;
  const title = TITLES[location.pathname] ?? "Fleet";

  useEffect(() => {
    document.title = `${title} · Samvanta Fleet`;
  }, [title]);

  useEffect(() => {
    if (!bell && !account) return;
    const close = () => {
      setBell(false);
      setAccount(false);
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [bell, account]);

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <img className="brand-mark" src="/art/vehicle-truck.jpg?v=2" alt="" />
          <span className="kicker on-dark">Samvanta</span>
          <strong>Fleet</strong>
        </div>
        <nav>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? "active" : undefined)}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          <div>
            <span className="live-dot" />
            {moving} moving
          </div>
          <span>MVP · web portal + driver app</span>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <span className="kicker">Samvanta Fleet</span>
          <div className="topbar-actions">
            <Clock />
            <div className="menu-wrap" onClick={(event) => event.stopPropagation()}>
              <button type="button" className="btn" onClick={() => { setAccount(false); setBell((open) => !open); }}>
                Alerts {unread > 0 ? <span className="badge">{unread}</span> : null}
              </button>
              {bell ? (
                <div className="menu">
                  {mine.length === 0 ? <p className="empty">No alerts yet.</p> : null}
                  {mine.slice(0, 8).map((notice) => (
                    <div className="item" key={notice.id}>
                      <strong>{notice.title}</strong>
                      <span>
                        {notice.body} · {when(notice.at)}
                      </span>
                    </div>
                  ))}
                  {unread > 0 ? (
                    <button type="button" onClick={markNoticesRead}>
                      Mark read
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="menu-wrap" onClick={(event) => event.stopPropagation()}>
              <button type="button" className="btn" onClick={() => { setBell(false); setAccount((open) => !open); }}>
                {sessionUser?.name}
              </button>
              {account ? (
                <div className="menu">
                  <div className="item">
                    <strong>{sessionUser?.name}</strong>
                    <span>{sessionUser ? label(sessionUser.role) : ""}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Restore the original demo fleet in this browser?")) resetDemo();
                      setAccount(false);
                    }}
                  >
                    Restore demo data
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      navigate("/login");
                    }}
                  >
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <div className={location.pathname === "/map" ? "content bleed" : "content"}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
