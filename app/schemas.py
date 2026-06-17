"""Pydantic request/response schemas."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


# --- Scenarios ---------------------------------------------------------------
class ScenarioBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    fuel_consumption: float = Field(..., gt=0, le=1000, description="liters / 100 km")
    power_consumption: float = Field(..., ge=0, le=1000, description="kWh / 100 km")


class ScenarioCreate(ScenarioBase):
    pass


class ScenarioRead(ScenarioBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# --- Charging locations ------------------------------------------------------
class ChargingLocationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    price_chf_per_kwh: float = Field(..., ge=0, le=1000, description="CHF / kWh")


class ChargingLocationCreate(ChargingLocationBase):
    pass


class ChargingLocationRead(ChargingLocationBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# --- Settings ----------------------------------------------------------------
class SettingsBase(BaseModel):
    fuel_price: float = Field(..., ge=0, le=1000, description="current fuel price, CHF / liter")


class SettingsRead(SettingsBase):
    model_config = ConfigDict(from_attributes=True)


# --- Auth --------------------------------------------------------------------
class Login(BaseModel):
    password: str = Field(..., min_length=1, max_length=256)


class AuthState(BaseModel):
    editor: bool


# --- Calculation -------------------------------------------------------------
class CalculationResult(BaseModel):
    scenario: ScenarioRead
    location: ChargingLocationRead
    fuel_price: float            # global current fuel price used for this calculation
    cost_fuel: float
    cost_elec: float
    break_even_fuel_price: float | None
    break_even_kwh_price: float | None
    cheaper: str
    savings_per_100km: float
