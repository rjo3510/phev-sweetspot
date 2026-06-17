"use strict";

// --- Tiny API helper ---------------------------------------------------------
const api = {
  async get(url) { return handle(await fetch(url)); },
  async post(url, body) { return handle(await fetch(url, jsonOpts("POST", body))); },
  async put(url, body) { return handle(await fetch(url, jsonOpts("PUT", body))); },
  async del(url) {
    const r = await fetch(url, { method: "DELETE" });
    if (!r.ok) throw new Error((await safeJson(r))?.detail || r.statusText);
  },
};
function jsonOpts(method, body) {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
async function handle(r) {
  if (!r.ok) throw new Error((await safeJson(r))?.detail || r.statusText);
  return r.json();
}
async function safeJson(r) { try { return await r.json(); } catch { return null; } }

const $ = (id) => document.getElementById(id);
const CHF = (n) => "CHF " + Number(n).toFixed(2);

// --- i18n --------------------------------------------------------------------
const I18N = {
  en: {
    subtitle: "Fuel or electric? Find the price where it flips.",
    fuel_price_title: "Current fuel price",
    fuel_price_note: "Changes often — set it once, it applies to every scenario.",
    vary_fuel: "As a fuel price", vary_kwh: "As an electricity price",
    sweetspot_hint: "Below the line charging wins, above it fuel wins. The dot is where you are.",
    chart_title_fuel: "When does charging pay off?",
    chart_title_kwh: "When does charging pay off?",
    region_elec: "Electric cheaper", region_fuel: "Fuel cheaper",
    break_even_line: "Break-even line", you_are_here: "You are here",
    rule_fuel: "At {kwh} electricity, driving electric is cheaper while fuel is <b>≥ {be}</b>.",
    rule_kwh: "At {fuel} fuel, driving electric is cheaper while electricity is <b>≤ {be}</b>.",
    current_selection: "Current selection",
    scenario: "Scenario", charging_location: "Charging location",
    scenario_values: "Scenario values", location_price: "Location price", save: "Save",
    fuel_consumption: "Fuel consumption", power_consumption: "Power consumption",
    electricity_price: "Electricity price",
    scenarios: "Scenarios", charging_locations: "Charging locations",
    add: "+ Add", col_name: "Name", delete: "Delete",
    footer: "Break-even fuel price = (kWh/100km × CHF/kWh) ÷ L/100km · all values editable & stored.",
    verdict_loading: "Calculating…",
    verdict_start: "Add a scenario and a charging location to start.",
    tie_title: "It's a tie", tie_sub: "Fuel and electric cost the same right now.",
    drive_electric: 'Drive <span class="accent-elec">electric</span>',
    charging_cheaper: "Charging is the cheaper choice.",
    drive_fuel: 'Drive on <span class="accent-fuel">fuel</span>',
    fuel_cheaper: "Fuel is the cheaper choice.",
    pump_price: "Pump price", your_elec_price: "Your electricity price",
    charging_as_fuel: "Charging, as a fuel price", fuel_as_elec: "Fuel, as an electricity price",
    cheaper_tag: "cheaper",
    gap_detail: "Gap <b>{gap}</b> · real cost {cf} (fuel) vs {ce} (electric) per 100 km",
    real_cost: "Real cost {cf} (fuel) vs {ce} (electric) per 100 km",
    axis_per_liter: "Fuel price (CHF/L)", axis_per_kwh: "Electricity price (CHF/kWh)",
    equiv_price: "Equivalent price ({unit})",
    driving_on_fuel: "Driving on fuel (= pump price)",
    driving_on_elec: "Driving on electricity (= your kWh price)",
    legend_sweetspot: "Sweetspot (equal {unit})", legend_today: "Today's {energy} price",
    tooltip_if: "If {energy} is {x} {unit}",
    word_pump: "Pump", word_you_pay: "You pay",
    word_charging_approx: "Charging ≈", word_fuel_approx: "Fuel ≈", word_sweetspot: "Sweetspot",
    energy_fuel: "fuel", energy_elec: "electricity",
    toast_scenario_saved: "Scenario saved", toast_location_saved: "Location saved",
    toast_scenario_added: "Scenario added", toast_location_added: "Location added",
    toast_scenario_deleted: "Scenario deleted", toast_location_deleted: "Location deleted",
    toast_fuel_set: "Fuel price set to {p}/L", toast_invalid_fuel: "Enter a valid fuel price",
    confirm_delete_scenario: "Delete this scenario?",
    confirm_delete_location: "Delete this charging location?",
    new_scenario: "New scenario", new_location: "New location",
    auth_edit: "Edit", auth_logout: "Log out",
    login_title: "Log in to edit", login_submit: "Log in", cancel: "Cancel",
    password_ph: "Password",
    toast_login_ok: "Editing enabled", toast_login_wrong: "Wrong password",
    toast_login_throttled: "Too many attempts — try again later",
    toast_logout: "Logged out — read-only",
  },
  de: {
    subtitle: "Benzin oder Strom? Finde den Preis, bei dem es kippt.",
    fuel_price_title: "Aktueller Benzinpreis",
    fuel_price_note: "Ändert sich oft — einmal setzen, gilt für alle Szenarien.",
    vary_fuel: "Als Benzinpreis", vary_kwh: "Als Strompreis",
    sweetspot_hint: "Unter der Linie lohnt sich Laden, darüber Benzin. Der Punkt bist du.",
    chart_title_fuel: "Wann lohnt sich Laden?",
    chart_title_kwh: "Wann lohnt sich Laden?",
    region_elec: "Strom günstiger", region_fuel: "Benzin günstiger",
    break_even_line: "Break-even-Linie", you_are_here: "Du bist hier",
    rule_fuel: "Bei {kwh} Strom ist elektrisch fahren günstiger, solange Benzin <b>≥ {be}</b> kostet.",
    rule_kwh: "Bei {fuel} Benzin ist elektrisch fahren günstiger, solange Strom <b>≤ {be}</b> kostet.",
    current_selection: "Aktuelle Auswahl",
    scenario: "Szenario", charging_location: "Standort",
    scenario_values: "Szenario-Werte", location_price: "Ladepreis", save: "Speichern",
    fuel_consumption: "Benzinverbrauch", power_consumption: "Stromverbrauch",
    electricity_price: "Strompreis",
    scenarios: "Szenarien", charging_locations: "Standorte",
    add: "+ Hinzufügen", col_name: "Name", delete: "Löschen",
    footer: "Break-even-Benzinpreis = (kWh/100km × CHF/kWh) ÷ L/100km · alle Werte editierbar & gespeichert.",
    verdict_loading: "Berechne…",
    verdict_start: "Füge ein Szenario und einen Standort hinzu, um zu starten.",
    tie_title: "Unentschieden", tie_sub: "Benzin und Strom kosten gerade gleich viel.",
    drive_electric: 'Fahre <span class="accent-elec">elektrisch</span>',
    charging_cheaper: "Laden ist die günstigere Wahl.",
    drive_fuel: 'Fahre mit <span class="accent-fuel">Benzin</span>',
    fuel_cheaper: "Benzin ist die günstigere Wahl.",
    pump_price: "Tankstellenpreis", your_elec_price: "Dein Strompreis",
    charging_as_fuel: "Laden, als Benzinpreis", fuel_as_elec: "Benzin, als Strompreis",
    cheaper_tag: "günstiger",
    gap_detail: "Differenz <b>{gap}</b> · reale Kosten {cf} (Benzin) vs {ce} (Strom) pro 100 km",
    real_cost: "Reale Kosten {cf} (Benzin) vs {ce} (Strom) pro 100 km",
    axis_per_liter: "Benzinpreis (CHF/L)", axis_per_kwh: "Strompreis (CHF/kWh)",
    equiv_price: "Äquivalenzpreis ({unit})",
    driving_on_fuel: "Fahren mit Benzin (= Tankstellenpreis)",
    driving_on_elec: "Fahren mit Strom (= dein kWh-Preis)",
    legend_sweetspot: "Sweetspot (gleich {unit})", legend_today: "Aktueller {energy}-Preis",
    tooltip_if: "Wenn {energy} {x} {unit} kostet",
    word_pump: "Tanken", word_you_pay: "Du zahlst",
    word_charging_approx: "Laden ≈", word_fuel_approx: "Benzin ≈", word_sweetspot: "Sweetspot",
    energy_fuel: "Benzin", energy_elec: "Strom",
    toast_scenario_saved: "Szenario gespeichert", toast_location_saved: "Standort gespeichert",
    toast_scenario_added: "Szenario hinzugefügt", toast_location_added: "Standort hinzugefügt",
    toast_scenario_deleted: "Szenario gelöscht", toast_location_deleted: "Standort gelöscht",
    toast_fuel_set: "Benzinpreis auf {p}/L gesetzt",
    toast_invalid_fuel: "Gib einen gültigen Benzinpreis ein",
    confirm_delete_scenario: "Dieses Szenario löschen?",
    confirm_delete_location: "Diesen Standort löschen?",
    new_scenario: "Neues Szenario", new_location: "Neuer Standort",
    auth_edit: "Bearbeiten", auth_logout: "Abmelden",
    login_title: "Anmelden zum Bearbeiten", login_submit: "Anmelden", cancel: "Abbrechen",
    password_ph: "Passwort",
    toast_login_ok: "Bearbeiten aktiviert", toast_login_wrong: "Falsches Passwort",
    toast_login_throttled: "Zu viele Versuche — später nochmal",
    toast_logout: "Abgemeldet — Nur-Lese-Modus",
  },
};

function t(key, vars) {
  let s = (I18N[lang] && I18N[lang][key]) ?? I18N.en[key] ?? key;
  if (vars) for (const k in vars) s = s.split(`{${k}}`).join(vars[k]);
  return s;
}

function applyStaticTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  document.documentElement.lang = lang;
}

