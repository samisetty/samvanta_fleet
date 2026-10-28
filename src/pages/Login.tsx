import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { DEMO_ACCOUNTS } from "../data/seed";
import { label } from "../lib/format";
import { useFleet } from "../store/fleet";

export function LoginPage() {
  const { sessionUser, login } = useFleet();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Sign in · Samvanta Fleet";
  }, []);

  if (sessionUser) {
    return <Navigate to={sessionUser.role === "driver" ? "/drive" : "/"} replace />;
  }

  function signIn(nextEmail: string, nextPassword: string) {
    setEmail(nextEmail);
    setPassword(nextPassword);
    const result = login(nextEmail, nextPassword);
    setError("error" in result ? result.error : "");
  }

  return (
    <div className="login">
      <section className="login-brand">
        <div>
          <span className="kicker on-dark">Samvanta · SAM-FMS-2026-002</span>
          <h1>Fleet</h1>
          <p>Operations portal and driver app for a 100–500 vehicle fleet. This MVP runs a 36-vehicle slice in the browser.</p>
          <ul>
            <li>Live map, last-known location, and ping history</li>
            <li>Vehicles, drivers, documents, and assignments</li>
            <li>Trip scheduling, start, and completion</li>
            <li>Fuel, expenses, and efficiency</li>
            <li>Maintenance due dates and cost history</li>
            <li>Role access, reports, and an audit log</li>
          </ul>
        </div>
        <p className="kicker on-dark">Simulated telematics · no data leaves this browser</p>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <span className="kicker">Sign in</span>
          <h2>Open the fleet</h2>
          <p className="lede">Password for every demo account is demo123.</p>
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              signIn(email, password);
            }}
          >
            <label className="field">
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" type="email" required />
            </label>
            <label className="field">
              Password
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                type="password"
                required
              />
            </label>
            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}
            <button className="btn primary" type="submit">
              Sign in
            </button>
          </form>
          <div className="account-pick">
            {DEMO_ACCOUNTS.map((account) => (
              <button key={account.email} type="button" onClick={() => signIn(account.email, account.password)}>
                <span>
                  <b>{account.name}</b>
                  {account.blurb}
                </span>
                <span>{label(account.role)}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
