"""FastAPI application: serves the UI and the JSON API."""
from __future__ import annotations

import hashlib
import logging
import os
import time

from fastapi import Cookie, Depends, FastAPI, HTTPException, Response
from fastapi.requests import Request
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import text
from sqlalchemy.orm import Session

from . import auth, calc, crud, models, schemas
from .database import Base, SessionLocal, engine, get_db

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
COOKIE_NAME = "edit_session"
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "").lower() in ("1", "true", "yes")
# Publish the interactive API docs (/docs,/redoc,/openapi.json)? Off by default; the
# write-endpoint schema is not interesting to the public. Set ENABLE_DOCS=1 for dev.
ENABLE_DOCS = os.environ.get("ENABLE_DOCS", "").lower() in ("1", "true", "yes")

app = FastAPI(
    title="PHEV Sweetspot Calculator",
    docs_url="/docs" if ENABLE_DOCS else None,
    redoc_url="/redoc" if ENABLE_DOCS else None,
    openapi_url="/openapi.json" if ENABLE_DOCS else None,
)
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

# Self-protection headers. All scripts are self-hosted (/static/vendor + app.js) with no
# inline <script> or on*-handlers, so script-src can be strict 'self'. Only inline STYLE
# attributes (e.g. the legend swatches) need 'unsafe-inline'. frame-ancestors blocks
# clickjacking. No external origins are used (assets + API are same-origin).
_CSP = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data:; "
    "font-src 'self'; "
    "connect-src 'self'; "
    "base-uri 'self'; "
    "form-action 'self'; "
    "frame-ancestors 'none'"
)


@app.middleware("http")
async def _security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Content-Security-Policy", _CSP)
    if COOKIE_SECURE:  # only meaningful when served over HTTPS
        response.headers.setdefault(
            "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
        )
    return response


def _static_version() -> str:
    """Short hash of the editable assets, appended as ?v= to bust browser caches
    after a deploy (StaticFiles sends no Cache-Control, so Safari caches CSS/JS)."""
    h = hashlib.md5()
    for rel in ("css/styles.css", "js/app.js"):
        try:
            with open(os.path.join(BASE_DIR, "static", rel), "rb") as f:
                h.update(f.read())
        except OSError:
            pass
    return h.hexdigest()[:8]


STATIC_VERSION = _static_version()

# Git commit the image was built from (set by CI; "dev" locally). Shown in the footer.
APP_VERSION = os.environ.get("APP_VERSION", "dev")


# --- Auth: read-only for everyone, writes require the owner password ----------
def require_editor(edit_session: str | None = Cookie(default=None)) -> bool:
    """Dependency guarding write endpoints. 401 unless a valid edit session exists."""
    if not auth.is_editor(edit_session):
        raise HTTPException(status_code=401, detail="Editing requires login")
    return True


def _client_ip(request: Request) -> str:
    """Real client IP for the per-client login throttle. The leftmost X-Forwarded-For
    value is client-supplied and spoofable; prefer Cloudflare's CF-Connecting-IP, else
    the rightmost XFF entry (the peer our proxy saw). Falls back to the socket peer.
    Keying on the proxy IP would make one shared bucket (and let anyone lock the owner
    out), so derive the actual client here."""
    cf = request.headers.get("cf-connecting-ip")
    if cf:
        return cf.strip()
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        parts = [p.strip() for p in fwd.split(",") if p.strip()]
        if parts:
            return parts[-1]
    return request.client.host if request.client else "?"


# Simple in-memory per-IP rate limit for login attempts (brute-force protection).
_login_attempts: dict[str, list[float]] = {}
_LOGIN_WINDOW = 300.0   # seconds
_LOGIN_MAX = 8          # FAILED attempts per window per client IP


def _login_rate_ok(ip: str) -> bool:
    now = time.time()
    # Prune stale entries (and empty buckets) so the dict can't grow unbounded.
    for k in list(_login_attempts.keys()):
        _login_attempts[k] = [t for t in _login_attempts[k] if now - t < _LOGIN_WINDOW]
        if not _login_attempts[k]:
            del _login_attempts[k]
    return len(_login_attempts.get(ip, [])) < _LOGIN_MAX