// --- State -------------------------------------------------------------------
let scenarios = [];
let locations = [];
let activeScenarioId = Number(localStorage.getItem("activeScenarioId")) || null;
let activeLocationId = Number(localStorage.getItem("activeLocationId")) || null;
let axisMode = localStorage.getItem("axisMode") === "kwh" ? "kwh" : "fuel";
let lang = localStorage.getItem("lang") === "de" ? "de" : "en";
let isEditor = false;   // owner logged in? writes are blocked for everyone else
let fuelPrice = 1.80;   // global current fuel price (CHF/L), loaded from /api/settings
let chart = null;
let lastResult = null;  // keep the latest computed result so toggling re-renders instantly

// --- Boot --------------------------------------------------------------------
async function init() {
  applyLangToggleUI();
  applyStaticTranslations();
  await reload();
  $("scenario-select").addEventListener("change", (e) => {
    activeScenarioId = Number(e.target.value);
    localStorage.setItem("activeScenarioId", activeScenarioId);
    syncActiveInputs();
    recalc();
  });
  $("location-select").addEventListener("change", (e) => {
    activeLocationId = Number(e.target.value);
    localStorage.setItem("activeLocationId", activeLocationId);
    syncActiveInputs();
    recalc();
  });

  // Live preview while typing in the active inputs (does not persist until Save).
  ["in-fuel-consumption", "in-power-consumption", "in-kwh-price"]
    .forEach((id) => $(id).addEventListener("input", recalcFromInputs));

  // Global fuel price: live preview while typing, auto-saved when you finish editing.
  $("in-fuel-price").addEventListener("input", recalcFromInputs);
  $("in-fuel-price").addEventListener("change", saveFuelPrice);
  $("fuel-down").addEventListener("click", () => nudgeFuelPrice(-0.05));
  $("fuel-up").addEventListener("click", () => nudgeFuelPrice(0.05));

  $("save-scenario").addEventListener("click", saveActiveScenario);
  $("save-location").addEventListener("click", saveActiveLocation);
  $("add-scenario").addEventListener("click", addScenario);
  $("add-location").addEventListener("click", addLocation);

  $("axis-toggle").querySelectorAll(".toggle__btn").forEach((btn) => {
    btn.addEventListener("click", () => setAxisMode(btn.dataset.axis));
  });
  applyAxisToggleUI();

  $("lang-toggle").querySelectorAll(".toggle__btn").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });

  // Auth: lock button + login modal.
  $("auth-btn").addEventListener("click", () => (isEditor ? doLogout() : openLogin()));
  $("login-cancel").addEventListener("click", closeLogin);
  $("login-backdrop").addEventListener("click", closeLogin);
  $("login-submit").addEventListener("click", doLogin);
  $("login-password").addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(); });
  await refreshAuth();
}

