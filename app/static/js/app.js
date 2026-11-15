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
// Display currency: CHF or EUR. A label only — nothing is converted, the maths is
// the same in any currency. Picked with the switch (or ?cur=eur), kept per browser.
const urlParams = new URLSearchParams(location.search);
let currency = pickCurrency();
function pickCurrency() {
  const q = (urlParams.get("cur") || "").toUpperCase();
  if (q === "EUR" || q === "CHF") return q;
  return localStorage.getItem("currency") === "EUR" ? "EUR" : "CHF";
}
// What is shown for it: the euro as its sign (shorter, and what its readers
// expect), the franc as "CHF". Same build for both — sign first, decimal point.
const CUR_SIGN = { CHF: "CHF", EUR: "€" };
const curSign = () => CUR_SIGN[currency];
const money = (n) => curSign() + " " + Number(n).toFixed(2);
const fmtCons = (n) => Number(n).toFixed(1);    // consumption: L/100km, kWh/100km → 1 decimal
const fmtPrice = (n) => Number(n).toFixed(2);   // CHF/kWh → 2 decimals

// Yearly mileage is fixed on purpose: it makes "per 100 km" tangible without
// adding a field to fill in. Not editable — see CLAUDE.md.
const ANNUAL_KM = 15000;
const THOUSANDS = { en: ",", de: "'" };
const fmtInt = (n) =>
  Math.round(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS[lang] || ",");
const money0 = (n) => curSign() + " " + fmtInt(n);   // whole francs, for the yearly figure
// A year's saving at `share` % electric km, in francs (negative = extra cost).
// The ONE place this is computed — the verdict sentence and the row under the
// chart both call it, so they can never disagree by a rounding franc. Built on
// the per-100-km difference as it is displayed (rounded to cents' precision).
function yearlyAt(res, share) {
  const per100 = Number((res.cost_fuel - res.cost_elec).toFixed(4));
  return Number((per100 * (share / 100) * (ANNUAL_KM / 100)).toFixed(6));
}
// Share of km driven electric: five fixed stops, chosen with chips.
const SHARE_STEPS = [100, 75, 50, 25, 0];   // shown in this order: all-electric first
let electricShare = 100;   // the active (possibly unsaved) share — chips, not an input field

