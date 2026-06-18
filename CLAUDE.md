# PHEV Sweetspot Calculator

Small web app for plug-in-hybrid drivers: enter fuel/electricity prices + consumption and
see whether driving on fuel or electric is cheaper — visualised as the break-even
**sweetspot** on a 2D chart. Public is **read-only** (live what-if, no saving); the **owner**
logs in to edit. Bilingual **EN/DE**.

## Stack
- **Backend:** FastAPI + SQLAlchemy + SQLite (`app/`). One worker on purpose (in-process login
  rate-limit, single SQLite writer).
- **Frontend:** Jinja template (`app/templates/index.html`) + vanilla JS (`app/static/js/app.js`)
  + Chart.js. Chart.js, its annotation plugin and the Inter font are **self-hosted**
  (`app/static/vendor/`, `app/static/fonts/`) — the app works fully offline.
- **i18n:** `en` + `de` dictionaries in `app.js` (`I18N`), applied via `t(key)` / `data-i18n`.

## Run & test locally
```bash
.venv/bin/python -m uvicorn app.main:app --reload --port 8000 --log-config uvicorn_log_config.json
# http://localhost:8000  — read-only; log in with the dev password "sweetspot" (unset OWNER_PASSWORD_HASH)
.venv/bin/python -m pytest -q          # unit tests for the cost math in app/calc.py
```
Deps: `requirements.txt` is runtime-only (what ships in the image); `requirements-dev.txt`
adds the test deps — install that locally. CI runs `pytest` before building.
The local DB is `sweetspot.db` (gitignored); override its path with `SWEETSPOT_DB`.

## Conventions (please keep)
- **Liter is lowercase `l`** everywhere (`CHF/l`, `l/100km`); `kWh`/`CHF` as-is.
- **Names are bilingual:** scenarios & charging locations have `name_de` + `name_en`; show the
  active language, fall back to the other if one is empty (`dispName()` in `app.js`).
- **German copy is neutral/passive** — no "du"/"Sie".
- **Currency stays `CHF`** (Swiss app; values/units are CHF-specific).
- **Cache-busting:** static assets are loaded as `…?v=<hash>` (StaticFiles sends no
  Cache-Control); the hash is computed in `main.py` from `styles.css` + `app.js`.
- **Build SHA** shows in the footer (linked to the commit) and is logged at startup;
  CI passes it as the `GIT_SHA` build-arg → `APP_VERSION`.
- **DB migrations** run on startup in `main.py` (`_migrate_*`): additive, idempotent, safe on
  existing data (they backfill, never drop user data).
- **Chart:** the sweetspot is a point on the break-even line at the current y; the x-range is
  anchored on the sweetspot so it stays put while the (global) fuel price is nudged.

## Verifying UI changes
No browser test suite. To check a visual/behaviour change, run the app on a spare port and
drive it with headless Chromium via Playwright — **measure** (computed styles, element rects,
`pageerror`/console) and screenshot rather than guessing:
```bash
.venv/bin/python -m pip install playwright pillow     # on demand (not app deps)
sudo snap install chromium                            # on demand
# p.chromium.launch(executable_path="/snap/bin/chromium", args=["--no-sandbox"])
```

## Deploy (full guide: DEPLOY.md)
CI builds the image; the server **pulls** it — nothing is built on the host.
```
git push            # → GitHub Actions builds & pushes ghcr.io/rjo3510/phev-sweetspot
# then on the server (your SSH host, dir ~/phev-sweetspot):
docker compose pull && docker compose up -d      # the owner runs this (alias: dco)
```
- The **dev machine can't reach the server** — don't try to SSH-deploy from here; push and let
  the owner pull (or run `./ship.sh` from a machine that can SSH).
- If the GHCR image is **private**, the server needs a one-time `docker login ghcr.io` (PAT `read:packages`); not needed if the package is public.
- **DB** is the `./data` bind mount next to `docker-compose.yml`.
- `docker-compose.yml` + `.env` live **only on the server** (not in the image) — update by hand.
- Served via Nginx Proxy Manager at https://phev.example.com; `COOKIE_SECURE=1` → HTTPS only.

## Layout
```
app/main.py            FastAPI app, REST API, startup migrations
app/calc.py            pure cost math (unit-tested)
app/{models,schemas,crud,auth,database}.py
app/templates/index.html · app/static/{css,js,vendor,fonts}
tests/test_calc.py
Dockerfile · docker-compose.yml · docker-compose.build.yml (offline) · .env.example
ship.sh (deploy trigger) · bundle.sh (offline tarball) · DEPLOY.md
.github/workflows/deploy.yml   CI: build & push image to GHCR
```