function setLang(l) {
  lang = l === "de" ? "de" : "en";
  localStorage.setItem("lang", lang);
  applyLangToggleUI();
  applyStaticTranslations();
  applyAxisToggleUI();
  applyEditMode();
  renderScenarioTable();
  renderLocationTable();
  if (lastResult) { renderVerdict(lastResult); renderChart(lastResult); }
  else recalc();
}

// --- Auth --------------------------------------------------------------------
async function refreshAuth() {
  try { isEditor = (await api.get("/api/me")).editor; } catch { isEditor = false; }
  applyEditMode();
  // Tables were first rendered before auth was known — refresh so edit controls match.
  renderScenarioTable();
  renderLocationTable();
}
function applyEditMode() {
  document.body.classList.toggle("is-editor", isEditor);
  $("auth-btn").textContent = (isEditor ? "🔓 " : "🔒 ") + t(isEditor ? "auth_logout" : "auth_edit");
}
function openLogin() {
  $("login-password").value = "";
  $("login-password").placeholder = t("password_ph");
  $("login-modal").hidden = false;
  $("login-password").focus();
}
function closeLogin() { $("login-modal").hidden = true; }
async function doLogin() {
  const password = $("login-password").value;
  if (!password) return;
  try {
    await api.post("/api/login", { password });
    isEditor = true;
    closeLogin();
    applyEditMode();
    renderScenarioTable();
    renderLocationTable();
    toast(t("toast_login_ok"));
  } catch (e) {
    const msg = /429/.test(e.message) ? t("toast_login_throttled") : t("toast_login_wrong");
    toast(msg, true);
  }
}
async function doLogout() {
  try { await api.post("/api/logout", {}); } catch (e) { /* ignore */ }
  isEditor = false;
  applyEditMode();
  toast(t("toast_logout"));
  await reload();   // discard any unsaved what-if edits, show saved values
}
function applyLangToggleUI() {
  $("lang-toggle").querySelectorAll(".toggle__btn").forEach((btn) => {
    btn.classList.toggle("is-on", btn.dataset.lang === lang);
  });
}