// --- i18n --------------------------------------------------------------------
const I18N = {
  en: {
    app_title: "PHEV Charging Calculator",
    subtitle: "Find the break-even electricity price for your plug-in hybrid.",
    fuel_price_title: "Current fuel price",
    chart_title: "Every price combination",
    bar_title: "Your break-even electricity price",
    bar_here: "You pay", bar_tip: "Break-even price",
    bar_no_tip: "With 0 kWh/100km there is no break-even price — charging costs nothing.",
    region_elec: "Electric cheaper", region_fuel: "Fuel cheaper",
    tipping_line: "Break-even line",
    profile_drive: "Trip", profile_charge: "Charging",
    // Verdict as one sentence: cost comparison + both tipping prices + assumptions.
    verdict_elec: '<span class="accent-elec">Charging</span> pays off',
    verdict_fuel: '<span class="accent-fuel">Filling up</span> pays off',
    verdict_tie: "It's a tie",
    sent_elec: "All-electric: <b>{ce}</b>/100&nbsp;km instead of <b>{cf}</b> on fuel — <b>{save}</b> cheaper.",
    sent_fuel: "On fuel: <b>{cf}</b>/100&nbsp;km instead of <b>{ce}</b> all-electric — <b>{save}</b> cheaper.",
    sent_tie: "<b>{ce}</b>/100&nbsp;km — all-electric and on fuel alike.",
    // Money at the scenario's electric share: what is actually paid and what a
    // year of it comes to. Replaces the plain yearly line.
    blend_save: "At <b>{share} %</b> electric km, 100 km cost <b>{blend}</b> — about <b>{amount}</b> a year saved compared with fuel only, at {km}&nbsp;km.",
    blend_more: "At <b>{share} %</b> electric km, 100 km cost <b>{blend}</b> — about <b>{amount}</b> a year more than on fuel at {km}&nbsp;km.",
    // At 100 % the mixed cost equals the sentence above — only the year is new.
    year_save: "About <b>{amount}</b> a year saved compared with fuel only, at {km}&nbsp;km.",
    year_more: "About <b>{amount}</b> a year more than on fuel at {km}&nbsp;km.",
    electric_share: "Electric share", share_label: "{share} % electric km",
    share_row: "A year at {km} km, by electric share:",
    share_row_saved: "{share} % electric km: about {amount} a year saved",
    share_row_more: "{share} % electric km: about {amount} a year more than on fuel",
    share_row_zero: "{share} % electric km: no difference",
    share_default: "Default · {name}", share_default_label: "Store {share} % as the default for {name}",
    thr_elec: "Only above <b>{bek}</b> — or below <b>{bef}</b> — would filling up be cheaper.",
    thr_fuel: "Only below <b>{bek}</b> — or above <b>{bef}</b> — would charging pay off.",
    note_sep: " · ",
    current_selection: "Calculation values",
    save: "Save",
    unsaved_note: "Not saved yet",
    save_for: "Save for {targets}",
    save_target_fuel: "fuel price",
    reset_values: "Back to saved values",
    fuel_consumption: "Fuel consumption", power_consumption: "Power consumption",
    power_consumption_note: "at the socket, incl. charging losses",
    electricity_price: "Electricity price",
    manage_lists: "Manage lists",
    scenarios: "Scenarios", charging_locations: "Charging locations",
    add: "+ Add", delete: "Delete",
    footer: "Break-even electricity price = (l/100km × {cur}/l) ÷ kWh/100km",
    currency: "Currency",
    // Guests: own numbers are kept in this browser only, never on the server.
    guest_note: "Your own values — kept in this browser only",
    guest_reset: "Back to the default values",
    verdict_invalid: "Enter all four values to compare — both consumptions must be greater than 0.",
    verdict_loading: "Calculating…",
    verdict_start: "Add a scenario and a charging location to start.",
    axis_per_liter: "Fuel price ({cur}/l)", axis_per_kwh: "Electricity price ({cur}/kWh)",
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
    theme: "Appearance", theme_dark: "Dark", theme_light: "Light",
  },
  de: {
    app_title: "PHEV Kostenvergleich",
    subtitle: "Lohnt sich Laden? Der Break-even-Punkt zwischen Strom- und Benzinkosten.",
    fuel_price_title: "Aktueller Benzinpreis",
    chart_title: "Alle Preiskombinationen",
    bar_title: "Der Break-even-Strompreis",
    bar_here: "Bezahlt wird", bar_tip: "Break-even-Preis",
    bar_no_tip: "Bei 0 kWh/100km gibt es keinen Break-even-Preis — Laden kostet nichts.",
    region_elec: "Strom günstiger", region_fuel: "Benzin günstiger",
    tipping_line: "Break-even-Linie",
    profile_drive: "Fahrt", profile_charge: "Laden",
    // Antwort als ein Satz: Kostenvergleich + beide Break-even-Preise + Annahmen.
    verdict_elec: '<span class="accent-elec">Laden</span> lohnt sich',
    verdict_fuel: '<span class="accent-fuel">Tanken</span> lohnt sich',
    verdict_tie: "Unentschieden",
    sent_elec: "Rein elektrisch: <b>{ce}</b>/100&nbsp;km statt <b>{cf}</b> mit Benzin — <b>{save}</b> günstiger.",
    sent_fuel: "Mit Benzin: <b>{cf}</b>/100&nbsp;km statt <b>{ce}</b> rein elektrisch — <b>{save}</b> günstiger.",
    sent_tie: "<b>{ce}</b>/100&nbsp;km — rein elektrisch wie mit Benzin.",
    // Geld beim Stromanteil des Szenarios: was tatsächlich bezahlt wird und
    // was ein Jahr davon ausmacht. Ersetzt die reine Jahreszeile.
    blend_save: "Bei <b>{share} %</b> der km im EV-Modus kosten 100 km <b>{blend}</b> — rund <b>{amount}</b> pro Jahr gespart gegenüber Benzin bei {km}&nbsp;km.",
    blend_more: "Bei <b>{share} %</b> der km im EV-Modus kosten 100 km <b>{blend}</b> — rund <b>{amount}</b> pro Jahr mehr als mit Benzin bei {km}&nbsp;km.",
    year_save: "Rund <b>{amount}</b> pro Jahr gespart gegenüber Benzin bei {km}&nbsp;km.",
    year_more: "Rund <b>{amount}</b> pro Jahr mehr als mit Benzin bei {km}&nbsp;km.",
    electric_share: "Stromanteil", share_label: "{share} % der km im EV-Modus",
    share_row: "Pro Jahr bei {km} km, nach km-Anteil im EV-Modus:",
    share_row_saved: "{share} % der km im EV-Modus: rund {amount} pro Jahr gespart",
    share_row_more: "{share} % der km im EV-Modus: rund {amount} pro Jahr mehr als mit Benzin",
    share_row_zero: "{share} % der km im EV-Modus: kein Unterschied",
    share_default: "Default · {name}", share_default_label: "{share} % als Default für {name} speichern",
    thr_elec: "Erst über <b>{bek}</b> — oder unter <b>{bef}</b> — wäre Tanken günstiger.",
    thr_fuel: "Erst unter <b>{bek}</b> — oder über <b>{bef}</b> — würde sich Laden lohnen.",
    note_sep: " · ",
    current_selection: "Berechnungswerte",
    save: "Speichern",
    unsaved_note: "Noch nicht gespeichert",
    save_for: "Für {targets} speichern",
    save_target_fuel: "Benzinpreis",
    reset_values: "Zurück zu gespeicherten Werten",
    fuel_consumption: "Benzinverbrauch", power_consumption: "Stromverbrauch",
    power_consumption_note: "ab Steckdose, inkl. Ladeverluste",
    electricity_price: "Strompreis",
    manage_lists: "Listen verwalten",
    scenarios: "Szenarien", charging_locations: "Standorte",
    add: "+ Hinzufügen", delete: "Löschen",
    footer: "Break-even-Strompreis = (l/100km × {cur}/l) ÷ kWh/100km",
    currency: "Währung",
    guest_note: "Eigene Werte — nur in diesem Browser gespeichert",
    guest_reset: "Zurück zu den Standardwerten",
    verdict_invalid: "Für den Vergleich werden alle vier Werte benötigt — beide Verbräuche grösser als 0.",
    verdict_loading: "Berechne…",
    verdict_start: "Füge ein Szenario und einen Standort hinzu, um zu starten.",
    axis_per_liter: "Benzinpreis ({cur}/l)", axis_per_kwh: "Strompreis ({cur}/kWh)",
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
    theme: "Darstellung", theme_dark: "Dunkel", theme_light: "Hell",
  },
};

function t(key, vars) {
  let s = (I18N[lang] && I18N[lang][key]) ?? I18N.en[key] ?? key;
  if (vars) for (const k in vars) s = s.split(`{${k}}`).join(vars[k]);
  return s.split("{cur}").join(curSign());
}

function applyStaticTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  // Units in the markup ("CHF/l") follow the display currency.
  document.querySelectorAll("[data-unit]").forEach((el) => { el.textContent = curSign() + el.dataset.unit; });
  document.documentElement.lang = lang;
  document.title = t("app_title");   // browser tab / bookmark follows the language too
}

// --- State -------------------------------------------------------------------
let scenarios = [];
let locations = [];
let activeScenarioId = Number(localStorage.getItem("activeScenarioId")) || null;
let activeLocationId = Number(localStorage.getItem("activeLocationId")) || null;
let lang = pickLang();
// ?lang=de (a shared link) beats the stored choice; without either the browser's
// own language decides, so a German-speaking visitor is not greeted in English.
function pickLang() {
  const q = (urlParams.get("lang") || "").toLowerCase();
  if (q === "de" || q === "en") return q;
  const stored = localStorage.getItem("lang");
  if (stored === "de" || stored === "en") return stored;
  return (navigator.language || "").toLowerCase().startsWith("de") ? "de" : "en";
}
// The inline script in index.html already picked the theme before first paint
// (stored choice, else the system setting) — read it back, never re-decide here.
let theme = document.documentElement.dataset.theme === "light" ? "light" : "dark";
let isEditor = false;   // owner logged in? writes are blocked for everyone else
let fuelPrice = 1.80;   // global current fuel price (CHF/L), loaded from /api/settings
let chart = null;
let lastResult = null;  // keep the latest computed result so toggling re-renders instantly

