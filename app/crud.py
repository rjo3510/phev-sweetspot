"""Database access helpers and first-run seeding."""
from __future__ import annotations

from sqlalchemy.orm import Session

from . import models, schemas


# --- Scenarios ---------------------------------------------------------------
def list_scenarios(db: Session) -> list[models.Scenario]:
    return db.query(models.Scenario).order_by(models.Scenario.id).all()


def get_scenario(db: Session, scenario_id: int) -> models.Scenario | None:
    return db.get(models.Scenario, scenario_id)


def create_scenario(db: Session, data: schemas.ScenarioCreate) -> models.Scenario:
    obj = models.Scenario(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_scenario(db: Session, obj: models.Scenario,
                    data: schemas.ScenarioCreate) -> models.Scenario:
    for key, value in data.model_dump().items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def delete_scenario(db: Session, obj: models.Scenario) -> None:
    db.delete(obj)
    db.commit()


# --- Charging locations ------------------------------------------------------
def list_locations(db: Session) -> list[models.ChargingLocation]:
    return db.query(models.ChargingLocation).order_by(models.ChargingLocation.id).all()


def get_location(db: Session, location_id: int) -> models.ChargingLocation | None:
    return db.get(models.ChargingLocation, location_id)


def create_location(db: Session,
                    data: schemas.ChargingLocationCreate) -> models.ChargingLocation:
    obj = models.ChargingLocation(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_location(db: Session, obj: models.ChargingLocation,
                    data: schemas.ChargingLocationCreate) -> models.ChargingLocation:
    for key, value in data.model_dump().items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def delete_location(db: Session, obj: models.ChargingLocation) -> None:
    db.delete(obj)
    db.commit()


# --- Settings ----------------------------------------------------------------
DEFAULT_FUEL_PRICE = 1.80


def get_settings(db: Session) -> models.Settings:
    """Return the single settings row, creating it with a default if missing."""
    obj = db.get(models.Settings, 1)
    if obj is None:
        obj = models.Settings(id=1, fuel_price=DEFAULT_FUEL_PRICE)
        db.add(obj)
        db.commit()
        db.refresh(obj)
    return obj


def update_settings(db: Session, data: schemas.SettingsBase) -> models.Settings:
    obj = get_settings(db)
    obj.fuel_price = data.fuel_price
    db.commit()
    db.refresh(obj)
    return obj


# --- Seeding -----------------------------------------------------------------
def seed_if_empty(db: Session) -> None:
    """Populate example data on first run so the app is useful immediately."""
    if not db.query(models.Scenario).first():
        db.add_all([
            models.Scenario(name="Summer", fuel_consumption=6.5, power_consumption=21),
            models.Scenario(name="Winter", fuel_consumption=7.5, power_consumption=26),
            models.Scenario(name="With trailer", fuel_consumption=9.0, power_consumption=30),
        ])
    if not db.query(models.ChargingLocation).first():
        db.add_all([
            models.ChargingLocation(name="Home", price_chf_per_kwh=0.31),
            models.ChargingLocation(name="Weekend", price_chf_per_kwh=0.40),
            models.ChargingLocation(name="Public fast charger", price_chf_per_kwh=0.90),
        ])
    get_settings(db)  # ensure the settings row exists
    db.commit()