function setAxisMode(mode) {
  axisMode = mode === "kwh" ? "kwh" : "fuel";
  localStorage.setItem("axisMode", axisMode);
  applyAxisToggleUI();
  if (lastResult) { renderVerdict(lastResult); renderChart(lastResult); }
}
function applyAxisToggleUI() {
  $("axis-toggle").querySelectorAll(".toggle__btn").forEach((btn) => {
    btn.classList.toggle("is-on", btn.dataset.axis === axisMode);
  });
  $("chart-title").textContent =
    axisMode === "fuel" ? t("chart_title_fuel") : t("chart_title_kwh");
}

async function reload() {
  let settings;
  [scenarios, locations, settings] = await Promise.all([
    api.get("/api/scenarios"),
    api.get("/api/locations"),
    api.get("/api/settings"),
  ]);
  fuelPrice = settings.fuel_price;
  $("in-fuel-price").value = fuelPrice;
  if (!scenarios.some((s) => s.id === activeScenarioId)) activeScenarioId = scenarios[0]?.id ?? null;
  if (!locations.some((l) => l.id === activeLocationId)) activeLocationId = locations[0]?.id ?? null;
  renderSelects();
  renderScenarioTable();
  renderLocationTable();
  syncActiveInputs();
  recalc();
}

// --- Selects + active inputs -------------------------------------------------
function renderSelects() {
  fillSelect($("scenario-select"), scenarios, activeScenarioId);
  fillSelect($("location-select"), locations, activeLocationId);
}
function fillSelect(el, items, activeId) {
  el.innerHTML = "";
  items.forEach((it) => {
    const o = document.createElement("option");
    o.value = it.id;
    o.textContent = it.name;
    if (it.id === activeId) o.selected = true;
    el.appendChild(o);
  });
}
function activeScenario() { return scenarios.find((s) => s.id === activeScenarioId); }
function activeLocation() { return locations.find((l) => l.id === activeLocationId); }

function syncActiveInputs() {
  const s = activeScenario();
  const l = activeLocation();
  if (s) {
    $("in-fuel-consumption").value = s.fuel_consumption;
    $("in-power-consumption").value = s.power_consumption;
  }
  if (l) $("in-kwh-price").value = l.price_chf_per_kwh;
}

function inputValues() {
  return {
    fuel_consumption: parseFloat($("in-fuel-consumption").value),
    power_consumption: parseFloat($("in-power-consumption").value),
    fuel_price: parseFloat($("in-fuel-price").value),
    kwh_price: parseFloat($("in-kwh-price").value),
  };
}

async function saveActiveScenario() {
  const s = activeScenario();
  if (!s) return;
  const v = inputValues();
  try {
    await api.put(`/api/scenarios/${s.id}`, {
      name: s.name,
      fuel_consumption: v.fuel_consumption,
      power_consumption: v.power_consumption,
    });
    toast(t("toast_scenario_saved"));
    await reload();
  } catch (e) { toast(e.message, true); }
}