def _migrate_legacy_fuel_price() -> None:
    """Upgrade databases created before fuel price became a global setting.

    Older `scenarios` tables carry a NOT NULL `fuel_price` column. Carry that value
    into the new `settings` row, then drop the column so new scenarios can be inserted.
    """
    with engine.begin() as conn:
        cols = [row[1] for row in conn.execute(text("PRAGMA table_info(scenarios)"))]
        if "fuel_price" not in cols:
            return
        old = conn.execute(text("SELECT fuel_price FROM scenarios ORDER BY id LIMIT 1")).fetchone()
        has_settings = conn.execute(text("SELECT 1 FROM settings LIMIT 1")).fetchone()
        if old is not None and not has_settings:
            conn.execute(text("INSERT INTO settings (id, fuel_price) VALUES (1, :p)"), {"p": old[0]})
        conn.execute(text("ALTER TABLE scenarios DROP COLUMN fuel_price"))


def _migrate_bilingual_names() -> None:
    """Upgrade databases that have a single `name` column to `name_de` / `name_en`.

    Adds the two columns, seeds both from the old `name`, then drops `name`.
    """
    for table in ("scenarios", "charging_locations"):
        with engine.begin() as conn:
            cols = [row[1] for row in conn.execute(text(f"PRAGMA table_info({table})"))]
            if "name" not in cols:
                continue  # already migrated, or a fresh DB created with the new schema
            if "name_de" not in cols:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN name_de VARCHAR"))
            if "name_en" not in cols:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN name_en VARCHAR"))
            conn.execute(text(f"UPDATE {table} SET name_de = name WHERE COALESCE(name_de, '') = ''"))
            conn.execute(text(f"UPDATE {table} SET name_en = name WHERE COALESCE(name_en, '') = ''"))
            conn.execute(text(f"ALTER TABLE {table} DROP COLUMN name"))


@app.on_event("startup")
def on_startup() -> None:
    logging.getLogger("uvicorn.error").info("PHEV Sweetspot Calculator — build %s", APP_VERSION[:7])
    Base.metadata.create_all(bind=engine)
    _migrate_legacy_fuel_price()
    _migrate_bilingual_names()
    db = SessionLocal()
    try:
        crud.seed_if_empty(db)
    finally:
        db.close()
    if auth.EDITING_DISABLED:
        auth.logger.warning(
            "OWNER_PASSWORD_HASH is not set (and ALLOW_DEFAULT_PASSWORD is off) — "
            "EDITING IS DISABLED, the app runs as a read-only public calculator. "
            "Set OWNER_PASSWORD_HASH to enable editing (run: python -m app.auth).")
    elif auth.USING_DEFAULT_PASSWORD:
        auth.logger.warning(
            "ALLOW_DEFAULT_PASSWORD is set and OWNER_PASSWORD_HASH is not — using the "
            "default dev password '%s'. NEVER do this on a public deploy; set "
            "OWNER_PASSWORD_HASH instead (run: python -m app.auth).",
            auth.DEFAULT_DEV_PASSWORD)


# --- Page --------------------------------------------------------------------
@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={"v": STATIC_VERSION, "version": APP_VERSION[:7], "version_full": APP_VERSION},
    )


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return FileResponse(os.path.join(BASE_DIR, "static", "favicon.svg"),
                        media_type="image/svg+xml")


# --- Auth --------------------------------------------------------------------
@app.get("/api/me", response_model=schemas.AuthState)
def me(edit_session: str | None = Cookie(default=None)):
    return schemas.AuthState(editor=auth.is_editor(edit_session))


@app.post("/api/login", response_model=schemas.AuthState)
def login(data: schemas.Login, request: Request, response: Response):
    ip = _client_ip(request)
    if not _login_rate_ok(ip):
        raise HTTPException(status_code=429, detail="Too many attempts — try again later")
    if not auth.check_password(data.password):
        _login_attempts.setdefault(ip, []).append(time.time())  # count only FAILURES
        raise HTTPException(status_code=401, detail="Wrong password")
    _login_attempts.pop(ip, None)  # a correct login clears this client's failure count
    response.set_cookie(COOKIE_NAME, auth.make_token(), max_age=auth.SESSION_TTL,
                        httponly=True, samesite="lax", secure=COOKIE_SECURE)
    return schemas.AuthState(editor=True)