// --- Boot --------------------------------------------------------------------
async function init() {
  applyLangToggleUI();
  applyThemeToggleUI();
  applyCurToggleUI();
  applyStaticTranslations();
  // Auth before the data: whether stored guest values apply depends on it.
  await refreshAuth();
  await reload();

  // Live preview while typing in the active inputs (does not persist until Save).
  ["in-fuel-consumption", "in-power-consumption", "in-kwh-price"]
    .forEach((id) => $(id).addEventListener("input", recalcFromInputs));

  // Global fuel price: same rule as every other input — live preview, stored on Save.
  $("in-fuel-price").addEventListener("input", recalcFromInputs);
  // A price always reads with two decimals — "1.90", never "1.9". Normalised on
  // blur, not while typing, so "1.9" can still be typed one character at a time.
  ["in-fuel-price", "in-kwh-price"].forEach((id) => {
    $(id).addEventListener("blur", () => normalizePriceInput(id));
  });
  renderShareChips();
  $("fuel-down").addEventListener("click", () => nudgeFuelPrice(-0.05));
  $("fuel-up").addEventListener("click", () => nudgeFuelPrice(0.05));

  $("add-scenario").addEventListener("click", addScenario);
  $("add-location").addEventListener("click", addLocation);

  // Anyone may play with the numbers; only the owner's edits are stored. Save
  // persists them, reset discards them and brings the saved version back.
  $("save-inputs").addEventListener("click", saveInputs);
  $("reset-inputs").addEventListener("click", resetInputs);

  // The 2D map is the optional deep view — closed by default, and whoever opens
  // it keeps it open on the next visit. Chart.js needs a visible canvas, so the
  // chart is only drawn once the disclosure is open.
  const cd = $("chart-details");
  cd.open = localStorage.getItem("chartOpen") === "1";
  cd.addEventListener("toggle", () => {
    localStorage.setItem("chartOpen", cd.open ? "1" : "0");
    if (cd.open && lastResult) renderChart(lastResult);
  });

  $("lang-toggle").querySelectorAll(".toggle__btn").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });

  $("theme-toggle").querySelectorAll(".toggle__btn").forEach((btn) => {
    btn.addEventListener("click", () => setTheme(btn.dataset.theme));
  });
  $("cur-toggle").querySelectorAll(".toggle__btn").forEach((btn) => {
    btn.addEventListener("click", () => setCurrency(btn.dataset.cur));
  });
  // Until the switch is used, the system decides — and keeps deciding while the
  // page is open (a Mac flipping to dark at sunset flips the app with it).
  const mq = window.matchMedia("(prefers-color-scheme: light)");
  const follow = (e) => { if (!localStorage.getItem("theme")) setTheme(e.matches ? "light" : "dark", false); };
  if (mq.addEventListener) mq.addEventListener("change", follow);
  else if (mq.addListener) mq.addListener(follow);   // older WebKit

  // Auth: lock button + login modal.
  $("auth-btn").addEventListener("click", () => (isEditor ? doLogout() : openLogin()));
  $("login-cancel").addEventListener("click", closeLogin);
  $("login-backdrop").addEventListener("click", closeLogin);
  $("login-submit").addEventListener("click", doLogin);
  $("login-password").addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(); });
}

// --- Theme -------------------------------------------------------------------
// Dark and light are the same UI in two palettes: every colour is a CSS token
// (see styles.css), so switching means one attribute on <html>. Only the chart
// bakes its colours in at draw time — hence the redraw.
// persist=false is the system following its own setting; a click stores it.
function setTheme(next, persist = true) {
  theme = next === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  if (persist) localStorage.setItem("theme", theme);
  applyThemeToggleUI();
  if (lastResult) renderChart(lastResult);
}

function applyThemeToggleUI() {
  $("theme-toggle").setAttribute("aria-label", t("theme"));
  $("theme-toggle").querySelectorAll(".toggle__btn").forEach((btn) => {
    const on = btn.dataset.theme === theme;
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    // The icon alone would be an unlabelled button — the words carry it.
    const label = t(btn.dataset.theme === "light" ? "theme_light" : "theme_dark");
    btn.title = label;
    btn.setAttribute("aria-label", label);
  });
}

// Current value of a CSS token — how the chart stays in sync with the theme.
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function setLang(l) {
  lang = l === "de" ? "de" : "en";
  localStorage.setItem("lang", lang);
  dropUrlParam("lang");
  rerenderTexts();
}

// The display currency is a label, so switching it only redraws the texts.
function setCurrency(c) {
  currency = c === "EUR" ? "EUR" : "CHF";
  localStorage.setItem("currency", currency);
  dropUrlParam("cur");
  rerenderTexts();
}

// A choice made with a switch beats the link's ?lang= / ?cur= from then on —
// otherwise the next reload would silently undo the click.
function dropUrlParam(name) {
  if (!urlParams.has(name)) return;
  urlParams.delete(name);
  const q = urlParams.toString();
  history.replaceState(null, "", location.pathname + (q ? "?" + q : ""));
}

