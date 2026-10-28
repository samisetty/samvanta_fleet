# Samvanta Fleet

MVP of the fleet platform in `Samvanta_Fleet_Management_Commercial_Proposal.pdf` (SAM-FMS-2026-002).

The demo runs in the browser: an operations portal and a driver phone view, with a simulated 36-vehicle fleet. Positions, phone GPS, and telematics pings are generated locally. Nothing is sent to a server. Production scope still includes the Flutter apps, a GPS vendor feed, and the Azure hot-DR environment.

```bash
npm install
npm run dev
```

Open the URL Vite prints (port 5180). Password for every account is `demo123`.

| Email | Role |
| --- | --- |
| ops@samvanta.demo | Operations admin |
| fleet@samvanta.demo | Fleet manager |
| driver@samvanta.demo | Driver (Imran Qureshi) |

Sign in as the driver and start trip TR-2448 to see phone GPS, then end the trip. Map pins move faster than the speed reading so a city route is visible in about a minute. Use **Restore demo data** in the account menu to reset this browser.