@app.post("/api/logout", response_model=schemas.AuthState)
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, samesite="lax", secure=COOKIE_SECURE)
    return schemas.AuthState(editor=False)


# --- Scenarios ---------------------------------------------------------------
@app.get("/api/scenarios", response_model=list[schemas.ScenarioRead])
def get_scenarios(db: Session = Depends(get_db)):
    return crud.list_scenarios(db)


@app.post("/api/scenarios", response_model=schemas.ScenarioRead, status_code=201,
          dependencies=[Depends(require_editor)])
def post_scenario(data: schemas.ScenarioCreate, db: Session = Depends(get_db)):
    return crud.create_scenario(db, data)


@app.put("/api/scenarios/{scenario_id}", response_model=schemas.ScenarioRead,
         dependencies=[Depends(require_editor)])
def put_scenario(scenario_id: int, data: schemas.ScenarioCreate,
                 db: Session = Depends(get_db)):
    obj = crud.get_scenario(db, scenario_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return crud.update_scenario(db, obj, data)


@app.delete("/api/scenarios/{scenario_id}", status_code=204,
            dependencies=[Depends(require_editor)])
def remove_scenario(scenario_id: int, db: Session = Depends(get_db)):
    obj = crud.get_scenario(db, scenario_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Scenario not found")
    crud.delete_scenario(db, obj)


# --- Charging locations ------------------------------------------------------
@app.get("/api/locations", response_model=list[schemas.ChargingLocationRead])
def get_locations(db: Session = Depends(get_db)):
    return crud.list_locations(db)


@app.post("/api/locations", response_model=schemas.ChargingLocationRead, status_code=201,
          dependencies=[Depends(require_editor)])
def post_location(data: schemas.ChargingLocationCreate, db: Session = Depends(get_db)):
    return crud.create_location(db, data)


@app.put("/api/locations/{location_id}", response_model=schemas.ChargingLocationRead,
         dependencies=[Depends(require_editor)])
def put_location(location_id: int, data: schemas.ChargingLocationCreate,
                 db: Session = Depends(get_db)):
    obj = crud.get_location(db, location_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Charging location not found")
    return crud.update_location(db, obj, data)


@app.delete("/api/locations/{location_id}", status_code=204,
            dependencies=[Depends(require_editor)])
def remove_location(location_id: int, db: Session = Depends(get_db)):
    obj = crud.get_location(db, location_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Charging location not found")
    crud.delete_location(db, obj)


# --- Calculation -------------------------------------------------------------
@app.get("/api/calculate", response_model=schemas.CalculationResult)
def calculate(scenario_id: int, location_id: int, db: Session = Depends(get_db)):
    scenario = crud.get_scenario(db, scenario_id)
    if scenario is None:
        raise HTTPException(status_code=404, detail="Scenario not found")
    location = crud.get_location(db, location_id)
    if location is None:
        raise HTTPException(status_code=404, detail="Charging location not found")

    fuel_price = crud.get_settings(db).fuel_price
    result = calc.compute(
        fuel_consumption=scenario.fuel_consumption,
        power_consumption=scenario.power_consumption,
        fuel_price=fuel_price,
        kwh_price=location.price_chf_per_kwh,
    )
    return schemas.CalculationResult(
        scenario=schemas.ScenarioRead.model_validate(scenario),
        location=schemas.ChargingLocationRead.model_validate(location),
        fuel_price=fuel_price,
        **result.as_dict(),
    )


# --- Settings (global current fuel price) ------------------------------------
@app.get("/api/settings", response_model=schemas.SettingsRead)
def get_settings(db: Session = Depends(get_db)):
    return crud.get_settings(db)


@app.put("/api/settings", response_model=schemas.SettingsRead,
         dependencies=[Depends(require_editor)])
def put_settings(data: schemas.SettingsBase, db: Session = Depends(get_db)):
    return crud.update_settings(db, data)
