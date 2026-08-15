"""ORM models for scenarios and charging locations."""
from __future__ import annotations

from sqlalchemy import Column, DateTime, Float, Integer, String

from .database import Base


class Scenario(Base):
    """A driving scenario: a consumption profile only.

    Examples: Summer, Winter, With trailer. The fuel price is NOT stored here — it is
    the same at the pump for every scenario and lives in Settings (see below), so the
    fast-changing market price is edited in one place. All values are user-editable.
    """

    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, index=True)
    name_de = Column(String, nullable=False)           # name shown in the German UI
    name_en = Column(String, nullable=False)           # name shown in the English UI
    fuel_consumption = Column(Float, nullable=False)   # liters / 100 km
    power_consumption = Column(Float, nullable=False)  # kWh / 100 km


class ChargingLocation(Base):
    """A place where the car can be charged, with its electricity price."""

    __tablename__ = "charging_locations"

    id = Column(Integer, primary_key=True, index=True)
    name_de = Column(String, nullable=False)
    name_en = Column(String, nullable=False)
    price_chf_per_kwh = Column(Float, nullable=False)  # CHF / kWh


class Settings(Base):
    """Single-row global settings. Holds the current fuel price (changes often)."""

    __tablename__ = "settings"

    id = Column(Integer, primary_key=True)             # always 1
    fuel_price = Column(Float, nullable=False)         # CHF / liter (current market price)
    # When the price was last written (naive UTC). NULL = unknown: seeded default, or a
    # database from before this column existed. The UI shows the age so a rare visitor
    # can tell whether the price is still plausible.
    fuel_price_updated_at = Column(DateTime, nullable=True)