function applyCurToggleUI() {
  $("cur-toggle").setAttribute("aria-label", t("currency"));
  $("cur-toggle").querySelectorAll(".toggle__btn").forEach((btn) => {
    const on = btn.dataset.cur === currency;
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
}

// Everything that carries words or a currency, redrawn after a switch.
function rerenderTexts() {
  applyLangToggleUI();
  applyThemeToggleUI();     // the switch's tooltips are translated too
  applyCurToggleUI();
  applyStaticTranslations();
  applyEditMode();
  renderChips();            // chip names follow the language (with fallback)
  renderShareChips();
  renderDefaultShareChips();
  renderScenarioTable();
  renderLocationTable();
  if (lastResult) renderAll(lastResult);
  else if (activeScenarioId && activeLocationId) recalcFromInputs();   // keeps an "invalid input" hint
  else recalc();
}

// --- Auth --------------------------------------------------------------------
async function refreshAuth() {
  try { isEditor = (await api.get("/api/me")).editor; } catch { isEditor = false; }
  if (isEditor) clearGuest();   // the owner works on the stored values, not on browser-local ones
  applyEditMode();
  // Tables were first rendered before auth was known — refresh so edit controls match.
  renderScenarioTable();
  renderLocationTable();
}
function applyEditMode() {
  document.body.classList.toggle("is-editor", isEditor);
  const authWord = t(isEditor ? "auth_logout" : "auth_edit");
  $("auth-btn").innerHTML = `<span aria-hidden="true">${isEditor ? "🔓" : "🔒"}</span><span class="auth-btn__txt"> ${authWord}</span>`;
  $("auth-btn").setAttribute("aria-label", authWord);
  $("auth-btn").title = authWord;
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
    clearGuest();   // what is in the fields stays (and can be saved); the browser copy goes
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
    btn.setAttribute("aria-pressed", btn.dataset.lang === lang ? "true" : "false");
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
  $("in-fuel-price").value = Number(guestFuelPrice() ?? fuelPrice).toFixed(2);
  if (!scenarios.some((s) => s.id === activeScenarioId)) activeScenarioId = scenarios[0]?.id ?? null;
  if (!locations.some((l) => l.id === activeLocationId)) activeLocationId = locations[0]?.id ?? null;
  renderChips();
  renderScenarioTable();
  renderLocationTable();
  syncActiveInputs();
  // A guest's own values are in the fields now — compute from those, not from
  // the server's stored record.
  if (isDirty()) recalcFromInputs(); else recalc();
}

// --- Guest values ------------------------------------------------------------
// A visitor's own numbers survive a reload — in THIS browser only (localStorage),
// never on the server: { fuel, s: { <scenario id>: { fc, pc } }, l: { <location id>: price } }.
// Only values that differ from the stored ones are kept. Owner sessions ignore
// and clear it; for the owner the one truth is the server.
const GUEST_KEY = "guestValues";
function loadGuest() {
  try {
    const g = JSON.parse(localStorage.getItem(GUEST_KEY) || "{}") || {};
    return { fuel: g.fuel ?? null, s: g.s || {}, l: g.l || {} };
  } catch { return { fuel: null, s: {}, l: {} }; }
}
function saveGuest(g) {
  const empty = g.fuel == null && !Object.keys(g.s).length && !Object.keys(g.l).length;
  try {
    if (empty) localStorage.removeItem(GUEST_KEY);
    else localStorage.setItem(GUEST_KEY, JSON.stringify(g));
  } catch { /* storage blocked — the values simply live until the reload */ }
}
function clearGuest() { try { localStorage.removeItem(GUEST_KEY); } catch { /* ignore */ } }
function hasGuestValues() { return !isEditor && localStorage.getItem(GUEST_KEY) != null; }
const okNum = (x, min) => typeof x === "number" && isFinite(x) && x >= min;
function guestFuelPrice() {
  const f = isEditor ? null : loadGuest().fuel;
  return okNum(f, 0) ? f : null;
}
function guestScenario(s) {
  const g = isEditor || !s ? null : loadGuest().s[s.id];
  return g && okNum(g.fc, 0.01) && okNum(g.pc, 0.01) ? g : null;
}
// The kWh price that counts for a location: the guest's own if there is one.
function locPrice(l) {
  const p = isEditor ? null : loadGuest().l[l.id];
  return okNum(p, 0) ? p : l.price_chf_per_kwh;
}
// Remember what the guest typed (valid values only), drop what equals the stored value.
function storeGuestValues(v) {
  const s = activeScenario(), l = activeLocation();
  if (isEditor || !s || !l) return;
  const d = dirtyParts();
  const g = loadGuest();
  if (d.scenario) g.s[s.id] = { fc: v.fuel_consumption, pc: v.power_consumption }; else delete g.s[s.id];
  if (d.location) g.l[l.id] = v.kwh_price; else delete g.l[l.id];
  g.fuel = d.fuel ? v.fuel_price : null;
  saveGuest(g);
}

// --- Profile chips + active inputs -------------------------------------------
// Both lists as chips instead of dropdowns: every profile is visible without a
// click, switching costs one click, and it is obvious that profiles exist.
function renderChips() {
  fillChips($("scenario-chips"), scenarios, activeScenarioId, pickScenario);
  fillChips($("location-chips"), locations, activeLocationId, pickLocation);
  if (lastResult) paintLocationChips(lastResult);   // keep the colours across a re-render
  renderValueNames();
}

// The charging chips carry the answer for every location at once: a place whose
// kWh price stays under the break-even price is cheaper than fuel (⚡ green),
// above it fuel wins (⛽ amber). That is the "compare all locations" question
// answered without a click and without a second table — the break-even price is
// the same for all of them, only each location's own price differs.
function paintLocationChips(res) {
  const bek = res ? res.break_even_kwh_price : null;
  $("location-chips").querySelectorAll(".chip").forEach((b) => {
    const loc = locations.find((l) => l.id === Number(b.dataset.id));
    const ico = b.querySelector(".chip__ico");
    b.classList.remove("chip--elec", "chip--fuel");
    ico.textContent = "";
    b.removeAttribute("title");
    b.removeAttribute("aria-label");
    if (!loc || bek == null || !(bek > 0)) return;
    // The active chip follows the (possibly unsaved) input, the others the stored price.
    const price = loc.id === activeLocationId ? res.location.price_chf_per_kwh : locPrice(loc);
    const elec = price <= bek;
    b.classList.add(elec ? "chip--elec" : "chip--fuel");
    ico.textContent = elec ? "⚡" : "⛽";   // never colour alone
    const words = `${money(price)}/kWh · ${t(elec ? "region_elec" : "region_fuel")}`;
    b.title = words;
    b.setAttribute("aria-label", `${dispName(loc)} — ${words}`);
  });
}

// Which record each number belongs to — the chips are the selector, these are
// just headings so an edit is never attributed to the wrong profile.
function renderValueNames() {
  const s = activeScenario();
  const l = activeLocation();
  $("values-scenario-name").textContent = s ? dispName(s) : "";
  $("values-location-name").textContent = l ? dispName(l) : "";
}
// Name in the active language, falling back to the other if it's empty.
function dispName(o) {
  const primary = lang === "de" ? o.name_de : o.name_en;
  const secondary = lang === "de" ? o.name_en : o.name_de;
  return (primary && primary.trim()) ? primary : (secondary || "");
}

function fillChips(el, items, activeId, onPick) {
  el.innerHTML = "";
  items.forEach((it) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip" + (it.id === activeId ? " is-on" : "");
    b.dataset.id = it.id;
    b.setAttribute("aria-pressed", it.id === activeId ? "true" : "false");
    b.innerHTML = `<i class="chip__ico" aria-hidden="true"></i><span class="chip__name"></span>`;
    b.querySelector(".chip__name").textContent = dispName(it);
    b.addEventListener("click", () => onPick(it.id));
    el.appendChild(b);
  });
}

// The electric-share picker: five chips, one is on. Same what-if rule as the
// number fields — anyone may click, only Save (owner) stores it.
function renderShareChips() {
  const el = $("in-electric-share");
  el.innerHTML = "";
  SHARE_STEPS.forEach((v) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip" + (v === electricShare ? " is-on" : "");
    b.dataset.share = v;
    b.textContent = `${v} %`;
    b.setAttribute("aria-pressed", v === electricShare ? "true" : "false");
    b.setAttribute("aria-label", t("share_label", { share: v }));
    b.addEventListener("click", () => {
      if (v === electricShare) return;
      electricShare = v;
      renderShareChips();
      recalcFromInputs();
    });
    el.appendChild(b);
  });
}