// Global fuel price: persist and refresh everything.
async function saveFuelPrice() {
  // Guests can adjust the price for a what-if, but it is never persisted.
  if (!isEditor) { recalcFromInputs(); return; }
  const price = parseFloat($("in-fuel-price").value);
  if (isNaN(price) || price < 0) { toast(t("toast_invalid_fuel"), true); return; }
  if (price === fuelPrice) return;  // nothing changed
  try {
    await api.put("/api/settings", { fuel_price: price });
    fuelPrice = price;
    toast(t("toast_fuel_set", { p: CHF(price) }));
    recalc();
  } catch (e) { toast(e.message, true); }
}

function nudgeFuelPrice(delta) {
  const current = parseFloat($("in-fuel-price").value) || fuelPrice;
  $("in-fuel-price").value = Math.max(0, Math.round((current + delta) * 100) / 100).toFixed(2);
  saveFuelPrice();
}

async function saveActiveLocation() {
  const l = activeLocation();
  if (!l) return;
  const v = inputValues();
  try {
    await api.put(`/api/locations/${l.id}`, { name: l.name, price_chf_per_kwh: v.kwh_price });
    toast(t("toast_location_saved"));
    await reload();
  } catch (e) { toast(e.message, true); }
}

// --- Calculation -------------------------------------------------------------
async function recalc() {
  if (!activeScenarioId || !activeLocationId) {
    $("verdict").innerHTML = `<div class="verdict__loading">${t("verdict_start")}</div>`;
    lastResult = null;
    if (chart) { chart.destroy(); chart = null; }
    return;
  }
  try {
    const res = await api.get(`/api/calculate?scenario_id=${activeScenarioId}&location_id=${activeLocationId}`);
    renderVerdict(res);
    renderChart(res);
  } catch (e) { toast(e.message, true); }
}

// Recompute locally from the (possibly unsaved) input fields, for instant feedback.
function recalcFromInputs() {
  const v = inputValues();
  if ([v.fuel_consumption, v.power_consumption, v.fuel_price, v.kwh_price].some((x) => isNaN(x))) return;
  const cost_fuel = v.fuel_consumption * v.fuel_price;
  const cost_elec = v.power_consumption * v.kwh_price;
  const break_even = v.fuel_consumption > 0 ? (v.power_consumption * v.kwh_price) / v.fuel_consumption : null;
  const break_even_kwh = v.power_consumption > 0 ? (v.fuel_consumption * v.fuel_price) / v.power_consumption : null;
  const diff = cost_fuel - cost_elec;
  const cheaper = Math.abs(diff) < 1e-9 ? "equal" : diff > 0 ? "electric" : "fuel";
  const res = {
    scenario: { ...activeScenario(), fuel_consumption: v.fuel_consumption, power_consumption: v.power_consumption },
    location: { ...activeLocation(), price_chf_per_kwh: v.kwh_price },
    fuel_price: v.fuel_price,
    cost_fuel, cost_elec, break_even_fuel_price: break_even, break_even_kwh_price: break_even_kwh,
    cheaper, savings_per_100km: Math.abs(diff),
  };
  renderVerdict(res);
  renderChart(res);
}

