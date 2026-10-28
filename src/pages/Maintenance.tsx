import { useState } from "react";
import { Modal, PageHead, Pill } from "../components/ui";
import { day, inr, label } from "../lib/format";
import { vehicleReg } from "../lib/lookup";
import { jobTone } from "../lib/metrics";
import { useFleet } from "../store/fleet";

export function MaintenancePage() {
  const fleet = useFleet();
  const [filter, setFilter] = useState<"open" | "overdue" | "completed" | "all">("open");
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState<string | null>(null);
  const rows = fleet.maintenance.filter((job) => {
    const tone = jobTone(job);
    if (filter === "all") return true;
    if (filter === "open") return tone !== "completed";
    return tone === filter;
  });

  return (
    <>
      <div className="page-scene">
        <img src="/art/scene-service.jpg?v=2" alt="Mechanic working on an engine in a workshop" />
        <PageHead title="Maintenance" lede="Schedules, workshop history, cost, and due-date alerts.">
        <button type="button" className="btn primary" onClick={() => setOpen(true)}>
          Schedule job
        </button>
      </PageHead>
      </div>
      <div className="chips" style={{ marginBottom: 12 }}>
        {(
          [
            ["open", "Open"],
            ["overdue", "Overdue"],
            ["completed", "Completed"],
            ["all", "All"],
          ] as const
        ).map(([item, text]) => (
          <button key={item} type="button" className="btn" aria-pressed={filter === item} onClick={() => setFilter(item)}>
            {text}
          </button>
        ))}
      </div>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Job</th>
              <th>Vehicle</th>
              <th>Due</th>
              <th>Status</th>
              <th>Cost</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((job) => {
              const tone = jobTone(job);
              return (
                <tr key={job.id}>
                  <td>
                    {job.title}
                    <span className="sub">{job.notes}</span>
                  </td>
                  <td className="plate">{vehicleReg(fleet.vehicles, job.vehicleId)}</td>
                  <td>{day(job.dueOn)}</td>
                  <td>
                    <Pill tone={tone}>{tone === "overdue" ? "Overdue" : label(tone)}</Pill>
                  </td>
                  <td>{job.costInr === null ? "—" : inr(job.costInr)}</td>
                  <td>
                    {tone !== "completed" ? (
                      <button type="button" className="btn" onClick={() => setClosing(job.id)}>
                        Close job
                      </button>
                    ) : (
                      <span className="sub">{job.completedOn ? day(job.completedOn) : ""}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="empty">No jobs in this view.</p> : null}
      </div>
      {open ? <JobForm onClose={() => setOpen(false)} /> : null}
      {closing ? <CloseJob jobId={closing} onClose={() => setClosing(null)} /> : null}
    </>
  );
}

function JobForm({ onClose }: { onClose: () => void }) {
  const { vehicles, addJob } = useFleet();
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? "");
  const [title, setTitle] = useState("Oil service");
  const [dueOn, setDueOn] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <Modal title="Schedule maintenance" onClose={onClose}>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          if (addJob({ vehicleId, title, dueOn, notes })) onClose();
        }}
      >
        <label className="field">
          Vehicle
          <select value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.regNo} · {vehicle.city}
              </option>
            ))}
          </select>
        </label>
        <div className="form-grid">
          <label className="field">
            Job
            <input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label className="field">
            Due date
            <input type="date" value={dueOn} onChange={(event) => setDueOn(event.target.value)} required />
          </label>
        </div>
        <label className="field">
          Notes
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" type="submit">
            Schedule
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CloseJob({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const { completeJob } = useFleet();
  const [cost, setCost] = useState(4500);
  return (
    <Modal title="Close job" onClose={onClose}>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          if (completeJob(jobId, cost)) onClose();
        }}
      >
        <label className="field">
          Cost (INR)
          <input type="number" min={0} value={cost} onChange={(event) => setCost(Number(event.target.value))} />
        </label>
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" type="submit">
            Mark complete
          </button>
        </div>
      </form>
    </Modal>
  );
}
