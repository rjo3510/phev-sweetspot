"""Unit tests for the sweetspot cost math."""
import math

from app import calc


def test_worked_example():
    """The example from the brief: 6.5 L, 21 kWh, 1.80 CHF/L, 0.31 CHF/kWh."""
    r = calc.compute(fuel_consumption=6.5, power_consumption=21,
                     fuel_price=1.80, kwh_price=0.31)
    assert r.cost_fuel == 11.70          # 6.5 * 1.80
    assert r.cost_elec == 6.51           # 21 * 0.31
    assert r.cheaper == "electric"
    assert r.savings_per_100km == 5.19   # 11.70 - 6.51
    # break-even fuel price = (21 * 0.31) / 6.5 = 1.0015...
    assert math.isclose(r.break_even_fuel_price, 1.0015, abs_tol=1e-3)
    # max kWh price at fuel 1.80 = (6.5 * 1.80) / 21 = 0.5571...
    assert math.isclose(r.break_even_kwh_price, 0.5571, abs_tol=1e-3)


def test_break_even_kwh_makes_costs_equal():
    """At the break-even kWh price the two options cost the same."""
    fuel_cons, power_cons, fuel_price = 6.5, 21, 1.80
    bek = calc.break_even_kwh_price(fuel_cons, fuel_price, power_cons)
    r = calc.compute(fuel_consumption=fuel_cons, power_consumption=power_cons,
                     fuel_price=fuel_price, kwh_price=bek)
    assert r.cheaper == "equal"
    assert math.isclose(r.cost_fuel, r.cost_elec, abs_tol=1e-6)


def test_zero_power_consumption_has_no_kwh_break_even():
    r = calc.compute(fuel_consumption=6.5, power_consumption=0,
                     fuel_price=1.80, kwh_price=0.31)
    assert r.break_even_kwh_price is None


def test_break_even_makes_costs_equal():
    """At the break-even fuel price the two options cost the same."""
    fuel_cons, power_cons, kwh = 6.5, 21, 0.31
    be = calc.break_even_fuel_price(power_cons, kwh, fuel_cons)
    r = calc.compute(fuel_consumption=fuel_cons, power_consumption=power_cons,
                     fuel_price=be, kwh_price=kwh)
    assert r.cheaper == "equal"
    assert math.isclose(r.cost_fuel, r.cost_elec, abs_tol=1e-6)


def test_fuel_cheaper_when_fuel_price_low():
    r = calc.compute(fuel_consumption=6.5, power_consumption=21,
                     fuel_price=0.50, kwh_price=0.31)
    assert r.cheaper == "fuel"
    assert r.savings_per_100km > 0


def test_zero_fuel_consumption_has_no_break_even():
    r = calc.compute(fuel_consumption=0, power_consumption=21,
                     fuel_price=1.80, kwh_price=0.31)
    assert r.break_even_fuel_price is None
    assert r.cost_fuel == 0
    assert r.cheaper == "fuel"  # fuel cost 0 is cheaper than any positive electric cost
