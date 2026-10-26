# Frontend — monitoring dashboard

React dashboard for the Smart Monitoring Platform, built with Vite.

Full setup and run instructions for the whole system are in the
[root README](../README.md). This file covers the frontend only.

## Run

```bash
npm ci
cp .env.example .env    # set VITE_API_URL if the backend is not on :3000
npm run dev
```

Opens on <http://localhost:5173>. It expects the backend to be running
on the address in `VITE_API_URL`, otherwise the dashboard shows
"Unable to connect to the monitoring backend."

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run lint` | ESLint over the whole project |

## Layout

```
src/
  App.jsx            page shell, polls the backend every 5 seconds
  services/api.js    every backend call lives here
  components/
    DashboardSummary.jsx   the four count cards at the top
    ServiceList.jsx        one row per monitored service, UP / DOWN
    MetricChart.jsx        response time, one line per service
    MetricList.jsx         the 20 most recent measurements
    EventList.jsx          status changes and HTTP errors
    AnomalyList.jsx        what the AI service flagged
```

`App.jsx` owns all state. Components receive it as props and do no
fetching of their own.
