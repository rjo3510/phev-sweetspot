"use strict";
// Theme before first paint. Loaded blocking in <head> — app.js runs at the end
// of the body, so deciding there would flash the dark palette on the way to a
// light one. Its own file (not an inline <script>) because the CSP is a strict
// script-src 'self'. Stored choice wins, otherwise the system setting; the same
// rule as setTheme() in app.js, which reads the result back.
(function () {
  try {
    var stored = localStorage.getItem("theme");
    document.documentElement.dataset.theme =
      stored === "light" || stored === "dark"
        ? stored
        : (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  } catch (e) {
    document.documentElement.dataset.theme = "dark";
  }
})();
