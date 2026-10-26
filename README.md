# Smart Monitoring Platform

A monitoring dashboard that watches two example web services, records how they
respond, stores the results in PostgreSQL, and shows them in a React dashboard.
A small Python service looks at the recorded numbers and flags unusual ones.

## What the system is

Five programs run at the same time. Each one has a job:

| # | Component | Port | What it does |
|---|-----------|------|--------------|
| 1 | `orders-api` | 3001 | A pretend service to be monitored. Can be told to be slow or to fail. |
| 2 | `proucts-api` | 3002 | A second pretend service. Same idea. |
| 3 | `backend` | 3000 | Checks both services every 5 seconds, saves results to PostgreSQL, serves the API the dashboard reads. |
| 4 | `ai` | 5001 | Python service. Reads recent measurements and writes anomalies it considers unusual. |
| 5 | `frontend` | 5173 | The React dashboard you look at in a browser. |

How they connect:

```
  frontend (5173)
       |  reads /api/... over HTTP
       v
  backend (3000) ----- checks /health every 5s -----> orders-api   (3001)
       |          \---- checks /health every 5s -----> proucts-api  (3002)
       |
       |  writes metrics / events / anomalies
       v
  PostgreSQL (monitoring_db)
       ^
       |  reads recent metrics, writes anomalies
       |
  ai (5001)  <---- backend asks it to analyse, every 60s
```

The backend is the only component that talks to everything else. The AI service
never talks to the dashboard directly; it only reads and writes the database, and
the backend triggers it on a timer.

## Prerequisites

- **PostgreSQL** 14 or newer
- **Node.js** 18 or newer (tested on 24)
- **Python** 3.10 or newer (tested on 3.12)

## Setup

Do these once.

**1. Create the database.** The name must be exactly `monitoring_db`:

```bash
psql -U postgres -c "CREATE DATABASE monitoring_db;"
```

**2. Create the tables:**

```bash
psql -U postgres -d monitoring_db -f database/schema.sql
```

This is safe to run more than once — it will not duplicate anything.

> **If you already have a database from an older version of this project**, do
> **not** run the command above first. Back up, then run the migration:
>
> ```bash
> pg_dump -U postgres monitoring_db > backup_before_migration.sql
> psql -U postgres -d monitoring_db -f database/migrations/001_align_existing_database.sql
> ```
>
> The migration is described in full at the top of that file. It is safe to run
> twice.

**3. Create the three config files.** Copy each example and fill in your real
PostgreSQL password:

```bash
cp backend/.env.example  backend/.env
cp ai/.env.example       ai/.env
cp frontend/.env.example frontend/.env
```

`DB_NAME` must read `monitoring_db` in **both** `backend/.env` and `ai/.env`. If
they disagree, the AI reads one database and writes to another, and everything
looks fine while nothing works.

These `.env` files hold your password. Never commit them.

**4. Install dependencies:**

```bash
cd backend      && npm ci && cd ..
cd orders-api   && npm ci && cd ..
cd proucts-api  && npm ci && cd ..
cd frontend     && npm ci && cd ..
cd ai           && pip install -r requirements.txt && cd ..
```

## Run

Five terminals, started in this order. The backend expects the others to exist.

```bash
# Terminal 1  - port 3001
cd orders-api && npm start

# Terminal 2  - port 3002
cd proucts-api && npm start

# Terminal 3  - port 5001
cd ai && python ai_service.py

# Terminal 4  - port 3000
cd backend && npm start

# Terminal 5  - port 5173
cd frontend && npm run dev
```

Then open <http://localhost:5173>.

## Verify it works

**Check the AI service is alive** before trusting the dashboard:

```bash
curl http://localhost:5001/health
```

Expected:

```json
{"service":"AI anomaly detector","status":"UP"}
```

**A healthy backend terminal** looks like this:

```
Server running on http://localhost:3000
Automatic monitoring started
[Monitoring] Checked 2 services
[Monitoring] Orders API: UP - 15 ms
[Monitoring] Products API: UP - 8 ms
[AI] Analysis completed: {
  anomalies_detected: 0,
  anomalies_inserted: 0,
  metrics_analyzed: 24,
  success: true
}
```

The `[Monitoring]` lines repeat every 5 seconds. The `[AI]` line appears every 60
seconds. If you see `[AI] Analysis unavailable` instead, the Python service on
port 5001 is not running or not reachable.

**Check data is being saved:**

```bash
psql -U postgres -d monitoring_db -c "SELECT count(*), count(cpu_usage) FROM metrics;"
```

Both numbers should be equal and growing. If `count(cpu_usage)` is 0, the backend
is saving measurements but not system statistics.

## Demonstrating it: the simulate endpoints

Each mock service can be told to misbehave, so you can show the monitoring
actually working. These are the endpoints to use in a demo.

```bash
# Make orders-api fail with HTTP 500
curl -X POST http://localhost:3001/simulate/error

# Make orders-api take 3 seconds to respond
curl -X POST http://localhost:3001/simulate/slow

# Back to normal
curl -X POST http://localhost:3001/simulate/normal

# Ask what mode it is currently in
curl http://localhost:3001/status
```

`proucts-api` on port 3002 has the same four endpoints (its slow mode is 2
seconds instead of 3).

What each one demonstrates:

| Command | What you should see, within ~10 seconds |
|---------|------------------------------------------|
| `simulate/error` | The service turns **DOWN** on the dashboard. One `SERVICE_DOWN` event and one `HTTP_ERROR` event appear — **one each, not one per check**. |
| `simulate/slow` | The service stays **UP**, but a `HIGH_RESPONSE_TIME` event appears and an anomaly is recorded with value ≈3000 and expected 1000. The Response Time chart shows one line rising while the other stays flat. |
| `simulate/normal` | One `SERVICE_RECOVERED` event appears, and the service returns to **UP**. |

The "one each, not one per check" part is deliberate. A service that is down gets
checked twelve times a minute, and earlier versions of this project wrote twelve
identical events every minute. Events are now only written when the situation
actually changes.

This holds for both ways a service can fail: returning HTTP 500 (what
`simulate/error` does) and being unreachable entirely. To see the second, stop
the `orders-api` terminal with Ctrl+C. You get one `SERVICE_DOWN` event and one
anomaly, not one of each every five seconds, and starting it again gives one
`SERVICE_RECOVERED`.

## Project layout

```
backend/          Express API + the monitoring loop (Node, CommonJS)
  src/server.js       starts the HTTP server and the monitoring timer
  src/services/       the checking logic, scheduler, AI trigger
  src/controllers/    what each API endpoint returns
  src/routes/         which URL maps to which controller
ai/               Flask service that detects unusual measurements (Python)
frontend/         React dashboard built with Vite
orders-api/       mock service on 3001
proucts-api/      mock service on 3002   (folder name is misspelled; the
                                          service calls itself products-api)
database/
  schema.sql            creates the tables
  migrations/           for upgrading an existing database
```

## Known limitation

The anomaly detector uses Isolation Forest, which ranks rows as unusual *within
each batch it is given*. It has no model of what normal looks like, so on a
completely healthy system it still reports roughly two low-value anomalies a
minute — real new maximum readings, but not interesting ones. The rule-based
checks (service down, HTTP error, slow response) are separate from the AI and
are what reliably catch real outages.

Training the model on a period of known-good data and scoring new measurements
against that would fix it properly. That is a redesign rather than a settings
change, and is out of scope here.
