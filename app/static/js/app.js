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
const fmtCons = (n) => Number(n).toFixed(1);    // consumption: L/100km, kWh/100km → 1 decimal
const fmtPrice = (n) => Number(n).toFixed(2);   // CHF/kWh → 2 decimals

// --- i18n --------------------------------------------------------------------
const I18N = {
  en: {
    subtitle: "Fuel or electric? Find the price where it flips.",
    fuel_price_title: "Current fuel price",
    fuel_price_note: "Changes often — set it once, it applies to every scenario.",
    chart_title: "When does charging pay off?",
    region_elec: "Electric cheaper", region_fuel: "Fuel cheaper",
    tipping_line: "Tipping line", you_are_here: "Now",
    // Verdict as one sentence: cost comparison + both tipping prices + assumptions.
    verdict_elec: '<span class="accent-elec">Charging</span> pays off',
    verdict_fuel: '<span class="accent-fuel">Filling up</span> pays off',
    verdict_tie: "It's a tie",
    sent_elec: "100 km cost <b>{ce}</b> on electricity instead of <b>{cf}</b> on fuel — <b>{save}</b> saved.",
    sent_fuel: "100 km cost <b>{cf}</b> on fuel instead of <b>{ce}</b> on electricity — <b>{save}</b> saved.",
    sent_tie: "100 km cost <b>{ce}</b> either way.",
    thr_elec: "Only above <b>{bek}</b> — or below <b>{bef}</b> — would filling up be cheaper.",
    thr_fuel: "Only below <b>{bek}</b> — or above <b>{bef}</b> — would charging pay off.",
    note_sep: " · ",
    current_selection: "Calculation values",
    scenario: "Scenario", charging_location: "Charging location",
    save: "Save",
    preview_note: "Preview — not saved",
    unsaved_note: "Not saved yet",
    save_for: "Save for {targets}",
    save_target_fuel: "fuel price",
    reset_values: "Back to saved values",
    fuel_consumption: "Fuel consumption", power_consumption: "Power consumption",
    electricity_price: "Electricity price",
    manage_lists: "Manage lists",
    scenarios: "Scenarios", charging_locations: "Charging locations",
    add: "+ Add", delete: "Delete",
    footer: "Tipping fuel price = (kWh/100km × CHF/kWh) ÷ l/100km",
    verdict_loading: "Calculating…",
    verdict_start: "Add a scenario and a charging location to start.",
    axis_per_liter: "Fuel price (CHF/l)", axis_per_kwh: "Electricity price (CHF/kWh)",
    word_sweetspot: "Sweetspot",
    toast_saved: "Saved",
    toast_scenario_saved: "Scenario saved", toast_location_saved: "Location saved",
    toast_scenario_added: "Scenario added", toast_location_added: "Location added",
    toast_scenario_deleted: "Scenario deleted", toast_location_deleted: "Location deleted",
    toast_invalid_values: "Enter valid values first",
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
    chart_title: "Wann lohnt sich Laden?",
    region_elec: "Strom günstiger", region_fuel: "Benzin günstiger",
    tipping_line: "Kipp-Linie", you_are_here: "Aktuell",
    // Antwort als ein Satz: Kostenvergleich + beide Kipp-Preise + Annahmen.
    verdict_elec: '<span class="accent-elec">Laden</span> lohnt sich',
    verdict_fuel: '<span class="accent-fuel">Tanken</span> lohnt sich',
    verdict_tie: "Unentschieden",
    sent_elec: "100 km kosten mit Strom <b>{ce}</b> statt <b>{cf}</b> mit Benzin — <b>{save}</b> gespart.",
    sent_fuel: "100 km kosten mit Benzin <b>{cf}</b> statt <b>{ce}</b> mit Strom — <b>{save}</b> gespart.",
    sent_tie: "100 km kosten so oder so <b>{ce}</b>.",
    thr_elec: "Erst über <b>{bek}</b> — oder unter <b>{bef}</b> — wäre Tanken günstiger.",
    thr_fuel: "Erst unter <b>{bek}</b> — oder über <b>{bef}</b> — würde sich Laden lohnen.",
    note_sep: " · ",
    current_selection: "Berechnungswerte",
    scenario: "Szenario", charging_location: "Standort",
    save: "Speichern",
    preview_note: "Vorschau — nicht gespeichert",
    unsaved_note: "Noch nicht gespeichert",
    save_for: "Für {targets} speichern",
    save_target_fuel: "Benzinpreis",
    reset_values: "Zurück zu gespeicherten Werten",
    fuel_consumption: "Benzinverbrauch", power_consumption: "Stromverbrauch",
    electricity_price: "Strompreis",
    manage_lists: "Listen verwalten",
    scenarios: "Szenarien", charging_locations: "Standorte",
    add: "+ Hinzufügen", delete: "Löschen",
    footer: "Kipp-Benzinpreis = (kWh/100km × CHF/kWh) ÷ l/100km",
    verdict_loading: "Berechne…",
    verdict_start: "Füge ein Szenario und einen Standort hinzu, um zu starten.",
    axis_per_liter: "Benzinpreis (CHF/l)", axis_per_kwh: "Strompreis (CHF/kWh)",
    word_sweetspot: "Sweetspot",
    toast_saved: "Gespeichert",
    toast_scenario_saved: "Szenario gespeichert", toast_location_saved: "Standort gespeichert",
    toast_scenario_added: "Szenario hinzugefügt", toast_location_added: "Standort hinzugefügt",
    toast_scenario_deleted: "Szenario gelöscht", toast_location_deleted: "Standort gelöscht",
    toast_invalid_values: "Zuerst gültige Werte eingeben",
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
    recalcFromInputs();  // keep the current (possibly unsaved/guest) fuel price
  });
  $("location-select").addEventListener("change", (e) => {
    activeLocationId = Number(e.target.value);
    localStorage.setItem("activeLocationId", activeLocationId);
    syncActiveInputs();
    recalcFromInputs();  // keep the current (possibly unsaved/guest) fuel price
  });

  // Live preview while typing in the active inputs (does not persist until Save).
  ["in-fuel-consumption", "in-power-consumption", "in-kwh-price"]
    .forEach((id) => $(id).addEventListener("input", recalcFromInputs));

  // Global fuel price: same rule as every other input — live preview, stored on Save.
  $("in-fuel-price").addEventListener("input", recalcFromInputs);
  $("fuel-down").addEventListener("click", () => nudgeFuelPrice(-0.05));
  $("fuel-up").addEventListener("click", () => nudgeFuelPrice(0.05));

  $("add-scenario").addEventListener("click", addScenario);
  $("add-location").addEventListener("click", addLocation);

  // Anyone may play with the numbers; only the owner's edits are stored. Save
  // persists them, reset discards them and brings the saved version back.
  $("save-inputs").addEventListener("click", saveInputs);
  $("reset-inputs").addEventListener("click", resetInputs);

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
  applyEditMode();
  renderSelects();          // dropdown names follow the language (with fallback)
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
  updateDirty();   // the unsaved bar reads differently for owner and guest
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