function renderVerdict(res) {
  const card = $("verdict");
  card.classList.remove("is-electric", "is-fuel");
  const isFuel = axisMode === "fuel";

  let icon, title, sub;
  if (res.cheaper === "equal") {
    icon = "⚖️";
    title = t("tie_title");
    sub = t("tie_sub");
  } else if (res.cheaper === "electric") {
    card.classList.add("is-electric");
    icon = "⚡";
    title = t("drive_electric");
    sub = t("charging_cheaper");
  } else {
    card.classList.add("is-fuel");
    icon = "⛽";
    title = t("drive_fuel");
    sub = t("fuel_cheaper");
  }

  // Two comparable prices in the SAME unit, following the chart toggle.
  const unit = isFuel ? "/L" : "/kWh";
  const statA = isFuel
    ? { energy: "fuel", label: t("pump_price"), val: res.fuel_price }
    : { energy: "elec", label: t("your_elec_price"), val: res.location.price_chf_per_kwh };
  const statB = isFuel
    ? { energy: "elec", label: t("charging_as_fuel"), val: res.break_even_fuel_price }
    : { energy: "fuel", label: t("fuel_as_elec"), val: res.break_even_kwh_price };
  const cheaperEnergy = res.cheaper === "equal" ? null
    : (res.cheaper === "electric" ? "elec" : "fuel");

  const gap = (statA.val != null && statB.val != null) ? Math.abs(statA.val - statB.val) : null;
  const detail = gap != null
    ? t("gap_detail", { gap: `${CHF(gap)}${unit}`, cf: CHF(res.cost_fuel), ce: CHF(res.cost_elec) })
    : t("real_cost", { cf: CHF(res.cost_fuel), ce: CHF(res.cost_elec) });

  // Plain-language break-even threshold, following the toggle.
  const beRule = isFuel ? res.break_even_fuel_price : res.break_even_kwh_price;
  let rule = "";
  if (beRule != null) {
    rule = isFuel
      ? t("rule_fuel", { kwh: `${CHF(res.location.price_chf_per_kwh)}/kWh`, be: `${CHF(beRule)}/L` })
      : t("rule_kwh", { fuel: `${CHF(res.fuel_price)}/L`, be: `${CHF(beRule)}/kWh` });
  }

  const statHtml = (s) => {
    const cls = s.energy === "fuel" ? "fuel" : "elec";
    const tag = cheaperEnergy === s.energy ? `<div class="stat__tag">${t("cheaper_tag")}</div>` : "";
    const val = s.val != null
      ? `${CHF(s.val)}<span class="stat__unit">${unit}</span>` : "—";
    return `<div class="stat stat--price"><div class="stat__num ${cls}">${val}</div>` +
           `<div class="stat__lbl">${s.label}</div>${tag}</div>`;
  };

  card.innerHTML = `
    <div class="verdict__row">
      <div class="verdict__icon">${icon}</div>
      <div class="verdict__main">
        <p class="verdict__title">${title}</p>
        <p class="verdict__sub">${sub}</p>
        ${rule ? `<p class="verdict__rule">⚡ ${rule}</p>` : ""}
        <p class="verdict__sub">${detail}</p>
      </div>
      <div class="verdict__stats">
        ${statHtml(statA)}
        <div class="stat__vs">vs</div>
        ${statHtml(statB)}
      </div>
    </div>`;
}

