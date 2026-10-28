import { PageHead } from "../components/ui";
import { when } from "../lib/format";
import { useFleet } from "../store/fleet";

export function AuditPage() {
  const { audit } = useFleet();
  return (
    <>
      <PageHead title="Audit log" lede="Sign-in, assignments, trips, fuel, and maintenance. The latest action is at the top." />
      <ol className="audit">
        {audit.map((event) => (
          <li key={event.id}>
            <time className="mono">{when(event.at)}</time>
            <div>
              <b>{event.action}</b>
              <span>{event.actor}</span>
              <p>{event.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