// Owner row: the stored default share of the active scenario. One click stores
// it (PUT, like a rename) and the what-if row follows — the owner wants to see
// the default they just set.
function renderDefaultShareChips() {
  const s = activeScenario();
  const el = $("default-share-chips");
  el.innerHTML = "";
  if (!s) { $("default-share-label").textContent = ""; return; }
  const cur = s.electric_share ?? 100;
  $("default-share-label").textContent = t("share_default", { name: dispName(s) });
  SHARE_STEPS.forEach((v) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip" + (v === cur ? " is-on" : "");
    b.dataset.share = v;
    b.textContent = `${v} %`;
    b.setAttribute("aria-pressed", v === cur ? "true" : "false");
    b.setAttribute("aria-label", t("share_default_label", { share: v, name: dispName(s) }));
    b.addEventListener("click", () => setDefaultShare(v));
    el.appendChild(b);
  });
}

async function setDefaultShare(v) {
  const s = activeScenario();
  if (!isEditor || !s || v === (s.electric_share ?? 100)) return;
  try {
    // PUT replaces the whole record, so the stored numbers travel along unchanged.
    await api.put(`/api/scenarios/${s.id}`, {
      name_de: s.name_de, name_en: s.name_en,
      fuel_consumption: s.fuel_consumption, power_consumption: s.power_consumption,
      electric_share: v,
    });
    s.electric_share = v;
    electricShare = v;
    renderShareChips();
    renderDefaultShareChips();
    toast(t("toast_saved"));
    recalcFromInputs();
  } catch (e) { toast(e.message, true); }
}

// Switching a profile keeps the current (possibly unsaved/guest) fuel price.
function pickScenario(id) {
  if (id === activeScenarioId) return;
  activeScenarioId = id;
  localStorage.setItem("activeScenarioId", activeScenarioId);
  renderChips();
  syncActiveInputs();
  recalcFromInputs();
}
function pickLocation(id) {
  if (id === activeLocationId) return;
  activeLocationId = id;
  localStorage.setItem("activeLocationId", activeLocationId);
  renderChips();
  syncActiveInputs();
  recalcFromInputs();
}

function activeScenario() { return scenarios.find((s) => s.id === activeScenarioId); }
function activeLocation() { return locations.find((l) => l.id === activeLocationId); }

function syncActiveInputs() {
  const s = activeScenario();
  const l = activeLocation();
  if (s) {
    const gs = guestScenario(s);
    $("in-fuel-consumption").value = fmtCons(gs ? gs.fc : s.fuel_consumption);
    $("in-power-consumption").value = fmtCons(gs ? gs.pc : s.power_consumption);
    electricShare = s.electric_share ?? 100;
    renderShareChips();
    renderDefaultShareChips();
  }
  if (l) $("in-kwh-price").value = fmtPrice(locPrice(l));
  renderValueNames();
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
  // The electric share is not in here: its what-if row is free for everyone,
  // the stored default has its own owner row (setDefaultShare).
  const scenario = off(v.fuel_consumption, s.fuel_consumption, 0.05)
                || off(v.power_consumption, s.power_consumption, 0.05);
  const location = off(v.kwh_price, l.price_chf_per_kwh, 0.005);
  const fuel = off(v.fuel_price, fuelPrice, 0.005);
  return { scenario, location, fuel, any: scenario || location || fuel };
}

function isDirty() { return dirtyParts().any; }