// --- Chart -------------------------------------------------------------------
// 2D break-even map. Each price sits on its own axis in its natural unit:
//   fuel mode → x = fuel price (CHF/L),  y = electricity price (CHF/kWh)
// The diagonal break-even line is where fuel and electric cost the same
// (fc·fuel_price = pc·kwh_price). Below it one energy wins, above it the other.
// A dot marks your current prices, so you see at a glance which side you're on.
function renderChart(res) {
  lastResult = res;
  const isFuel = axisMode === "fuel";
  const fc = res.scenario.fuel_consumption;
  const pc = res.scenario.power_consumption;

  const cfg = isFuel ? {
    xUnit: "CHF/L", yUnit: "CHF/kWh", xTitle: t("axis_per_liter"), yTitle: t("axis_per_kwh"),
    xVal: res.fuel_price, yVal: res.location.price_chf_per_kwh,
    slope: pc > 0 ? fc / pc : 0,   // break-even y for a given x
    belowIsElectric: true,         // below the line (low kWh price) → charging wins
  } : {
    xUnit: "CHF/kWh", yUnit: "CHF/L", xTitle: t("axis_per_kwh"), yTitle: t("axis_per_liter"),
    xVal: res.location.price_chf_per_kwh, yVal: res.fuel_price,
    slope: fc > 0 ? pc / fc : 0,
    belowIsElectric: false,        // below the line (low fuel price) → fuel wins
  };

  const xMax = Math.max(cfg.xVal, 0.01) * 1.8;
  const yLine = cfg.slope * xMax;                       // break-even line at right edge
  const yMax = (Math.max(yLine, cfg.yVal) || 1) * 1.2;

  const steps = 40;
  const beLine = [];
  const topLine = [];
  for (let i = 0; i <= steps; i++) {
    const x = (xMax / steps) * i;
    beLine.push({ x, y: cfg.slope * x });
    topLine.push({ x, y: yMax });
  }

  const teal = "rgba(56,225,176,0.12)", orange = "rgba(255,138,91,0.12)";
  const belowFill = cfg.belowIsElectric ? teal : orange;
  const aboveFill = cfg.belowIsElectric ? orange : teal;

  const data = {
    datasets: [
      // Break-even line, filling down to the x-axis = the "below" region.
      { label: t("break_even_line"), data: beLine, borderColor: "#ffd166", borderWidth: 3,
        fill: "start", backgroundColor: belowFill, pointRadius: 0, tension: 0, order: 2 },
      // Invisible top line, filling down to the break-even line = the "above" region.
      { label: "above", data: topLine, borderColor: "rgba(0,0,0,0)",
        fill: "-1", backgroundColor: aboveFill, pointRadius: 0, tension: 0, order: 3 },
    ],
  };

  const pointColor = res.cheaper === "equal" ? "#7c8cff"
    : res.cheaper === "electric" ? "#38e1b0" : "#ff8a5b";
  const annotations = {
    vline: { type: "line", xMin: cfg.xVal, xMax: cfg.xVal, yMin: 0, yMax: cfg.yVal,
      borderColor: "rgba(124,140,255,0.55)", borderWidth: 1, borderDash: [4, 4] },
    hline: { type: "line", yMin: cfg.yVal, yMax: cfg.yVal, xMin: 0, xMax: cfg.xVal,
      borderColor: "rgba(124,140,255,0.55)", borderWidth: 1, borderDash: [4, 4] },
    here: { type: "point", xValue: cfg.xVal, yValue: cfg.yVal,
      backgroundColor: pointColor, borderColor: "#fff", borderWidth: 2, radius: 7 },
    hereLabel: { type: "label", xValue: cfg.xVal, yValue: cfg.yVal,
      content: [t("you_are_here"), `${cfg.xVal.toFixed(2)} ${cfg.xUnit} · ${cfg.yVal.toFixed(2)} ${cfg.yUnit}`],
      color: "#eaf0ff", font: { size: 11, weight: "600" }, yAdjust: -28,
      backgroundColor: "rgba(0,0,0,0)" },
    elecRegion: { type: "label",
      xValue: xMax * (cfg.belowIsElectric ? 0.72 : 0.26),
      yValue: yMax * (cfg.belowIsElectric ? 0.12 : 0.86),
      content: "⚡ " + t("region_elec"), color: "#38e1b0",
      font: { size: 13, weight: "700" }, backgroundColor: "rgba(0,0,0,0)" },
    fuelRegion: { type: "label",
      xValue: xMax * (cfg.belowIsElectric ? 0.24 : 0.72),
      yValue: yMax * (cfg.belowIsElectric ? 0.86 : 0.12),
      content: "⛽ " + t("region_fuel"), color: "#ff8a5b",
      font: { size: 13, weight: "700" }, backgroundColor: "rgba(0,0,0,0)" },
  };

  const options = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: "nearest", intersect: false, axis: "x" },
    scales: {
      x: { type: "linear", min: 0, max: xMax,
        title: { display: true, text: cfg.xTitle, color: "#9aa7c7" },
        ticks: { color: "#9aa7c7", callback: (v) => v.toFixed(2) },
        grid: { color: "rgba(40,51,88,0.6)" } },
      y: { type: "linear", min: 0, max: yMax,
        title: { display: true, text: cfg.yTitle, color: "#9aa7c7" },
        ticks: { color: "#9aa7c7", callback: (v) => v.toFixed(2) },
        grid: { color: "rgba(40,51,88,0.6)" } },
    },
    plugins: {
      legend: { display: false },
      annotation: { annotations },
      tooltip: {
        filter: (item) => item.datasetIndex === 0,
        callbacks: {
          title: () => t("break_even_line"),
          label: (item) => `${item.parsed.x.toFixed(2)} ${cfg.xUnit} ↔ ${item.parsed.y.toFixed(2)} ${cfg.yUnit}`,
        },
      },
    },
  };

  if (chart) {
    chart.data = data;
    chart.options = options;
    chart.update();
  } else {
    chart = new Chart($("chart").getContext("2d"), { type: "line", data, options });
  }
  renderLegend(pointColor);
}

function renderLegend(pointColor) {
  const items = [
    ["#ffd166", t("break_even_line")],
    ["#38e1b0", t("region_elec")],
    ["#ff8a5b", t("region_fuel")],
    [pointColor, t("you_are_here")],
  ];
  $("legend").innerHTML = items
    .map(([c, txt]) => `<li><span class="dot" style="background:${c}"></span> ${txt}</li>`)
    .join("");
}

