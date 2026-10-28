import { useEffect, type ReactNode } from "react";
import { useFleet } from "../store/fleet";

export function Pill({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

export function PageHead({ title, lede, children }: { title: string; lede?: string; children?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {lede ? <p>{lede}</p> : null}
      </div>
      {children ? <div className="page-actions">{children}</div> : null}
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <header>
          <h2>{title}</h2>
          <button type="button" className="btn ghost" onClick={onClose}>
            Close
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

export function Toaster() {
  const { toast, dismissToast } = useFleet();
  if (!toast) return null;
  return (
    <div className="toast" role="status">
      <span>{toast}</span>
      <button type="button" onClick={dismissToast}>
        Dismiss
      </button>
    </div>
  );
}

export function Bars({ rows }: { rows: { label: string; value: number; display: string }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  if (rows.length === 0) return <p className="empty">Nothing to chart yet.</p>;
  return (
    <div className="bars">
      {rows.map((row) => (
        <div className="bar-row" key={row.label}>
          <span>{row.label}</span>
          <div className="bar-track">
            <span style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
          <b>{row.display}</b>
        </div>
      ))}
    </div>
  );
}