async function reload() {
  let settings;
  [scenarios, locations, settings] = await Promise.all([
    api.get("/api/scenarios"),
    api.get("/api/locations"),
    api.get("/api/settings"),
  ]);
  fuelPrice = settings.fuel_price;
  $("in-fuel-price").value = Number(fuelPrice).toFixed(2);
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
// Name in the active language, falling back to the other if it's empty.
function dispName(o) {
  const primary = lang === "de" ? o.name_de : o.name_en;
  const secondary = lang === "de" ? o.name_en : o.name_de;
  return (primary && primary.trim()) ? primary : (secondary || "");
}

function fillSelect(el, items, activeId) {
  el.innerHTML = "";
  items.forEach((it) => {
    const o = document.createElement("option");
    o.value = it.id;
    o.textContent = dispName(it);
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
    $("in-fuel-consumption").value = fmtCons(s.fuel_consumption);
    $("in-power-consumption").value = fmtCons(s.power_consumption);
  }
  if (l) $("in-kwh-price").value = fmtPrice(l.price_chf_per_kwh);
  updateDirty();
}

// --- What-if vs. saved -------------------------------------------------------
// Everyone may change the inputs, but only the owner's changes are stored. One
// rule for all four fields — nothing is persisted until Save. As soon as an input
// differs from the stored value, say so and offer Save (owner) / a way back.
// Which stored records the current inputs differ from.
function dirtyParts() {
  const s = activeScenario();
  const l = activeLocation();
  if (!s || !l) return { scenario: false, location: false, fuel: false, any: false };
  const v = inputValues();
  // Tolerance = half of the displayed precision: a change that shows up in the
  // field counts as unsaved, floating-point noise does not.
  const off = (a, b, tol) => !isNaN(a) && Math.abs(a - b) >= tol;
  const scenario = off(v.fuel_consumption, s.fuel_consumption, 0.05)
                || off(v.power_consumption, s.power_consumption, 0.05);
  const location = off(v.kwh_price, l.price_chf_per_kwh, 0.005);
  const fuel = off(v.fuel_price, fuelPrice, 0.005);
  return { scenario, location, fuel, any: scenario || location || fuel };
}

function isDirty() { return dirtyParts().any; }

function updateDirty() {
  const d = dirtyParts();
  $("preview-bar").hidden = !d.any;
  if (!d.any) return;
  // Guests see what-if wording, the owner sees what exactly Save would store.
  $("preview-note").textContent = t(isEditor ? "unsaved_note" : "preview_note");
  if (isEditor) $("save-inputs").textContent = t("save_for", { targets: dirtyTargets(d) });
}

// "Winter, Home, fuel price" — the records the Save button would write to.
function dirtyTargets(d) {
  const names = [];
  if (d.scenario) names.push(dispName(activeScenario()));
  if (d.location) names.push(dispName(activeLocation()));
  if (d.fuel) names.push(t("save_target_fuel"));
  return names.join(", ");
}

// Drop the unsaved what-if and show the stored version again.
function resetInputs() {
  $("in-fuel-price").value = Number(fuelPrice).toFixed(2);
  syncActiveInputs();
  recalc();
}

function inputValues() {
  return {
    fuel_consumption: parseFloat($("in-fuel-consumption").value),
    power_consumption: parseFloat($("in-power-consumption").value),
    fuel_price: parseFloat($("in-fuel-price").value),
    kwh_price: parseFloat($("in-kwh-price").value),
  };
}

// The single save: writes exactly the values shown in the fields — scenario
// consumptions, the location's price, the global fuel price — but only what
// actually changed. Guests never get here (the button is owner-only).
async function saveInputs() {
  if (!isEditor) return;
  const d = dirtyParts();
  if (!d.any) return;
  const v = inputValues();
  const invalid = [v.fuel_consumption, v.power_consumption, v.fuel_price, v.kwh_price]
    .some((x) => isNaN(x) || x < 0) || v.fuel_consumption <= 0;
  if (invalid) { toast(t("toast_invalid_values"), true); return; }
  const s = activeScenario();
  const l = activeLocation();
  try {
    // PUT replaces the whole record, so the untouched names travel along.
    if (d.scenario) {
      await api.put(`/api/scenarios/${s.id}`, {
        name_de: s.name_de, name_en: s.name_en,
        fuel_consumption: v.fuel_consumption, power_consumption: v.power_consumption,
      });
    }
    if (d.location) {
      await api.put(`/api/locations/${l.id}`, {
        name_de: l.name_de, name_en: l.name_en, price_chf_per_kwh: v.kwh_price,
      });
    }
    if (d.fuel) await api.put("/api/settings", { fuel_price: v.fuel_price });
    toast(t("toast_saved"));
    await reload();
  } catch (e) { toast(e.message, true); }
}

function nudgeFuelPrice(delta) {
  const current = parseFloat($("in-fuel-price").value) || fuelPrice;
  $("in-fuel-price").value = Math.max(0, Math.round((current + delta) * 100) / 100).toFixed(2);
  recalcFromInputs();
}

// --- Calculation -------------------------------------------------------------
async function recalc() {
  updateDirty();
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
  updateDirty();
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

// The whole answer in one sentence: which is cheaper, by how much, and where it
// would tip — both thresholds at once, so no view has to be switched.
function renderVerdict(res) {
  const card = $("verdict");
  card.classList.remove("is-electric", "is-fuel");

  const isTie = res.cheaper === "equal";
  const isElec = res.cheaper === "electric";
  let icon, title;
  if (isTie) { icon = "⚖️"; title = t("verdict_tie"); }
  else if (isElec) { card.classList.add("is-electric"); icon = "⚡"; title = t("verdict_elec"); }
  else { card.classList.add("is-fuel"); icon = "⛽"; title = t("verdict_fuel"); }

  const ce = CHF(res.cost_elec), cf = CHF(res.cost_fuel);
  const save = CHF(Math.abs(res.cost_fuel - res.cost_elec));
  const sentence = isTie ? t("sent_tie", { ce })
    : isElec ? t("sent_elec", { ce, cf, save })
             : t("sent_fuel", { ce, cf, save });

  // Both tipping prices at once, each in its own unit — the electricity price
  // where it flips, and the fuel price where it flips.
  let threshold = "";
  if (!isTie && res.break_even_kwh_price != null && res.break_even_fuel_price != null) {
    const bek = `${CHF(res.break_even_kwh_price)}/kWh`;
    const bef = `${CHF(res.break_even_fuel_price)}/l`;
    threshold = isElec ? t("thr_elec", { bek, bef }) : t("thr_fuel", { bek, bef });
  }

  // The assumptions behind the numbers, as a small footnote.
  const note = [
    `⛽ ${CHF(res.fuel_price)}/l`,
    `${esc(dispName(res.scenario))}: ${fmtCons(res.scenario.fuel_consumption)} l/100km · ${fmtCons(res.scenario.power_consumption)} kWh/100km`,
    `⚡ ${esc(dispName(res.location))}: ${CHF(res.location.price_chf_per_kwh)}/kWh`,
  ].join(t("note_sep"));

  card.innerHTML = `
    <div class="verdict__row">
      <div class="verdict__icon">${icon}</div>
      <div class="verdict__main">
        <p class="verdict__title">${title}</p>
        <p class="verdict__sentence">${sentence}</p>
        ${threshold ? `<p class="verdict__threshold">${threshold}</p>` : ""}
        <p class="verdict__note">${note}</p>
      </div>
    </div>`;
}

// --- Chart -------------------------------------------------------------------
// 2D tipping map — always the same view: x = fuel price (CHF/l), y = electricity
// price (CHF/kWh). The diagonal tipping line is where fuel and electric cost the
// same (fc·fuel_price = pc·kwh_price); below it charging wins, above it fuel does.
// A dot marks the current prices, so the side you are on is visible at a glance.
function renderChart(res) {
  lastResult = res;
  const fc = res.scenario.fuel_consumption;
  const pc = res.scenario.power_consumption;

  const cfg = {
    xUnit: "CHF/l", yUnit: "CHF/kWh", xTitle: t("axis_per_liter"), yTitle: t("axis_per_kwh"),
    xVal: res.fuel_price, yVal: res.location.price_chf_per_kwh,
    slope: pc > 0 ? fc / pc : 0,   // tipping y for a given x
  };

  // The sweetspot: the tipping fuel price at the current electricity price — a point ON the line.
  const beRule = res.break_even_fuel_price;
  const hasSweet = beRule != null && beRule > 0;
  // Anchor the range on the sweetspot so it stays put across the realistic price
  // range (~2.5× the sweetspot); only widen further if the current price exceeds that.
  const xMax = hasSweet
    ? Math.max(beRule * 2.8, cfg.xVal * 1.1, 0.02)
    : Math.max(cfg.xVal, 0.01) * 1.8;
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

  const belowFill = "rgba(56,225,176,0.12)";   // below the line → electric cheaper
  const aboveFill = "rgba(255,138,91,0.12)";   // above the line → fuel cheaper

  const data = {
    datasets: [
      // Tipping line, filling down to the x-axis = the "below" region.
      { label: t("tipping_line"), data: beLine, borderColor: "#ffd166", borderWidth: 3,
        fill: "start", backgroundColor: belowFill, pointRadius: 0, tension: 0, order: 2 },
      // Invisible top line, filling down to the tipping line = the "above" region.
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
      content: `${cfg.xVal.toFixed(2)} ${cfg.xUnit} · ${cfg.yVal.toFixed(2)} ${cfg.yUnit}`,
      color: "#eaf0ff", font: { size: 11, weight: "600" }, yAdjust: -18,
      // pull the label left when the point is near the right edge so it doesn't clip
      // (narrow phone charts clip earlier, hence the generous threshold)
      xAdjust: cfg.xVal > xMax * 0.55 ? -70 : 0,
      backgroundColor: "rgba(0,0,0,0)" },
    elecRegion: { type: "label",
      xValue: xMax * 0.72, yValue: yMax * 0.12,
      content: "⚡ " + t("region_elec"), color: "#38e1b0",
      font: { size: 13, weight: "700" }, backgroundColor: "rgba(0,0,0,0)" },
    fuelRegion: { type: "label",
      xValue: xMax * 0.24, yValue: yMax * 0.86,
      content: "⛽ " + t("region_fuel"), color: "#ff8a5b",
      font: { size: 13, weight: "700" }, backgroundColor: "rgba(0,0,0,0)" },
  };

  // Sweetspot marker: the point on the tipping line at the current y, with a dotted
  // connector from the current position so it reads as "slide across to the tipping point".
  if (hasSweet) {
    annotations.sweetConn = { type: "line", yMin: cfg.yVal, yMax: cfg.yVal,
      xMin: Math.min(cfg.xVal, beRule), xMax: Math.max(cfg.xVal, beRule),
      borderColor: "rgba(255,209,102,0.7)", borderWidth: 1, borderDash: [3, 3] };
    annotations.sweet = { type: "point", xValue: beRule, yValue: cfg.yVal,
      backgroundColor: "#ffd166", borderColor: "#0b1020", borderWidth: 2, radius: 6 };
    annotations.sweetLabel = { type: "label", xValue: beRule, yValue: cfg.yVal,
      content: [t("word_sweetspot"), `${beRule.toFixed(2)} ${cfg.xUnit}`],
      color: "#ffd166", font: { size: 11, weight: "700" }, yAdjust: 26,
      backgroundColor: "rgba(0,0,0,0)" };
  }

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
          title: () => t("tipping_line"),
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
    ["#ffd166", t("tipping_line")],
    ["#ffd166", t("word_sweetspot")],
    ["#38e1b0", t("region_elec")],
    ["#ff8a5b", t("region_fuel")],
    [pointColor, t("you_are_here")],
  ];
  $("legend").innerHTML = items
    .map(([c, txt]) => `<li><span class="dot" style="background:${c}"></span> ${txt}</li>`)
    .join("");
}

// --- Tables ------------------------------------------------------------------
// List management only: names in, names out. The numbers belong to "Calculation
// values" above and are deliberately not editable a second time here.
function renderScenarioTable() {
  const tb = $("scenario-table").querySelector("tbody");
  tb.innerHTML = "";
  const ro = isEditor ? "" : "disabled";
  scenarios.forEach((s) => {
    const tr = document.createElement("tr");
    if (s.id === activeScenarioId) tr.classList.add("is-active");
    tr.innerHTML = `
      <td><input type="text" class="name" value="${esc(s.name_de)}" data-f="name_de" ${ro}></td>
      <td><input type="text" class="name" value="${esc(s.name_en)}" data-f="name_en" ${ro}></td>
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
      <td><input type="text" class="name" value="${esc(l.name_de)}" data-f="name_de" ${ro}></td>
      <td><input type="text" class="name" value="${esc(l.name_en)}" data-f="name_en" ${ro}></td>
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

// Only the names come from the row; the stored numbers travel along untouched
// (PUT replaces the whole record).
async function saveScenarioRow(id, tr) {
  const s = scenarios.find((x) => x.id === id);
  const body = { fuel_consumption: s.fuel_consumption, power_consumption: s.power_consumption, ...rowValues(tr) };
  try { await api.put(`/api/scenarios/${id}`, body); toast(t("toast_scenario_saved")); await reload(); }
  catch (e) { toast(e.message, true); }
}
async function saveLocationRow(id, tr) {
  const l = locations.find((x) => x.id === id);
  const body = { price_chf_per_kwh: l.price_chf_per_kwh, ...rowValues(tr) };
  try { await api.put(`/api/locations/${id}`, body); toast(t("toast_location_saved")); await reload(); }
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
// New entries only need a name in the current language — the other one can be
// filled in later in "Manage lists" (dispName() falls back until then).
async function addScenario() {
  try {
    const created = await api.post("/api/scenarios", {
      ...oneName("new_scenario"),
      fuel_consumption: 6.5, power_consumption: 21,
    });
    activeScenarioId = created.id;
    localStorage.setItem("activeScenarioId", activeScenarioId);
    toast(t("toast_scenario_added"));
    await reload();
  } catch (e) { toast(e.message, true); }
}
async function addLocation() {
  try {
    const created = await api.post("/api/locations", {
      ...oneName("new_location"), price_chf_per_kwh: 0.30,
    });
    activeLocationId = created.id;
    localStorage.setItem("activeLocationId", activeLocationId);
    toast(t("toast_location_added"));
    await reload();
  } catch (e) { toast(e.message, true); }
}

// --- Utils -------------------------------------------------------------------
// Name in the current language only; the other stays empty on purpose.
function oneName(key) {
  return lang === "de" ? { name_de: I18N.de[key], name_en: "" } : { name_de: "", name_en: I18N.en[key] };
}
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
