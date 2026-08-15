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
# http://localhost:8000  — read-only; editing needs OWNER_PASSWORD_HASH, or
#   ALLOW_DEFAULT_PASSWORD=1 for the dev password "sweetspot"
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
  Cache-Control); the hash is computed in `main.py` from `styles.css` + `app.js` + `theme.js`.
- **Two themes, one palette:** dark and light are the same UI in two token sets — `:root`
  holds the dark palette, `:root[data-theme="light"]` overrides it, and **no colour literal
  lives anywhere else in `styles.css`**. The chart bakes its colours in at draw time, so it
  reads the same tokens via `cssVar()` and is redrawn on a switch (`setTheme()` in `app.js`).
  `theme.js` is loaded **blocking in `<head>`** and stamps `data-theme` before the first paint
  (its own file, not an inline script — the CSP is a strict `script-src 'self'`). The 🌙/☀️
  switch stores the choice in `localStorage.theme`; without a stored choice the app follows
  the system setting and keeps following it while the page is open. Light-mode accents are
  darker on purpose — every text there measures ≥ 4.5:1, keep it that way. **Filled surfaces
  take the `--on-*` ink of their colour:** in light mode that is white, in dark mode it is a
  dark tint (`--on-accent: #0d1233`, like `--on-fuel` / `--on-elec`) — the accent has to stay
  light there to work as text and border on the dark ground, so white on it would only reach
  3:1. Button modifiers (`.btn--ghost`) must sit **after** `.btn` in `styles.css`; same
  specificity, so the later rule wins.
- **Build SHA** shows in the footer (linked to the commit) and is logged at startup;
  CI passes it as the `GIT_SHA` build-arg → `APP_VERSION`.
- **DB migrations** run on startup in `main.py` (`_migrate_*`): additive, idempotent, safe on
  existing data (they backfill, never drop user data).
- **App name is bilingual:** *PHEV Charging Calculator* (en) / *PHEV Kostenvergleich* (de),
  i18n key `app_title` — it drives the `<h1>` and `document.title`, so the browser tab follows
  the language. The repo, image and DB keep the name `phev-sweetspot`.
- **Vocabulary:** **EN says *break-even* throughout** (break-even line / break-even price —
  the term English-speaking PHEV drivers know), **DE says *Kipp-*** (Kipp-Linie, Kipp-Preis,
  Kipp-Punkt as the umbrella term in the subtitle); *Sweetspot* stays in both. The profile
  rows are *Trip / Fahrt* and *Charging / Laden*. The API and `calc.py` keep the
  `break_even_*` names, and so do the i18n keys (`tipping_line`, `bar_tip`) — keys are code,
  not copy. One fixed chart orientation (x = fuel price) — there is no axis toggle any more.
  Chart heading is neutral (*Every price combination / Alle Preiskombinationen*) so it does
  not repeat the subtitle's question.
- **Profiles are chips, not dropdowns** (`renderChips()`): every scenario / location is visible
  without a click, switching is one click and keeps the current fuel price. Each group in
  *Calculation values* is headed by the active record's name, so an edit is never attributed to
  the wrong profile.
- **Charging chips carry the verdict** (`paintLocationChips()`): each location chip is green ⚡
  when its kWh price is at or below the break-even price and amber ⛽ above it — the icon comes
  first, so it is never colour-only; the price and the wording sit in `title` / `aria-label`.
  The active chip follows the (possibly unsaved) input, the others their stored price; repainted
  from every result in `renderAll()`. This replaces the once-planned **comparison table** "all
  locations at a glance" — the break-even price is the same for every location, so the table
  would only have restated each location's price. Don't add one.
- **Prices always show two decimals** — `1.90`, never `1.9`. Both price inputs (fuel price and
  kWh price) are normalised on `blur` (`normalizePriceInput()`), not while typing, and a rounded
  value triggers a recalculation so the shown price is the one being calculated with.
- **No price date:** the fuel price carries no timestamp and no freshness warning — the app
  states what is stored, nothing about its age. Removed on 15.08.2026 including the DB column
  (`_migrate_drop_settings_updated_at` in `main.py`); don't reintroduce it.
- **Verdict:** one sentence (cheaper option · costs · saving · both break-even prices) plus an
  assumptions footnote — see `renderVerdict()`.
- **Yearly figure:** the saving scaled to a year sits right under the sentence (`.verdict__year`,
  i18n `year_save`). The mileage is **hard-wired at 15'000 km** (`ANNUAL_KM` in `app.js`) — the
  whole point is to make "per 100 km" tangible *without* another input field, so don't make it
  editable. Whole francs, thousands grouped per language (`15,000` en / `15'000` de, `fmtInt()`);
  hidden on a tie and whenever it would round to CHF 0.
- **One truth per number:** every value is edited exactly once, in the *Calculation values*
  block. The lists below are name-only management (add / rename / delete) behind a collapsed
  `Manage lists` (`<details class="manage">`). Row saves send the stored numbers along
  unchanged (PUT replaces the whole record).
- **What-if vs. saved:** anyone may edit the inputs, only the owner persists — and nothing is
  stored until Save, the fuel price included (no auto-save on blur). The preview bar is
  **owner-only**: a guest is permanently in what-if mode, so flagging it would state the
  obvious (`updateDirty()` hides the bar unless `isEditor`). For the owner `dirtyParts()`
  drives it: "Not saved yet" + reset + `Save for <targets>`, which lists the records the click
  would write (`saveInputs()`).
- **Price bar (`renderPriceBar()`):** the **main picture**, always visible right under the
  verdict — electricity-price scale, green up to the break-even kWh price, amber beyond, marks
  for "you pay" and the break-even price, headed by `.pbar__title` (i18n `bar_title`). Plain
  DOM/CSS (no Chart.js), scale anchored on the break-even price (`max(bek*1.6, cur*1.25, 0.1)`)
  so it stays put while prices are nudged; on phones the band captions shrink to their icon.
  `renderAll()` keeps verdict, bar and chart on the same result (and stores `lastResult`).
- **Chart:** the deeper 2D view behind the bar, in a `<details id="chart-details">` that is
  **closed by default** (state in `localStorage.chartOpen`). Chart.js cannot size a hidden
  canvas, so `renderChart()` returns early while the disclosure is closed and the toggle
  handler draws it from `lastResult` on open. Full width, **no legend** (every element is
  labelled where it sits), no dashed drop-lines to the axes. The sweetspot is a point on the
  break-even line at the current y; the x-range is anchored on the sweetspot so it stays put
  while the (global) fuel price is nudged.

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
