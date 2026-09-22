"""Pure, testable cost math for the PHEV sweetspot calculator.

All costs are expressed per 100 km so fuel and electricity are directly comparable.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict


@dataclass(frozen=True)
class SweetspotResult:
    """Outcome of comparing fuel vs. electric for one scenario + charging location."""

    cost_fuel: float            # CHF per 100 km on fuel
    cost_elec: float            # CHF per 100 km on electricity
    break_even_fuel_price: float | None  # CHF/L where both cost the same (None if undefined)
    break_even_kwh_price: float | None   # CHF/kWh where both cost the same (None if undefined)
    cheaper: str                # "electric", "fuel" or "equal"
    savings_per_100km: float    # CHF saved per 100 km by picking the cheaper option
    # The share of km actually driven electric (0..100) and what that costs:
    # the per-km comparison above is unaffected by it, only the money is.
    electric_share: int         # % of km on electricity
    cost_blend: float           # CHF per 100 km at that share
    blend_delta: float          # CHF per 100 km saved vs. all-fuel (negative = extra cost)

    def as_dict(self) -> dict:
        return asdict(self)


def cost_fuel_per_100km(fuel_consumption: float, fuel_price: float) -> float:
    """Fuel cost per 100 km: liters/100km × CHF/liter."""
    return fuel_consumption * fuel_price


def cost_elec_per_100km(power_consumption: float, kwh_price: float) -> float:
    """Electric cost per 100 km: kWh/100km × CHF/kWh."""
    return power_consumption * kwh_price


def break_even_fuel_price(power_consumption: float, kwh_price: float,
                          fuel_consumption: float) -> float | None:
    """Fuel price (CHF/L) at which fuel and electric cost exactly the same.

    Derived from  fuel_consumption × price = power_consumption × kwh_price.
    Returns None when fuel consumption is zero (no crossing is defined).
    """
    if fuel_consumption <= 0:
        return None
    return (power_consumption * kwh_price) / fuel_consumption


def break_even_kwh_price(fuel_consumption: float, fuel_price: float,
                         power_consumption: float) -> float | None:
    """Max electricity price (CHF/kWh) at which electric still ties fuel.

    Derived from  power_consumption × price = fuel_consumption × fuel_price.
    Pay less than this per kWh and charging is the cheaper choice.
    Returns None when power consumption is zero (no crossing is defined).
    """
    if power_consumption <= 0:
        return None
    return (fuel_consumption * fuel_price) / power_consumption


def cost_blend_per_100km(cost_fuel: float, cost_elec: float, electric_share: int) -> float:
    """Cost per 100 km when `electric_share` % of the km are electric, the rest fuel."""
    a = electric_share / 100
    return a * cost_elec + (1 - a) * cost_fuel


def compute(fuel_consumption: float, power_consumption: float,
            fuel_price: float, kwh_price: float,
            electric_share: int = 100) -> SweetspotResult:
    """Compute the full comparison for the given inputs.

    `electric_share` is the share of km driven electric (a PHEV rarely manages
    100 %). It does not move the break-even prices — a mixed trip saves
    share × (fuel − electric), which is zero exactly where the pure comparison
    ties — it only scales the money actually saved.
    """
    cf = cost_fuel_per_100km(fuel_consumption, fuel_price)
    ce = cost_elec_per_100km(power_consumption, kwh_price)
    be = break_even_fuel_price(power_consumption, kwh_price, fuel_consumption)
    bek = break_even_kwh_price(fuel_consumption, fuel_price, power_consumption)

    diff = cf - ce
    share = max(0, min(100, int(electric_share)))
    cb = cost_blend_per_100km(cf, ce, share)
    if abs(diff) < 1e-9:
        cheaper = "equal"
    elif diff > 0:
        cheaper = "electric"
    else:
        cheaper = "fuel"

    return SweetspotResult(
        cost_fuel=round(cf, 4),
        cost_elec=round(ce, 4),
        break_even_fuel_price=round(be, 4) if be is not None else None,
        break_even_kwh_price=round(bek, 4) if bek is not None else None,
        cheaper=cheaper,
        savings_per_100km=round(abs(diff), 4),
        electric_share=share,
        cost_blend=round(cb, 4),
        blend_delta=round(cf - cb, 4),
    )
