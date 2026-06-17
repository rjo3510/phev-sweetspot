"""FastAPI application: serves the UI and the JSON API."""
from __future__ import annotations

import os

from fastapi import Depends, FastAPI, HTTPException
from fastapi.requests import Request
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import text
from sqlalchemy.orm import Session

from . import calc, crud, models, schemas
from .database import Base, SessionLocal, engine, get_db

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = FastAPI(title="PHEV Sweetspot Calculator")
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))


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


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    _migrate_legacy_fuel_price()
    db = SessionLocal()
    try:
        crud.seed_if_empty(db)
    finally:
        db.close()


# --- Page --------------------------------------------------------------------
@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return FileResponse(os.path.join(BASE_DIR, "static", "favicon.svg"),
                        media_type="image/svg+xml")


# --- Scenarios ---------------------------------------------------------------
@app.get("/api/scenarios", response_model=list[schemas.ScenarioRead])
def get_scenarios(db: Session = Depends(get_db)):
    return crud.list_scenarios(db)


@app.post("/api/scenarios", response_model=schemas.ScenarioRead, status_code=201)
def post_scenario(data: schemas.ScenarioCreate, db: Session = Depends(get_db)):
    return crud.create_scenario(db, data)


@app.put("/api/scenarios/{scenario_id}", response_model=schemas.ScenarioRead)
def put_scenario(scenario_id: int, data: schemas.ScenarioCreate,
                 db: Session = Depends(get_db)):
    obj = crud.get_scenario(db, scenario_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return crud.update_scenario(db, obj, data)


@app.delete("/api/scenarios/{scenario_id}", status_code=204)
def remove_scenario(scenario_id: int, db: Session = Depends(get_db)):
    obj = crud.get_scenario(db, scenario_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Scenario not found")
    crud.delete_scenario(db, obj)


# --- Charging locations ------------------------------------------------------
@app.get("/api/locations", response_model=list[schemas.ChargingLocationRead])
def get_locations(db: Session = Depends(get_db)):
    return crud.list_locations(db)


@app.post("/api/locations", response_model=schemas.ChargingLocationRead, status_code=201)
def post_location(data: schemas.ChargingLocationCreate, db: Session = Depends(get_db)):
    return crud.create_location(db, data)


@app.put("/api/locations/{location_id}", response_model=schemas.ChargingLocationRead)
def put_location(location_id: int, data: schemas.ChargingLocationCreate,
                 db: Session = Depends(get_db)):
    obj = crud.get_location(db, location_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Charging location not found")
    return crud.update_location(db, obj, data)


@app.delete("/api/locations/{location_id}", status_code=204)
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


@app.put("/api/settings", response_model=schemas.SettingsRead)
def put_settings(data: schemas.SettingsBase, db: Session = Depends(get_db)):
    return crud.update_settings(db, data)
