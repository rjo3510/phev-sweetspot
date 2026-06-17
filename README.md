# PHEV Sweetspot Calculator

A small, beautiful web app for plug-in hybrid (PHEV) drivers: enter current fuel and
electricity prices plus your consumption, and instantly see whether you should **drive on
fuel or on electric power** — visualised as the crossing point ("sweetspot") of two cost graphs.

![concept](docs/concept.svg)

## What it does

- Compares fuel vs. electricity as an **equivalent price in one familiar unit** (CHF/l or
  CHF/kWh): the verdict shows your actual price next to the other option translated into the
  same unit, plus the real cost per 100 km.
- The **chart** is a 2D break-even map: fuel price on one axis (CHF/l), electricity price on
  the other (CHF/kWh). The diagonal **break-even line** is where both cost the same; below it
  charging wins, above it fuel wins. A **current-position dot** marks your prices and a
  **sweetspot marker** sits on the line at the tipping price, so you see at a glance which
  side you're on and how far away the sweetspot is.
- A chart **toggle** swaps which price is on the x-axis (fuel ↔ electricity).
- **Current fuel price** — a single global value (with quick −/+ buttons) shown at the top.
  Fuel price changes often and is the same at the pump for every scenario, so you set it
  once and it applies everywhere.
- **Scenarios** (Winter, Summer, With trailer, …) — fully editable named presets, each
  holding a consumption profile (l/100km and kWh/100km). Names are bilingual
  (German + English) and shown in the active UI language.
- **Charging locations** — a list of places, each with its own CHF/kWh price (changes rarely).
  Seeded with Home (0.31), Weekend (0.40) and Public fast charger (0.90).
- **English / German** — switch the whole UI language with the EN/DE toggle (top right).
  Your choice is remembered.
- Everything is stored in a local **SQLite** database and survives restarts. Databases
  created by older versions are migrated automatically on startup.
- **Works offline** — Chart.js, the annotation plugin and the Inter font are self-hosted
  under `app/static/vendor/` and `app/static/fonts/` (no CDN / internet needed).

## The math

```
fuel cost / 100 km     = fuel_consumption (l/100km)  × fuel_price (CHF/l)
electric cost / 100 km = power_consumption (kWh/100km) × kwh_price (CHF/kWh)
break-even fuel price  = (power_consumption × kwh_price) / fuel_consumption
break-even kWh price   = (fuel_consumption × fuel_price) / power_consumption
```

Example: `6.5 × 1.80 = CHF 11.70` (fuel) vs. `21 × 0.31 = CHF 6.51` (electric) →
electric wins; break-even fuel price ≈ `CHF 1.00 / l`. The mirror question — *at fuel
CHF 1.80/l, how expensive can charging get before fuel wins?* — gives the **break-even
kWh price** ≈ `CHF 0.56 / kWh`.

## Setup

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt   # runtime + test deps (app only: requirements.txt)
```

## Run

```bash
.venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --log-config uvicorn_log_config.json
```

Then open http://localhost:8000

## Access control (read-only for everyone, owner edits)

Everyone can **view and play with** the values (live what-if), but only the **owner** can
**persist** changes. All `GET` endpoints are public; every `POST/PUT/DELETE` requires an
owner session. Guests see a read-only UI with a 🔒 *Edit* button; logging in unlocks editing.

Set your own password (the hash is never stored in code):

```bash
python -m app.auth          # prompts for a password, prints the values below
```

Then provide these as environment variables (e.g. in Docker / the reverse proxy):

| Variable | Purpose |
| --- | --- |
| `OWNER_PASSWORD_HASH` | PBKDF2 hash of your edit password (from `python -m app.auth`). |
| `SWEETSPOT_SECRET` | Random secret for signing the session cookie (`python -m app.auth` prints one). |
| `COOKIE_SECURE` | Set to `1` when served over HTTPS so the session cookie is `Secure`. |

If `OWNER_PASSWORD_HASH` is unset, a **default dev password** (`sweetspot`) is used and a
warning is logged — never expose the app publicly without setting it. Login attempts are
rate-limited per IP (brute-force protection).

## Test

```bash
.venv/bin/python -m pytest -q
```

## Project layout

```
app/
  main.py        FastAPI app + REST API
  auth.py        owner login, password hashing, session cookies (also a CLI: python -m app.auth)
  calc.py        pure cost math (unit-tested)
  models.py      SQLAlchemy models (Scenario, ChargingLocation, Settings)
  schemas.py     Pydantic schemas
  crud.py        DB access + first-run seeding
  database.py    engine / session / Base
  templates/index.html
  static/css/styles.css
  static/js/app.js
  static/vendor/ self-hosted Chart.js + annotation plugin (offline)
  static/fonts/  self-hosted Inter font (offline)
tests/test_calc.py
Dockerfile               container image
docker-compose.yml       runs the GHCR image (production)
docker-compose.build.yml  offline override: build on the host instead of pulling
ship.sh                  trigger a deploy on the server over SSH
bundle.sh                offline fallback: source tarball
DEPLOY.md                deployment guide (NPM, HTTPS, GHCR, rollback)
.github/workflows/deploy.yml   CI: build image on push to main, push to GHCR
```

## API

All `GET` endpoints are public; every `POST/PUT/DELETE` (except login/logout) requires an
owner session — see [Access control](#access-control-read-only-for-everyone-owner-edits).

| Method | Path | Purpose | Owner only |
| --- | --- | --- | --- |
| GET | `/api/me` | current auth state (logged in?) | — |
| POST | `/api/login` | log in as owner (rate-limited per IP) | — |
| POST | `/api/logout` | clear the owner session | — |
| GET/POST | `/api/scenarios` | list / create scenarios | POST |
| PUT/DELETE | `/api/scenarios/{id}` | update / delete | yes |
| GET/POST | `/api/locations` | list / create charging locations | POST |
| PUT/DELETE | `/api/locations/{id}` | update / delete | yes |
| GET/PUT | `/api/settings` | read / update the global fuel price | PUT |
| GET | `/api/calculate?scenario_id=&location_id=` | compute the comparison | — |

## Deployment

CI builds the image and the server pulls it — no manual tarball, no build on the host.
Full guide (Nginx Proxy Manager, HTTPS, GHCR login, rollback): **[`DEPLOY.md`](DEPLOY.md)**.

```
git push  ──▶  GitHub Actions builds & pushes  ──▶  ghcr.io/rjo3510/phev-sweetspot
                                                          │
                                    ./ship.sh  ──ssh──▶  server: docker compose pull && up -d
```

```bash
git push                             # GitHub Actions builds & pushes the image to GHCR
PHEV_SERVER=user@phev-host ./ship.sh # pull the new image on the server and restart
```

`./ship.sh` runs from any machine that can SSH to the server (the dev VM can't reach it).
The app listens on container port `8000`, is published on the host as `http://<host>:8082`
(`APP_PORT`), and is also reachable by container name (`phev-sweetspot`) on the proxy network.
