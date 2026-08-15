"""Pydantic request/response schemas."""
from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field, field_serializer, model_validator


class _BilingualName(BaseModel):
    """Name in both UI languages; at least one must be filled (the other falls back)."""
    name_de: str = Field("", max_length=100)
    name_en: str = Field("", max_length=100)

    @model_validator(mode="after")
    def _require_one_name(self):
        if not (self.name_de.strip() or self.name_en.strip()):
            raise ValueError("Provide a name in at least one language")
        return self


# --- Scenarios ---------------------------------------------------------------
class ScenarioBase(_BilingualName):
    fuel_consumption: float = Field(..., gt=0, le=1000, description="liters / 100 km")
    power_consumption: float = Field(..., ge=0, le=1000, description="kWh / 100 km")


class ScenarioCreate(ScenarioBase):
    pass


class ScenarioRead(ScenarioBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# --- Charging locations ------------------------------------------------------
class ChargingLocationBase(_BilingualName):
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
    # When the fuel price was last written; null = unknown (never set through this app).
    fuel_price_updated_at: datetime | None = None

    @field_serializer("fuel_price_updated_at")
    def _as_utc(self, value: datetime | None) -> str | None:
        """Stored naive (UTC) in SQLite — mark it as UTC so the browser converts it."""
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat().replace("+00:00", "Z")


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