function updateDirty() {
  const d = dirtyParts();
  // Owner: the fields differ from the stored record → "not saved yet" + Save.
  // Guest: nothing reaches the server, but own values are kept in this browser —
  // say so and offer the way back to the defaults (Save stays owner-only).
  const show = isEditor ? d.any : (d.any || hasGuestValues());
  $("preview-bar").hidden = !show;
  $("preview-note").textContent = t(isEditor ? "unsaved_note" : "guest_note");
  $("reset-inputs").textContent = t(isEditor ? "reset_values" : "guest_reset");
  if (isEditor && d.any) $("save-inputs").textContent = t("save_for", { targets: dirtyTargets(d) });
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
  clearGuest();
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
    electric_share: electricShare,
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
        electric_share: s.electric_share ?? 100,   // stored default travels along unchanged
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

// Show a typed price the way every other price is shown: two decimals.
function normalizePriceInput(id) {
  const el = $(id);
  const v = parseFloat(el.value);
  if (isNaN(v) || v < 0) return;
  const rounded = fmtPrice(v);
  if (rounded === el.value) return;
  el.value = rounded;          // "1.904" → "1.90": recompute so the shown price is the one used
  recalcFromInputs();
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
    INPUT_IDS.forEach((id) => $(id).removeAttribute("aria-invalid"));
    renderAll(res);
  } catch (e) { toast(e.message, true); }
}

// Recompute locally from the (possibly unsaved) input fields, for instant feedback.
function recalcFromInputs() {
  const v = inputValues();
  // Empty, negative or a zero consumption: no comparison is possible — say so
  // and mark the field, rather than leave a stale or absurd result standing.
  const bad = invalidFields(v);
  INPUT_IDS.forEach((id) => {
    if (bad.includes(id)) $(id).setAttribute("aria-invalid", "true"); else $(id).removeAttribute("aria-invalid");
  });
  if (bad.length) { updateDirty(); renderInvalid(); return; }
  storeGuestValues(v);
  updateDirty();
  const cost_fuel = v.fuel_consumption * v.fuel_price;
  const cost_elec = v.power_consumption * v.kwh_price;
  const break_even = v.fuel_consumption > 0 ? (v.power_consumption * v.kwh_price) / v.fuel_consumption : null;
  const break_even_kwh = v.power_consumption > 0 ? (v.fuel_consumption * v.fuel_price) / v.power_consumption : null;
  const diff = cost_fuel - cost_elec;
  const cheaper = Math.abs(diff) < 1e-9 ? "equal" : diff > 0 ? "electric" : "fuel";
  const a = v.electric_share / 100;
  const cost_blend = a * cost_elec + (1 - a) * cost_fuel;   // mirrors calc.cost_blend_per_100km
  const res = {
    scenario: { ...activeScenario(), fuel_consumption: v.fuel_consumption, power_consumption: v.power_consumption,
                electric_share: v.electric_share },
    location: { ...activeLocation(), price_chf_per_kwh: v.kwh_price },
    fuel_price: v.fuel_price,
    cost_fuel, cost_elec, break_even_fuel_price: break_even, break_even_kwh_price: break_even_kwh,
    cheaper, savings_per_100km: Math.abs(diff),
    electric_share: v.electric_share, cost_blend, blend_delta: cost_fuel - cost_blend,
  };
  renderAll(res);
}

const INPUT_IDS = ["in-fuel-price", "in-fuel-consumption", "in-power-consumption", "in-kwh-price"];
function invalidFields(v) {
  const bad = [];
  if (!(v.fuel_price >= 0)) bad.push("in-fuel-price");              // NaN fails every comparison
  if (!(v.fuel_consumption > 0)) bad.push("in-fuel-consumption");
  if (!(v.power_consumption > 0)) bad.push("in-power-consumption");
  if (!(v.kwh_price >= 0)) bad.push("in-kwh-price");                // 0 is fine: free charging exists
  return bad;
}
function renderInvalid() {
  lastResult = null;
  paintLocationChips(null);
  const card = $("verdict");
  card.classList.remove("is-electric", "is-fuel");
  card.innerHTML = `<div class="verdict__loading" role="status">${t("verdict_invalid")}</div>`;
  $("pricebar").innerHTML = "";
  $("share-row").innerHTML = "";
  if (chart) { chart.destroy(); chart = null; }
}

// One result, three views of it: the sentence, the one-axis bar, the 2D map —
// plus the charging chips, which show the same verdict for every location.
function renderAll(res) {
  lastResult = res;
  paintLocationChips(res);
  renderVerdict(res);
  renderPriceBar(res);
  renderChart(res);
  renderShareRow(res);
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

  const ce = money(res.cost_elec), cf = money(res.cost_fuel);
  const save = money(Math.abs(res.cost_fuel - res.cost_elec));
  const sentence = isTie ? t("sent_tie", { ce })
    : isElec ? t("sent_elec", { ce, cf, save })
             : t("sent_fuel", { ce, cf, save });

  // The money at the trip's electric share, once a year — what "per 100 km"
  // actually amounts to when not every km is electric. The break-even prices
  // above do not move with the share; only this line does. Dropped on a tie, at
  // 0 % and whenever it would round to CHF 0: nothing saved, nothing to say.
  const perYear = yearlyAt(res, res.electric_share);
  // At 100 % the mixed cost per 100 km is the electric cost the sentence just
  // named, so the line shrinks to the yearly amount; below 100 % it is news.
  const full = res.electric_share === 100;
  const yearly = isTie || Math.round(Math.abs(perYear)) < 1 ? ""
    : t(perYear > 0 ? (full ? "year_save" : "blend_save") : (full ? "year_more" : "blend_more"),
        { share: res.electric_share, blend: money(res.cost_blend), amount: money0(Math.abs(perYear)), km: fmtInt(ANNUAL_KM) });

  // Both tipping prices at once, each in its own unit — the electricity price
  // where it flips, and the fuel price where it flips.
  let threshold = "";
  if (!isTie && res.break_even_kwh_price != null && res.break_even_fuel_price != null) {
    const bek = `${money(res.break_even_kwh_price)}/kWh`;
    const bef = `${money(res.break_even_fuel_price)}/l`;
    threshold = isElec ? t("thr_elec", { bek, bef }) : t("thr_fuel", { bek, bef });
  }

  card.innerHTML = `
    <div class="verdict__row">
      <div class="verdict__icon">${icon}</div>
      <div class="verdict__main">
        <p class="verdict__title">${title}</p>
        <p class="verdict__sentence">${sentence}</p>
        ${yearly ? `<p class="verdict__year">${yearly}</p>` : ""}
        ${threshold ? `<p class="verdict__threshold">${threshold}</p>` : ""}
      </div>
    </div>`;
}