// --- Tables ------------------------------------------------------------------
function renderScenarioTable() {
  const tb = $("scenario-table").querySelector("tbody");
  tb.innerHTML = "";
  const ro = isEditor ? "" : "disabled";
  scenarios.forEach((s) => {
    const tr = document.createElement("tr");
    if (s.id === activeScenarioId) tr.classList.add("is-active");
    tr.innerHTML = `
      <td><input type="text" class="name" value="${esc(s.name)}" data-f="name" ${ro}></td>
      <td><input type="number" inputmode="decimal" step="0.1" min="0.1" value="${s.fuel_consumption}" data-f="fuel_consumption" ${ro}></td>
      <td><input type="number" inputmode="decimal" step="0.1" min="0" value="${s.power_consumption}" data-f="power_consumption" ${ro}></td>
      <td class="actions">${isEditor ? `
        <button class="link-btn" data-act="save">${t("save")}</button>
        <button class="icon-btn" data-act="del" title="${t("delete")}">🗑</button>` : ""}</td>`;
    if (isEditor) {
      tr.querySelector('[data-act="save"]').addEventListener("click", () => saveScenarioRow(s.id, tr));
      tr.querySelector('[data-act="del"]').addEventListener("click", () => deleteScenario(s.id));
    }
    tb.appendChild(tr);
  });
}

function renderLocationTable() {
  const tb = $("location-table").querySelector("tbody");
  tb.innerHTML = "";
  const ro = isEditor ? "" : "disabled";
  locations.forEach((l) => {
    const tr = document.createElement("tr");
    if (l.id === activeLocationId) tr.classList.add("is-active");
    tr.innerHTML = `
      <td><input type="text" class="name" value="${esc(l.name)}" data-f="name" ${ro}></td>
      <td><input type="number" inputmode="decimal" step="0.01" min="0" value="${l.price_chf_per_kwh}" data-f="price_chf_per_kwh" ${ro}></td>
      <td class="actions">${isEditor ? `
        <button class="link-btn" data-act="save">${t("save")}</button>
        <button class="icon-btn" data-act="del" title="${t("delete")}">🗑</button>` : ""}</td>`;
    if (isEditor) {
      tr.querySelector('[data-act="save"]').addEventListener("click", () => saveLocationRow(l.id, tr));
      tr.querySelector('[data-act="del"]').addEventListener("click", () => deleteLocation(l.id));
    }
    tb.appendChild(tr);
  });
}

function rowValues(tr) {
  const out = {};
  tr.querySelectorAll("input[data-f]").forEach((inp) => {
    out[inp.dataset.f] = inp.type === "number" ? parseFloat(inp.value) : inp.value;
  });
  return out;
}

async function saveScenarioRow(id, tr) {
  try { await api.put(`/api/scenarios/${id}`, rowValues(tr)); toast(t("toast_scenario_saved")); await reload(); }
  catch (e) { toast(e.message, true); }
}
async function saveLocationRow(id, tr) {
  try { await api.put(`/api/locations/${id}`, rowValues(tr)); toast(t("toast_location_saved")); await reload(); }
  catch (e) { toast(e.message, true); }
}
async function deleteScenario(id) {
  if (!confirm(t("confirm_delete_scenario"))) return;
  try { await api.del(`/api/scenarios/${id}`); toast(t("toast_scenario_deleted")); await reload(); }
  catch (e) { toast(e.message, true); }
}
async function deleteLocation(id) {
  if (!confirm(t("confirm_delete_location"))) return;
  try { await api.del(`/api/locations/${id}`); toast(t("toast_location_deleted")); await reload(); }
  catch (e) { toast(e.message, true); }
}
async function addScenario() {
  try {
    const created = await api.post("/api/scenarios", {
      name: t("new_scenario"), fuel_consumption: 6.5, power_consumption: 21,
    });
    activeScenarioId = created.id;
    localStorage.setItem("activeScenarioId", activeScenarioId);
    toast(t("toast_scenario_added"));
    await reload();
  } catch (e) { toast(e.message, true); }
}
async function addLocation() {
  try {
    const created = await api.post("/api/locations", { name: t("new_location"), price_chf_per_kwh: 0.30 });
    activeLocationId = created.id;
    localStorage.setItem("activeLocationId", activeLocationId);
    toast(t("toast_location_added"));
    await reload();
  } catch (e) { toast(e.message, true); }
}

// --- Utils -------------------------------------------------------------------
function esc(s) { return String(s).replace(/"/g, "&quot;").replace(/</g, "&lt;"); }
let toastTimer = null;
function toast(msg, isError = false) {
  let el = document.querySelector(".toast");
  if (!el) { el = document.createElement("div"); el.className = "toast"; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.toggle("error", isError);
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
}

init().catch((e) => toast(e.message, true));