// The five chip shares side by side with their yearly saving (or extra cost) at
// ANNUAL_KM — every stop visible without clicking through the chips. Sits under
// the chart, inside its disclosure: linear in the share
// (calc.cost_blend_per_100km), so a chart of it would only draw a straight line
// between two numbers — a row of the five numbers says the same. Plain DOM, so
// unlike the canvas it renders fine while the disclosure is closed.
function renderShareRow(res) {
  const el = $("share-row");
  if (res.cheaper === "equal") { el.innerHTML = ""; return; }
  const cells = SHARE_STEPS.map((share) => {
    const v = yearlyAt(res, share);          // same figure as the verdict sentence
    const r = Math.round(Math.abs(v)) * Math.sign(v);
    const cls = r > 0 ? "is-saved" : r < 0 ? "is-more" : "is-zero";
    const amount = r === 0 ? `${curSign()} 0` : (r < 0 ? "−" : "") + money0(Math.abs(v));
    const key = r > 0 ? "share_row_saved" : r < 0 ? "share_row_more" : "share_row_zero";
    const on = share === res.electric_share ? " is-on" : "";
    return `<span class="sharerow__cell ${cls}${on}" title="${t(key, { share, amount })}">` +
      `<span class="sharerow__pct">${share} %</span><span class="sharerow__amt">${amount}</span></span>`;
  }).join("");
  el.innerHTML = `<span class="sharerow__label">${t("share_row", { km: fmtInt(ANNUAL_KM) })}</span>` +
    `<span class="sharerow__cells">${cells}</span>`;
}

// What the numbers rest on — stated once, as the footnote of the price bar right
// under the verdict (the verdict card itself carries no second copy).
function assumptionNote(res, withLocation) {
  const parts = [
    `⛽ ${money(res.fuel_price)}/l`,
    `${esc(dispName(res.scenario))}: ${fmtCons(res.scenario.fuel_consumption)} l/100km · ${fmtCons(res.scenario.power_consumption)} kWh/100km · ${res.electric_share} % ⚡`,
  ];
  if (withLocation) parts.push(`⚡ ${esc(dispName(res.location))}: ${money(res.location.price_chf_per_kwh)}/kWh`);
  return parts.join(t("note_sep"));
}

// --- One-axis price bar (the main picture) -----------------------------------
// It answers the question that is actually asked at the charger — "at the price
// I pay per kWh, is charging still cheaper?" — on a single scale: green up to
// the tipping price, amber beyond it, one marker for where you are. Same numbers
// as the 2D map below, but with no axes to decode, so it comes first.
function renderPriceBar(res) {
  const el = $("pricebar");
  const head = `<h2 class="pbar__title">${t("bar_title")}</h2>`;
  const bek = res.break_even_kwh_price;
  if (bek == null || !(bek > 0)) {
    el.innerHTML = `<div class="pbar">${head}<p class="pbar__empty">${t("bar_no_tip")}</p></div>`;
    return;
  }
  const cur = res.location.price_chf_per_kwh;
  // Anchor the scale on the tipping price (like the chart does on the sweetspot)
  // so it stays put while prices are nudged; widen only if the marker needs it.
  const max = Math.max(bek * 1.6, cur * 1.25, 0.1);
  const pct = (v) => Math.min(100, Math.max(0, (v / max) * 100));
  const tipP = pct(bek);
  const hereP = pct(cur);
  const side = res.cheaper === "equal" ? "is-tie" : res.cheaper === "electric" ? "is-elec" : "is-fuel";

  el.innerHTML = `
    <div class="pbar">
      ${head}
      <div class="pbar__row">
        <span class="pbar__lab pbar__lab--here ${side}" style="${anchorStyle(hereP)}">
          ${t("bar_here")} <b>${money(cur)}/kWh</b>
        </span>
      </div>
      <div class="pbar__track">
        <div class="pbar__bands">
          <div class="pbar__seg pbar__seg--elec" style="width:${tipP}%">
            ${segCap("⚡", t("region_elec"), tipP)}
          </div>
          <div class="pbar__seg pbar__seg--fuel" style="width:${100 - tipP}%">
            ${segCap("⛽", t("region_fuel"), 100 - tipP)}
          </div>
        </div>
        <div class="pbar__tip" style="left:${tipP}%"></div>
        <div class="pbar__here ${side}" style="left:${hereP}%"></div>
      </div>
      <div class="pbar__row">
        <span class="pbar__lab pbar__lab--tip" style="${anchorStyle(tipP)}">
          ${t("bar_tip")} <b>${money(bek)}/kWh</b>
        </span>
      </div>
      <div class="pbar__scale"><span>0.00</span><span>${max.toFixed(2)} ${curSign()}/kWh</span></div>
      <p class="pbar__note">${assumptionNote(res, true)}</p>
    </div>`;
}

// Caption inside a band — dropped when the band is too narrow to hold it. On a
// phone only the icon stays (see the 560px rules), so the side is never colour-only.
function segCap(icon, text, widthPct) {
  if (widthPct < 24) return "";
  return `<span class="pbar__cap"><i>${icon}</i><em>${text}</em></span>`;
}

// Keep a label inside the bar: centred over its mark, but flush left/right near
// the ends so it never hangs over the card edge.
function anchorStyle(p) {
  if (p <= 12) return "left:0;transform:none;text-align:left";
  if (p >= 88) return "left:auto;right:0;transform:none;text-align:right";
  return `left:${p}%;transform:translateX(-50%)`;
}

// --- Chart -------------------------------------------------------------------
// 2D tipping map — always the same view: x = fuel price (CHF/l), y = electricity
// price (CHF/kWh). The diagonal tipping line is where fuel and electric cost the
// same (fc·fuel_price = pc·kwh_price); below it charging wins, above it fuel does.
// A dot marks the current prices, so the side you are on is visible at a glance.
function renderChart(res) {
  // Closed disclosure = zero-sized canvas; Chart.js would size itself to nothing.
  // The toggle handler draws it as soon as it is opened.
  if (!$("chart-details").open) return;
  const fc = res.scenario.fuel_consumption;
  const pc = res.scenario.power_consumption;

  const cfg = {
    xUnit: `${curSign()}/l`, yUnit: `${curSign()}/kWh`, xTitle: t("axis_per_liter"), yTitle: t("axis_per_kwh"),
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

  // Chart.js bakes colours in at draw time, so they are read from the CSS tokens
  // on every render — that is what makes the chart follow the theme.
  const C = {
    text: cssVar("--text"), muted: cssVar("--muted"), grid: cssVar("--grid"),
    elec: cssVar("--elec"), fuel: cssVar("--fuel"), accent: cssVar("--accent"),
    sweet: cssVar("--sweet"), sweetSoft: cssVar("--sweet-soft"),
    bg: cssVar("--bg"), pointRing: cssVar("--point-ring"),
  };
  const belowFill = cssVar("--chart-fill-elec");   // below the line → electric cheaper
  const aboveFill = cssVar("--chart-fill-fuel");   // above the line → fuel cheaper

  const data = {
    datasets: [
      // Tipping line, filling down to the x-axis = the "below" region.
      { label: t("tipping_line"), data: beLine, borderColor: C.sweet, borderWidth: 3,
        fill: "start", backgroundColor: belowFill, pointRadius: 0, tension: 0, order: 2 },
      // Invisible top line, filling down to the tipping line = the "above" region.
      { label: "above", data: topLine, borderColor: "rgba(0,0,0,0)",
        fill: "-1", backgroundColor: aboveFill, pointRadius: 0, tension: 0, order: 3 },
    ],
  };

  // Labels keep off the break-even line. The line rises to the right, so the
  // free space is below a point that lies right of it (electric cheaper) and
  // above one that lies left of it. The sweetspot label takes the other side of
  // the dotted connector, diagonally away from the line — the two never meet.
  const hereBelow = res.cheaper === "electric" && cfg.yVal > yMax * 0.1;
  // How close the point sits to the line, in (estimated) pixels: when the two
  // nearly touch, a centred label would run into the line, so it steps aside.
  const plotW = Math.max(120, $("chart").clientWidth - 60);
  const gapPx = hasSweet ? Math.abs(cfg.xVal - beRule) / xMax * plotW : Infinity;
  const hereTxt = [`${cfg.xVal.toFixed(2)} ${cfg.xUnit}`, `${cfg.yVal.toFixed(2)} ${cfg.yUnit}`];
  let hereContent, hereX, hereY;
  if (hereBelow) {            // right of the line: one row underneath, pushed right if the line is near
    hereContent = hereTxt.join(" · ");
    hereX = cfg.xVal > xMax * 0.7 ? -62 : gapPx < 50 ? 78 : 0;
    hereY = 18;
  } else {                    // left of the line: two short rows above, pushed left if the line is near
    hereContent = hereTxt;
    hereX = gapPx < 50 ? -46 : 0;
    hereY = -26;
  }
  const pointColor = res.cheaper === "equal" ? C.accent
    : res.cheaper === "electric" ? C.elec : C.fuel;
  // No dashed drop-lines to the axes: the point carries its two prices as a label,
  // so the helper lines only added ink.
  const annotations = {
    here: { type: "point", xValue: cfg.xVal, yValue: cfg.yVal,
      backgroundColor: pointColor, borderColor: C.pointRing, borderWidth: 2, radius: 7 },
    hereLabel: { type: "label", xValue: cfg.xVal, yValue: cfg.yVal,
      content: hereContent,
      color: C.text, font: { size: 11, weight: "600" }, yAdjust: hereY, xAdjust: hereX,
      backgroundColor: "rgba(0,0,0,0)" },
    elecRegion: { type: "label",
      xValue: xMax * 0.72, yValue: yMax * 0.12,
      content: "⚡ " + t("region_elec"), color: C.elec,
      font: { size: 13, weight: "700" }, backgroundColor: "rgba(0,0,0,0)" },
    fuelRegion: { type: "label",
      xValue: xMax * 0.24, yValue: yMax * 0.86,
      content: "⛽ " + t("region_fuel"), color: C.fuel,
      font: { size: 13, weight: "700" }, backgroundColor: "rgba(0,0,0,0)" },
  };

  // Sweetspot marker: the point on the tipping line at the current y, with a dotted
  // connector from the current position so it reads as "slide across to the tipping point".
  if (hasSweet) {
    annotations.sweetConn = { type: "line", yMin: cfg.yVal, yMax: cfg.yVal,
      xMin: Math.min(cfg.xVal, beRule), xMax: Math.max(cfg.xVal, beRule),
      borderColor: C.sweetSoft, borderWidth: 1, borderDash: [3, 3] };
    annotations.sweet = { type: "point", xValue: beRule, yValue: cfg.yVal,
      backgroundColor: C.sweet, borderColor: C.bg, borderWidth: 2, radius: 6 };
    annotations.sweetLabel = { type: "label", xValue: beRule, yValue: cfg.yVal,
      content: [t("word_sweetspot"), `${beRule.toFixed(2)} ${cfg.xUnit}`],
      color: C.sweet, font: { size: 11, weight: "700" },
      xAdjust: hereBelow ? -40 : 48, yAdjust: hereBelow ? -24 : 28,
      backgroundColor: "rgba(0,0,0,0)" };
  }

  const options = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: "nearest", intersect: false, axis: "x" },
    scales: {
      x: { type: "linear", min: 0, max: xMax,
        title: { display: true, text: cfg.xTitle, color: C.muted },
        ticks: { color: C.muted, callback: (v) => v.toFixed(2) },
        grid: { color: C.grid } },
      y: { type: "linear", min: 0, max: yMax,
        title: { display: true, text: cfg.yTitle, color: C.muted },
        ticks: { color: C.muted, callback: (v) => v.toFixed(2) },
        grid: { color: C.grid } },
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
  const body = { fuel_consumption: s.fuel_consumption, power_consumption: s.power_consumption,
                 electric_share: s.electric_share, ...rowValues(tr) };
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
      fuel_consumption: 6.5, power_consumption: 21, electric_share: 100,
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
