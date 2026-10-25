import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { createRequire } from "node:module";

globalThis.Color = class { constructor(hex) { this.hex = hex; } };
globalThis.Size = class { constructor(w, h) { this.width = w; this.height = h; } };
globalThis.Rect = class { constructor(x, y, w, h) { this.x = x; this.y = y; this.width = w; this.height = h; } };
globalThis.Point = class { constructor(x, y) { this.x = x; this.y = y; } };
globalThis.Font = {
  systemFont: (s) => ({ size: s, weight: "regular" }),
  boldSystemFont: (s) => ({ size: s, weight: "bold" }),
  semiboldSystemFont: (s) => ({ size: s, weight: "semibold" }),
  mediumSystemFont: (s) => ({ size: s, weight: "medium" }),
  regularSystemFont: (s) => ({ size: s, weight: "regular" })
};
globalThis.Path = class {
  constructor() { this.pts = []; }
  move(p) { this.pts.push(p); }
  addLine(p) { this.pts.push(p); }
};
globalThis.DrawContext = class {
  constructor() { this.texts = []; this.arcs = 0; }
  addPath() { this.arcs++; }
  setStrokeColor() {}
  setLineWidth() {}
  strokePath() {}
  setFillColor() {}
  fillEllipse() {}
  setTextAlignedCenter() {}
  setFont() {}
  setTextColor() {}
  drawTextInRect(t) { this.texts.push(t); }
  getImage() { return { texts: this.texts, arcs: this.arcs }; }
};
const makeStack = (texts, images) => ({
  layoutHorizontally() {},
  layoutVertically() {},
  centerAlignContent() {},
  setPadding() {},
  addSpacer() {},
  addText(t) { texts.push(t); return { centerAlignText() {} }; },
  addStack() { return makeStack(texts, images); },
  addImage(img) { images.push(img); return { centerAlignImage() {} }; }
});
globalThis.ListWidget = class {
  constructor() {
    this.texts = [];
    this.images = [];
    Object.assign(this, makeStack(this.texts, this.images));
  }
};
const require = createRequire(import.meta.url);
const { parseTelcelResponse, createWidget, loadCache, getCredentials, validateTelcelCredentials, requestTelcel } = require("../src/MiTelcelWidget.js");
const { fetchBaitData, parseBaitResponse, createWidget: createBaitWidget, loadCache: loadBaitCache, fetchServiceKey: fetchBaitServiceKey, CONFIG: baitConfig, getCredentials: getBaitCredentials, validateBaitCredentials, requestBait, requestText } = require("../src/MiBaitWidget.js");
const {
  fetchMovistarData,
  parseMovistarResponse,
  decryptMovistarContent,
  extractGuardKey,
  fetchGuardKey,
  createWidget: createMovistarWidget,
  loadCache: loadMovistarCache,
  validateMovistarCredentials,
  loginWithWebView,
  getSessionToken,
  getCredentials: getMovistarCredentials,
  requestMovistar
} = require("../src/MiMovistarWidget.js");
const { formatSummary, loadTelcelCache } = await import("../android/mitelcel_widget.mjs");
const { formatSummary: formatBaitSummary, loadBaitCache: loadBaitCacheAndroid } = await import("../android/mibait_widget.mjs");
const { formatSummary: formatMovistarSummary, loadMovistarCache: loadMovistarCacheAndroid } = await import("../android/mimovistar_widget.mjs");
const { formatSummary: formatATTSummary, loadATTCache: loadATTCacheAndroid } = await import("../android/miatt_widget.mjs");

const fixture = {
  blocks: {
    children: [
      { id: "text-plan-name", config: { value: "Telcel Libre 4" } },
      { id: "plan-details-row-template-col-2-web-0-0", config: { value: "28 de octubre" } },
      // Chart-only bucket with suffix 0-10-0 to verify numeric sort and KB chart fallback
      { id: "tabs-plans-v2-plan-name-0-10-0", config: { value: "Bono Chart KB" } },
      {
        id: "tabs-plans-v2-usage-chart-0-10-0",
        config: { data: [{ key: "used", value: 512 }, { key: "available", value: 512 }] }
      },
      // Out-of-order promo bucket with KB used, GB total, and the only cutoff days message
      { id: "tabs-plans-v2-plan-name-0-1-0", config: { value: "PROMO 50% DE DATOS 24 MDP" } },
      { id: "tabs-plans-v2-total-data-value-0-1-0", config: { value: "5" } },
      { id: "tabs-plans-v2-total-data-unit-0-1-0", config: { value: "GB" } },
      { id: "tabs-plans-v2-used-data-value-0-1-0", config: { value: "512" } },
      { id: "tabs-plans-v2-used-data-unit-0-1-0", config: { value: "KB" } },
      { id: "tabs-plans-v2-available-data-value-0-1-0", config: { value: "5" } },
      { id: "tabs-plans-v2-available-data-unit-0-1-0", config: { value: "GB" } },
      {
        id: "tabs-plans-v2-limited-cutoff-message-0-1-0",
        config: { segments: [{ text: "Faltan " }, { text: "9" }, { text: " días" }] }
      },
      // Empty bucket that should be ignored
      { id: "tabs-plans-v2-plan-name-0-2-0", config: { value: "Bolsa vacía" } },
      { id: "tabs-plans-v2-total-data-value-0-2-0", config: { value: "0" } },
      { id: "tabs-plans-v2-total-data-unit-0-2-0", config: { value: "MB" } },
      // Non-numeric plan-name node that should be ignored
      { id: "tabs-plans-v2-plan-name-header-info", config: { value: "Encabezado Info" } },
      // Base plan bucket
      { id: "tabs-plans-v2-plan-name-0-0-0", config: { value: "Datos de mi plan" } },
      { id: "tabs-plans-v2-total-data-value-0-0-0", config: { value: "10" } },
      { id: "tabs-plans-v2-total-data-unit-0-0-0", config: { value: "GB" } },
      { id: "tabs-plans-v2-used-data-value-0-0-0", config: { value: "9.5" } },
      { id: "tabs-plans-v2-used-data-unit-0-0-0", config: { value: "GB" } },
      { id: "tabs-plans-v2-available-data-value-0-0-0", config: { value: "474" } },
      { id: "tabs-plans-v2-available-data-unit-0-0-0", config: { value: "MB" } }
    ]
  }
};

// 1. Test Scriptable JS parser & Android summary
const errorScreen = { blocks: { children: [{ id: "alert-error", config: { value: "Mantenimiento" } }] } };
assert.throws(() => parseTelcelResponse(errorScreen), /sin bolsas de datos/);
const jsRes = parseTelcelResponse(fixture);
assert.equal(jsRes.planName, "Telcel Libre 4");
assert.equal(jsRes.cutoffDate, "28 de octubre");
assert.equal(jsRes.daysLeft, 9);
assert.equal(jsRes.promo, true);
assert.deepEqual(jsRes.buckets.map(b => b.id), ["0-0-0", "0-1-0", "0-10-0"]);
assert.equal(jsRes.totalMB, 15001);
assert.equal(jsRes.consumedMB, 9501); // 9500 MB + 0.5 MB + 0.5 MB
assert.equal(jsRes.availableMB, 5474.5);
assert(formatSummary(jsRes).includes("5.47 GB libres de 15.0 GB"));
assert(formatSummary({ ...jsRes, fromCache: true }).includes("☁️"));

const tmpTelcelCache = "/tmp/test_telcel_cache_android.json";
writeFileSync(tmpTelcelCache, JSON.stringify(jsRes));
try {
  const androidTelcelCached = loadTelcelCache(tmpTelcelCache);
  assert.equal(androidTelcelCached.fromCache, true);
  assert.equal(androidTelcelCached.planName, "Telcel Libre 4");
  writeFileSync(tmpTelcelCache, "[1, 2, 3]");
  assert.equal(loadTelcelCache(tmpTelcelCache), null);
} finally {
  try { unlinkSync(tmpTelcelCache); } catch (_) {}
}

const wMid = createWidget(jsRes);
assert(wMid.texts.includes("9 días"));
assert(wMid.texts.includes("Corte 28 oct"));
assert(wMid.texts.includes("● 9.50 GB (63%)"));
assert(wMid.texts.includes("● 608 MB/d"));
assert(wMid.texts.some(t => t.includes("Plan+Promo")));
assert.deepEqual(wMid.images[0].texts, ["5.47 GB", "libres de 15.0 GB"]);
assert.equal(wMid.images[0].arcs, 3); // track + red spent + green left

const wZero = createWidget({ ...jsRes, consumedMB: 0, availableMB: 15000, daysLeft: 1 });
assert(wZero.texts.includes("1 día"));
assert.equal(wZero.images[0].arcs, 2); // track + green left only

const wEmpty = createWidget({ ...jsRes, totalMB: 0, consumedMB: 0, availableMB: 0 });
assert.equal(wEmpty.images[0].arcs, 1); // track only when totalMB == 0

const wTelcelNull = createWidget(null);
assert(wTelcelNull.texts.includes("⚠️"));
assert(wTelcelNull.texts.some(t => t.includes("Abre Scriptable para revisar tu conexión o credenciales")));
assert.equal(wTelcelNull.url, "scriptable://");
globalThis.Script = { name: () => "Mi Telcel" };
assert.equal(createWidget(null).url, "scriptable:///run?scriptName=Mi%20Telcel");
delete globalThis.Script;


// Test parseTelcelResponse fallback for daysLeft and mixed-case units (Gb, Kb)
const telcelNoDaysLeft = parseTelcelResponse({
  blocks: {
    children: [
      { id: "tabs-plans-v2-container-0-0", children: [ { id: "tabs-plans-v2-card-0-0-0", type: "BLOCK" } ] },
      { id: "plan-details-row-template-col-2-0-0", config: { value: "15 de noviembre" } },
      { id: "text-plan-name", config: { value: "Telcel Libre" } },
      { id: "tabs-plans-v2-plan-name-0-0-0", config: { value: "Datos de mi plan" } },
      { id: "tabs-plans-v2-total-data-value-0-0-0", config: { value: "10" } },
      { id: "tabs-plans-v2-total-data-unit-0-0-0", config: { value: "Gb" } },
      { id: "tabs-plans-v2-used-data-value-0-0-0", config: { value: "9.5" } },
      { id: "tabs-plans-v2-used-data-unit-0-0-0", config: { value: "gb" } },
      { id: "tabs-plans-v2-available-data-value-0-0-0", config: { value: "512000" } },
      { id: "tabs-plans-v2-available-data-unit-0-0-0", config: { value: "Kb" } }
    ]
  }
});
assert.equal(telcelNoDaysLeft.daysLeft, 28);
assert.equal(telcelNoDaysLeft.totalMB, 10000);
assert.equal(telcelNoDaysLeft.consumedMB, 9500);
assert.equal(telcelNoDaysLeft.availableMB, 500);

// Test parseTelcelResponse prevents double counting with responsive web-* duplicate blocks
const telcelWithWebDuplicates = parseTelcelResponse({
  blocks: {
    children: [
      { id: "text-plan-name", config: { value: "Telcel Libre 4" } },
      { id: "plan-details-row-template-col-2-0-0", config: { value: "28 de octubre" } },
      // Mobile blocks
      { id: "tabs-plans-v2-plan-name-0-0-0", config: { value: "Datos de mi plan" } },
      { id: "tabs-plans-v2-total-data-value-0-0-0", config: { value: "10" } },
      { id: "tabs-plans-v2-total-data-unit-0-0-0", config: { value: "GB" } },
      { id: "tabs-plans-v2-used-data-value-0-0-0", config: { value: "10" } },
      { id: "tabs-plans-v2-used-data-unit-0-0-0", config: { value: "GB" } },
      { id: "tabs-plans-v2-available-data-value-0-0-0", config: { value: "0" } },
      { id: "tabs-plans-v2-available-data-unit-0-0-0", config: { value: "MB" } },
      { id: "tabs-plans-v2-plan-name-0-1-0", config: { value: "PROMO 50% DE DATOS 24 MDP" } },
      { id: "tabs-plans-v2-total-data-value-0-1-0", config: { value: "5" } },
      { id: "tabs-plans-v2-total-data-unit-0-1-0", config: { value: "GB" } },
      { id: "tabs-plans-v2-used-data-value-0-1-0", config: { value: "200" } },
      { id: "tabs-plans-v2-used-data-unit-0-1-0", config: { value: "MB" } },
      { id: "tabs-plans-v2-available-data-value-0-1-0", config: { value: "4800" } },
      { id: "tabs-plans-v2-available-data-unit-0-1-0", config: { value: "MB" } },
      // Web duplicate blocks (must be ignored when mobile blocks exist)
      { id: "tabs-plans-v2-plan-name-web-0-0-0", config: { value: "Datos de mi plan" } },
      { id: "tabs-plans-v2-total-data-value-web-0-0-0", config: { value: "10" } },
      { id: "tabs-plans-v2-total-data-unit-web-0-0-0", config: { value: "GB" } },
      { id: "tabs-plans-v2-used-data-value-web-0-0-0", config: { value: "10" } },
      { id: "tabs-plans-v2-used-data-unit-web-0-0-0", config: { value: "GB" } },
      { id: "tabs-plans-v2-available-data-value-web-0-0-0", config: { value: "0" } },
      { id: "tabs-plans-v2-available-data-unit-web-0-0-0", config: { value: "MB" } },
      { id: "tabs-plans-v2-plan-name-web-0-1-0", config: { value: "PROMO 50% DE DATOS 24 MDP" } },
      { id: "tabs-plans-v2-total-data-value-web-0-1-0", config: { value: "5" } },
      { id: "tabs-plans-v2-total-data-unit-web-0-1-0", config: { value: "GB" } },
      { id: "tabs-plans-v2-used-data-value-web-0-1-0", config: { value: "200" } },
      { id: "tabs-plans-v2-used-data-unit-web-0-1-0", config: { value: "MB" } },
      { id: "tabs-plans-v2-available-data-value-web-0-1-0", config: { value: "4800" } },
      { id: "tabs-plans-v2-available-data-unit-web-0-1-0", config: { value: "MB" } }
    ]
  }
});
assert.equal(telcelWithWebDuplicates.totalMB, 15000);
assert.equal(telcelWithWebDuplicates.availableMB, 4800);
assert.equal(telcelWithWebDuplicates.consumedMB, 10200);
assert.equal(telcelWithWebDuplicates.buckets.length, 2);

// Test parseTelcelResponse falls back to web-* blocks if mobile blocks are absent
const telcelWebOnly = parseTelcelResponse({
  blocks: {
    children: [
      { id: "text-plan-name", config: { value: "Telcel Libre" } },
      { id: "tabs-plans-v2-plan-name-web-0-0-0", config: { value: "Datos Web" } },
      { id: "tabs-plans-v2-total-data-value-web-0-0-0", config: { value: "10" } },
      { id: "tabs-plans-v2-total-data-unit-web-0-0-0", config: { value: "GB" } },
      { id: "tabs-plans-v2-available-data-value-web-0-0-0", config: { value: "6" } },
      { id: "tabs-plans-v2-available-data-unit-web-0-0-0", config: { value: "GB" } }
    ]
  }
});
assert.equal(telcelWebOnly.totalMB, 10000);
assert.equal(telcelWebOnly.availableMB, 6000);
assert.equal(telcelWebOnly.buckets.length, 1);

// 1b. Test Mi Bait parser & widget
const baitNow = new Date(2026, 9, 20, 10, 9); // Oct 20, 2026 10:09 local
const baitFixture = {
  success: true,
  data: [
    {
      category: "Data",
      type: "BestEffort",
      unlimited: false,
      resume: { total: 10240, unused: 6144, expire_date: "2026-11-01T23:59:59.000Z" }
    },
    {
      category: "Data",
      type: "Benefits",
      offers_detail: [
        { total: 5120, unused: 5120, expire_date: "2026-11-01T23:59:59.000Z" },
        { total: 2048, unused: 2048, expire_date: "2026-09-01T00:00:00.000Z" } // expired offer ignored
      ]
    },
    {
      category: "Data",
      type: "SocialMedia",
      unlimited: true,
      resume: { total: 5120, unused: 4800, expire_date: "2026-12-31T23:59:59.000Z" } // non-base bucket date ignored
    },
    {
      category: "Minutes",
      type: "National",
      resume: { total: 100, unused: 50, expire_date: "2026-12-15T23:59:59.000Z" } // voice date ignored
    }
  ]
};
assert.throws(() => parseBaitResponse({ success: false, message: "No se encontró" }), /No se encontró/);
const baitRes = parseBaitResponse(baitFixture, baitNow);
assert.equal(baitRes.planName, "Mi Bait");
assert.equal(baitRes.cutoffDate, "1 de noviembre");
assert.equal(baitRes.cutoffISO, "2026-11-01");
assert.equal(baitRes.daysLeft, 12);
assert.equal(baitRes.promo, true);
assert.equal(baitRes.totalMB, 15360);
assert.equal(baitRes.consumedMB, 4096);
assert.equal(baitRes.availableMB, 11264);
const wBait = createBaitWidget(baitRes);
assert(wBait.texts.includes("Mi Bait"));
assert(wBait.texts.includes("Vigencia 1 nov"));
assert(wBait.texts.includes("12 días"));
assert(wBait.texts.some(t => t.includes("Plan+Bono")));
assert.deepEqual(wBait.images[0].texts, ["11.00 GB", "libres de 15.0 GB"]);

// Verify null cutoffISO when no expire_date exists and loadCache daysLeft recalculation/clamping
const baitNoCutoff = parseBaitResponse({
  success: true,
  data: [{ category: "Data", type: "BestEffort", unlimited: false, resume: { total: 1024, unused: 512 } }]
}, baitNow);
assert.equal(baitNoCutoff.cutoffISO, null);
assert.equal(baitNoCutoff.cutoffDate, "");
assert.equal(baitNoCutoff.daysLeft, 0);

let currentCacheString = JSON.stringify(baitRes);
globalThis.FileManager = {
  local: () => ({
    documentsDirectory: () => "/tmp",
    joinPath: (a, b) => `${a}/${b}`,
    fileExists: () => true,
    readString: () => currentCacheString
  })
};
const cachedLater = loadBaitCache(new Date(2026, 9, 28, 8, 0)); // 4 days before Nov 1
assert.equal(cachedLater.fromCache, true);
assert.equal(cachedLater.daysLeft, 4);
const cachedExpired = loadBaitCache(new Date(2026, 10, 5, 8, 0)); // Past Nov 1 -> clamped to 0
assert.equal(cachedExpired.fromCache, true);
assert.equal(cachedExpired.daysLeft, 0);

// Test fetchBaitData network error propagation via Request mock
const originalRequest = globalThis.Request;
globalThis.Request = class {
  constructor(url) {
    this.url = url;
  }
  async loadJSON() {
    throw new Error("Simulated network error in Request.loadString");
  }
  async loadString() {
    if (this.url.includes(".js")) return 'xOrdService:"' + baitConfig.ordServiceKey + '"';
    if (this.url.includes("mibait.com/api")) throw new Error("Simulated network error in Request.loadString");
    return "<html><body><script src=\"main.123.js\"></script></body></html>";
  }

};

const originalConsoleWarnForRequest = console.warn;
try {
  console.warn = () => {}; // Suppress warning about dynamic key fetch if it happens
  await assert.rejects(
    async () => {
      await fetchBaitData({ phone: "5512345678" });
    },
    /Simulated network error in Request.loadString/,
    "fetchBaitData should propagate the network error from loadJSON"
  );
} finally {
  globalThis.Request = originalRequest;
  console.warn = originalConsoleWarnForRequest;
}

// Test Mi Bait dynamic service key fetch fallback
const originalFetch = globalThis.fetch;
let consoleWarnCalled = false;
const originalConsoleWarn = console.warn;

console.warn = (msg) => {
  if (msg.includes("No se pudo obtener la llave dinámicamente de mibait.com")) {
    consoleWarnCalled = true;
  } else {
    originalConsoleWarn(msg);
  }
};

globalThis.fetch = async (url) => {
  if (url === "https://mibait.com") {
    throw new Error("Simulated network failure");
  }
  return originalFetch(url);
};

// Temporarily clear environment variable if it exists to test the fetch/fallback path
const originalEnvKey = process.env.BAIT_SERVICE_KEY;
delete process.env.BAIT_SERVICE_KEY;

try {
  const serviceKey = await fetchBaitServiceKey();
  assert.equal(serviceKey, baitConfig.ordServiceKey, "Should fallback to hardcoded ordServiceKey on fetch failure");
  assert.equal(consoleWarnCalled, true, "Should log a warning when fetch fails");
} finally {
  globalThis.fetch = originalFetch;
  console.warn = originalConsoleWarn;
  if (originalEnvKey !== undefined) {
    process.env.BAIT_SERVICE_KEY = originalEnvKey;
  }
}

// Test requestTelcel error handling and edge cases in Node (fetch) environment
{
  const origFetch = globalThis.fetch;
  const origRequest = globalThis.Request;
  globalThis.Request = undefined;

  try {
    // 1. Test fetch error (parseJson = true)
    globalThis.fetch = async () => ({ ok: false, status: 500 });
    await assert.rejects(
      () => requestTelcel("https://test.com", "GET", {}, null, true),
      /Error en la solicitud: código de estado 500\. Por favor, inténtalo más tarde\./
    );

    // 2. Test fetch error (parseJson = false)
    globalThis.fetch = async () => ({ ok: false, status: 404 });
    await assert.rejects(
      () => requestTelcel("https://test.com", "GET", {}, null, false),
      /Error en la solicitud: código de estado 404\. Por favor, inténtalo más tarde\./
    );

    // 3. Test exception thrown by fetch (network error)
    globalThis.fetch = async () => { throw new Error("Simulated network failure in fetch"); };
    await assert.rejects(
      () => requestTelcel("https://test.com", "GET", {}, null, true),
      /Simulated network failure in fetch/
    );

    // 4. Test successful response (parseJson = true)
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ success: true }) });
    let res = await requestTelcel("https://test.com", "GET", {}, null, true);
    assert.deepEqual(res, { success: true });

    // 5. Test successful response (parseJson = false)
    globalThis.fetch = async () => ({ ok: true, text: async () => "rawtext" });
    res = await requestTelcel("https://test.com", "GET", {}, null, false);
    assert.equal(res, "rawtext");
  } finally {
    globalThis.fetch = origFetch;
    if (origRequest !== undefined) {
      globalThis.Request = origRequest;
    } else {
      delete globalThis.Request;
    }
  }
}

// Test requestTelcel error handling and edge cases in Scriptable (Request) environment
{
  const origRequest = globalThis.Request;
  let mockStatusCode = 200, mockString = "", mockData = {}, mockError = null;
  globalThis.Request = class {
    constructor(url) {
      this.url = url;
      this.response = { statusCode: mockStatusCode };
    }
    async loadString() {
      if (mockError) throw mockError;
      return mockString;
    }
    async load() {
      if (mockError) throw mockError;
      return mockData;
    }
  };

  try {
    // 1. Test loadString error (parseJson = true)
    mockStatusCode = 404;
    await assert.rejects(
      () => requestTelcel("https://test.com", "GET", {}, null, true),
      /Error en la solicitud: código de estado 404\. Por favor, inténtalo más tarde\./
    );

    // 2. Test load error (parseJson = false)
    mockStatusCode = 500;
    await assert.rejects(
      () => requestTelcel("https://test.com", "GET", {}, null, false),
      /Error en la solicitud: código de estado 500\. Por favor, inténtalo más tarde\./
    );

    // 3. Test exception thrown by Request (network error)
    mockError = new Error("Simulated network failure in Request");
    await assert.rejects(
      () => requestTelcel("https://test.com", "GET", {}, null, true),
      /Simulated network failure in Request/
    );
    mockError = null;

    // 4. Test successful response (parseJson = true)
    mockStatusCode = 200;
    mockString = '{"success":true}';
    let res = await requestTelcel("https://test.com", "GET", {}, null, true);
    assert.deepEqual(res, { success: true });

    // 5. Test successful response (parseJson = false) returning Data object in Scriptable
    const mockDataObj = { bytes: [114, 97, 119] };
    mockData = mockDataObj;
    res = await requestTelcel("https://test.com", "GET", {}, null, false);
    assert.equal(res, mockDataObj);
  } finally {
    if (origRequest !== undefined) {
      globalThis.Request = origRequest;
    } else {
      delete globalThis.Request;
    }
  }
}

// 1c. Test Mi Telcel loadCache failure scenarios
// Mock FileManager.local() to throw an exception
const originalFileManager = globalThis.FileManager;
globalThis.FileManager = {
  local: () => {
    throw new Error("Simulated FileManager exception");
  }
};
assert.equal(loadCache(), null);


// Mock FileManager.local() such that getCachePath throws
globalThis.FileManager = {
  local: () => ({
    documentsDirectory: () => { throw new Error("Simulated documentsDirectory exception"); },
    joinPath: (a, b) => `${a}/${b}`,
    fileExists: () => true,
    readString: () => "{}"
  })
};
assert.equal(loadCache(), null);

// Mock FileManager.local() to return invalid JSON
globalThis.FileManager = {
  local: () => ({
    documentsDirectory: () => "/tmp",
    joinPath: (a, b) => `${a}/${b}`,
    fileExists: () => true,
    readString: () => "{ invalid json ]"
  })
};
assert.equal(loadCache(), null);

// Mock FileManager.local() to have fileExists return false
globalThis.FileManager = {
  local: () => ({
    documentsDirectory: () => "/tmp",
    joinPath: (a, b) => `${a}/${b}`,
    fileExists: () => false,
    readString: () => { throw new Error("Should not be called"); }
  })
};
assert.equal(loadCache(), null);

// Mock FileManager.local() to return empty string (JSON.parse will throw)
globalThis.FileManager = {
  local: () => ({
    documentsDirectory: () => "/tmp",
    joinPath: (a, b) => `${a}/${b}`,
    fileExists: () => true,
    readString: () => { throw new Error("Simulated readString exception"); }
  })
};
assert.equal(loadCache(), null);

// Mock FileManager.local() to return "null" (valid JSON, but setting fromCache on null throws)
globalThis.FileManager = {
  local: () => ({
    documentsDirectory: () => "/tmp",
    joinPath: (a, b) => `${a}/${b}`,
    fileExists: () => true,
    readString: () => "null"
  })
};
assert.equal(loadCache(), null);

// Mock FileManager.local() to return primitive number (valid JSON, but setting fromCache silently succeeds in non-strict mode without modifying the primitive type - loadCache should handle this and return null)
globalThis.FileManager = {
  local: () => ({
    documentsDirectory: () => "/tmp",
    joinPath: (a, b) => `${a}/${b}`,
    fileExists: () => true,
    readString: () => "42"
  })
};
assert.equal(loadCache(), null);


// Mock FileManager.local() to return JSON array (typeof [] === "object"; must be rejected)
globalThis.FileManager = {
  local: () => ({
    documentsDirectory: () => "/tmp",
    joinPath: (a, b) => `${a}/${b}`,
    fileExists: () => true,
    readString: () => "[1, 2, 3]"
  })
};
assert.equal(loadCache(), null);

// Mock FileManager.local() to return valid JSON object (Happy path cache hit)
globalThis.FileManager = {
  local: () => ({
    documentsDirectory: () => "/tmp",
    joinPath: (a, b) => `${a}/${b}`,
    fileExists: () => true,
    readString: () => '{"cutoffISO": "2026-10-28", "totalMB": 100}'
  })
};
const happyCache = loadCache();
assert.equal(happyCache.totalMB, 100);
assert.equal(happyCache.cutoffISO, "2026-10-28");
assert.equal(happyCache.fromCache, true);

// Restore FileManager mock
globalThis.FileManager = originalFileManager;

// Standard 2-bucket Fair-Use (BestEffort + Throttling) unlimited plan with expired cutoff
const baitUnlimited = parseBaitResponse({
  success: true,
  data: [
    { category: "Data", type: "BestEffort", unlimited: true, resume: { total: 10240, unused: 0, expire_date: "2026-10-15T23:59:59.000Z" } },
    { category: "Data", type: "Throttling", unlimited: true, resume: { total: 10240, unused: 5120, expire_date: "2026-10-15T23:59:59.000Z" } }
  ]
}, baitNow);
assert.equal(baitUnlimited.promo, false);
assert.equal(baitUnlimited.planName, "Bait Ilimitado");
assert.equal(baitUnlimited.daysLeft, 0);
const wBaitUnl = createBaitWidget(baitUnlimited);
assert(wBaitUnl.texts.some(t => t.startsWith("Bait Ilimitado • ⏱")));

const wBaitNull = createBaitWidget(null);
assert(wBaitNull.texts.includes("⚠️"));
assert(wBaitNull.texts.some(t => t.includes("Abre Scriptable para revisar tu conexión o número")));
assert.equal(wBaitNull.url, "scriptable://");
globalThis.Script = { name: () => "Mi Bait" };
assert.equal(createBaitWidget(null).url, "scriptable:///run?scriptName=Mi%20Bait");
delete globalThis.Script;

assert(formatBaitSummary(baitUnlimited).includes("5.00 GB libres de 20.0 GB"));
assert(formatBaitSummary({ ...baitUnlimited, fromCache: true }).includes("☁️"));

const tmpBaitCache = "/tmp/test_bait_cache_android.json";
writeFileSync(tmpBaitCache, JSON.stringify({ ...baitUnlimited, cutoffISO: "2026-10-28" }));
try {
  const androidBaitCached = loadBaitCacheAndroid(tmpBaitCache, new Date(2026, 9, 21));
  assert.equal(androidBaitCached.fromCache, true);
  assert.equal(androidBaitCached.daysLeft, 7);
  writeFileSync(tmpBaitCache, "[1, 2, 3]");
  assert.equal(loadBaitCacheAndroid(tmpBaitCache), null);
} finally {
  try { unlinkSync(tmpBaitCache); } catch (_) {}
}

// 1d. Test Mi Movistar parser, AES-256-GCM decryptor & widget
const movNow = new Date(2026, 9, 21, 10, 0); // Oct 21, 2026 10:00 local
const movFixture = {
  offering: "Movistar Libre",
  userType: 2,
  bolton: [
    {
      name: "Navegación",
      vigencia: "28/10/2026",
      consumption: 65,
      consumptionLabel: "Llevas 6.50 GB de 10.00 GB",
      totalBenefit: "10.00 GB"
    },
    {
      name: "Bono Datos Extra",
      vigencia: "28/10/2026",
      consumption: 50,
      consumptionLabel: "Llevas 1.00 GB de 2.00 GB",
      totalBenefit: "2.00 GB"
    },
    {
      name: "Redes Sociales",
      vigencia: "28/10/2026",
      consumption: 0,
      consumptionLabel: "Ilimitado",
      totalBenefit: "Ilimitado"
    },
    {
      name: "Minutos",
      totalBenefit: "Ilimitado"
    }
  ],
  saldos: {
    totalBalance: "0.00",
    giftBalance: "0.00",
    topupsBalanceExpiration: "28/10/2026"
  }
};

// Test AES-256-GCM decryption with static guardKey
const keyBytes = Uint8Array.from("03818954072261267933921453028068", c => c.charCodeAt(0));
const iv = new Uint8Array(12);
iv.fill(42);
const cryptoKey = await globalThis.crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt"]);
const encBuf = await globalThis.crypto.subtle.encrypt(
  { name: "AES-GCM", iv, tagLength: 128 },
  cryptoKey,
  new TextEncoder().encode(JSON.stringify(movFixture))
);
const toB64Url = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const cipherPayload = `${toB64Url(encBuf)}:${toB64Url(iv)}`;

// Hermetic Keychain + fetch mocks: no live requests to mi.movistar.com.mx
const staticKey = "03818954072261267933921453028068";
const rotatedKey = "88888888888888888888888888888888";
const keychainStore = new Map([["MOVISTAR_GUARD_KEY", staticKey]]);
let pageGuardKey = staticKey;
let datosResponse = {};
const fetchCalls = [];
const origFetch = globalThis.fetch;
globalThis.Keychain = {
  contains: (k) => keychainStore.has(k),
  get: (k) => keychainStore.get(k),
  set: (k, v) => keychainStore.set(k, v)
};
globalThis.fetch = async (url, opts) => {
  fetchCalls.push({ url, opts });
  if (url.endsWith("/login")) {
    if (!pageGuardKey) throw new Error("offline");
    return { text: async () => `<script>const guardString = "${Buffer.from(pageGuardKey).toString("base64")}";</script>` };
  }
  if (url.endsWith("/consumptions-controller/datos-iniciales")) return { json: async () => datosResponse };
  throw new Error(`Unexpected fetch ${url}`);
};
try {
  // Cached key decrypts without touching the network; malformed payload fails before key lookup
  assert.deepEqual(JSON.parse(await decryptMovistarContent(cipherPayload)), movFixture);
  await assert.rejects(async () => decryptMovistarContent("invalid_format"), /inválido/);
  assert.equal(fetchCalls.length, 0);

  // Test dynamic guardKey extraction and resolution
  assert.equal(
    extractGuardKey("<script>\nconst guardString = 'MDM4MTg5NTQwNzIyNjEyNjc5MzM5MjE0NTMwMjgwNjg=';\n</script>"),
    staticKey
  );
  assert.equal(extractGuardKey("<html>sin llave</html>"), null);
  assert.deepEqual(JSON.parse(await decryptMovistarContent(cipherPayload, staticKey)), movFixture);

  // Test automatic key rotation self-healing: stale cached key -> decrypt fails -> /login -> retry
  const rotatedCryptoKey = await globalThis.crypto.subtle.importKey("raw", Buffer.from(rotatedKey), { name: "AES-GCM" }, false, ["encrypt"]);
  const rotatedEnc = await globalThis.crypto.subtle.encrypt({ name: "AES-GCM", iv, tagLength: 128 }, rotatedCryptoKey, new TextEncoder().encode(JSON.stringify(movFixture)));
  const rotatedPayload = `${toB64Url(rotatedEnc)}:${toB64Url(iv)}`;
  pageGuardKey = rotatedKey;
  assert.deepEqual(JSON.parse(await decryptMovistarContent(rotatedPayload)), movFixture);
  assert.equal(fetchCalls.length, 1);
  assert.equal(keychainStore.get("MOVISTAR_GUARD_KEY"), rotatedKey);

  // fetchGuardKey falls back to the static key when /login is unreachable
  pageGuardKey = null;
  assert.equal(await fetchGuardKey(), staticKey);

  // fetchMovistarData sends raw p_id (no Bearer), decrypts and parses; invalid session rejects
  datosResponse = { content: rotatedPayload };
  const movFetched = await fetchMovistarData({ pId: "test-pid" });
  assert.equal(movFetched.totalMB, 12288);
  assert.equal(fetchCalls.at(-1).opts.headers.Authorization, "test-pid");
  datosResponse = { response: "401" };
  await assert.rejects(() => fetchMovistarData({ pId: "test-pid" }), /expirada/);
} finally {
  globalThis.fetch = origFetch;
  delete globalThis.Keychain;
}

// Test parser
assert.throws(() => parseMovistarResponse({ bolton: [] }), /Sin bolsas de datos/);
assert.throws(() => parseMovistarResponse({ bolton: [{ name: "Redes Sociales" }] }), /Sin bolsas de navegación/);
assert.throws(() => parseMovistarResponse({ bolton: [{ name: "Redes Sociales Ilimitadas", consumptionLabel: "Ilimitado" }] }), /Sin bolsas de navegación/);

const movRes = parseMovistarResponse(movFixture, movNow);
assert.equal(movRes.planName, "Movistar Libre");
assert.equal(movRes.cutoffDate, "28 de octubre");
assert.equal(movRes.cutoffISO, "2026-10-28");
assert.equal(movRes.daysLeft, 7);
assert.equal(movRes.promo, true);
assert.equal(movRes.totalMB, 12288);
assert.equal(movRes.consumedMB, 7680);
assert.equal(movRes.availableMB, 4608);

const wMov = createMovistarWidget(movRes);
assert(wMov.texts.includes("Mi Movistar"));
assert(wMov.texts.includes("Vigencia 28 oct"));
assert(wMov.texts.includes("7 días"));
assert(wMov.texts.includes("● 7.50 GB (63%)"));
assert(wMov.texts.some(t => t.includes("Plan+Bono")));
assert.deepEqual(wMov.images[0].texts, ["4.50 GB", "libres de 12.0 GB"]);

// Test cache loading for Movistar
currentCacheString = JSON.stringify(movRes);
const movCached = loadMovistarCache(new Date(2026, 9, 25, 10, 0)); // 3 days left
assert.equal(movCached.fromCache, true);
assert.equal(movCached.daysLeft, 3);

// Test single-bucket unlimited Movistar plan
const movUnlimited = parseMovistarResponse({
  offering: "Movistar Ilimitado",
  bolton: [
    { name: "Navegación", consumptionLabel: "Ilimitado", totalBenefit: "Ilimitado", vigencia: "28/10/2026" }
  ]
}, movNow);
assert.equal(movUnlimited.planName, "Movistar Ilimitado");
assert.equal(movUnlimited.promo, false);
assert.equal(movUnlimited.totalMB, 0);
assert.equal(movUnlimited.daysLeft, 7);
const wMovUnl = createMovistarWidget(movUnlimited);
assert.deepEqual(wMovUnl.images[0].texts, ["Ilimitado", "datos libres"]);
assert(wMovUnl.texts.includes("● Ilimitado"));
assert(wMovUnl.texts.includes("● Datos Ilimitado"));

const wMovNull = createMovistarWidget(null);
assert(wMovNull.texts.includes("⚠️"));
assert(wMovNull.texts.some(t => t.includes("Abre Scriptable para iniciar sesión de nuevo")));
assert.equal(wMovNull.url, "scriptable://");
globalThis.Script = { name: () => "Mi Movistar" };
assert.equal(createMovistarWidget(null).url, "scriptable:///run?scriptName=Mi%20Movistar");
delete globalThis.Script;

// Test epoch timestamp fallback in saldos.topupsBalanceExpirationDate
const movEpoch = parseMovistarResponse({
  offering: "Movistar Prepago",
  bolton: [
    { name: "Navegación", consumptionLabel: "Llevas 1.00 GB de 2.00 GB" }
  ],
  saldos: {
    topupsBalanceExpirationDate: new Date(2026, 9, 28, 23, 59, 59).getTime()
  }
}, movNow);
assert.equal(movEpoch.daysLeft, 7);
assert.equal(movEpoch.cutoffISO, "2026-10-28");

assert(formatMovistarSummary(movEpoch).includes("1.00 GB libres de 2.0 GB"));
assert(formatMovistarSummary({ ...movEpoch, fromCache: true }).includes("☁️"));

const tmpMovCache = "/tmp/test_movistar_cache_android.json";
writeFileSync(tmpMovCache, JSON.stringify(movEpoch));
try {
  const androidMovCached = loadMovistarCacheAndroid(tmpMovCache, new Date(2026, 9, 21));
  assert.equal(androidMovCached.fromCache, true);
  assert.equal(androidMovCached.daysLeft, 7);
  writeFileSync(tmpMovCache, "[1, 2, 3]");
  assert.equal(loadMovistarCacheAndroid(tmpMovCache), null);
} finally {
  try { unlinkSync(tmpMovCache); } catch (_) {}
}

// 1e. Test ResetearPassword: per-carrier, "Todos" (index 4) and Cancel (-1)
const resetSource = readFileSync("src/ResetearPassword.js", "utf8");
const AsyncFunction = (async () => {}).constructor;
const runReset = async (choice) => {
  const store = new Map(["TELCEL_PASS", "TELCEL_PHONE", "BAIT_PHONE", "MOVISTAR_PID", "MOVISTAR_GUARD_KEY", "ATT_PASS", "ATT_PHONE"].map(k => [k, "x"]));
  let alerts = 0;
  const Alert = class {
    addAction() {} addDestructiveAction() {} addCancelAction() {}
    async presentAlert() { return alerts++ === 0 ? choice : 0; }
  };
  const Keychain = { contains: (k) => store.has(k), remove: (k) => store.delete(k) };
  await new AsyncFunction("Alert", "Keychain", "Script", resetSource)(Alert, Keychain, { complete() {} });
  return [...store.keys()];
};
assert.deepEqual(await runReset(0), ["BAIT_PHONE", "MOVISTAR_PID", "MOVISTAR_GUARD_KEY", "ATT_PASS", "ATT_PHONE"]);
assert.deepEqual(await runReset(1), ["TELCEL_PASS", "TELCEL_PHONE", "MOVISTAR_PID", "MOVISTAR_GUARD_KEY", "ATT_PASS", "ATT_PHONE"]);
assert.deepEqual(await runReset(2), ["TELCEL_PASS", "TELCEL_PHONE", "BAIT_PHONE", "ATT_PASS", "ATT_PHONE"]);
assert.deepEqual(await runReset(3), ["TELCEL_PASS", "TELCEL_PHONE", "BAIT_PHONE", "MOVISTAR_PID", "MOVISTAR_GUARD_KEY"]);
assert.deepEqual(await runReset(4), []);
assert.equal((await runReset(-1)).length, 7);


// 3. Test getCredentials in MiTelcelWidget
const runGetCredentialsTest = async () => {
  // Store original globals
  const origKeychain = globalThis.Keychain;
  const origConfig = globalThis.config;
  const origAlert = globalThis.Alert;

  try {
    let alertTitle, alertMessage;
    let alertActionResponses = [];
    let textFieldValuesList = [];
    let currentFields = [];

    globalThis.Alert = class {
      constructor() {
        this.fields = [];
        this.secureFields = [];
        this.actions = [];
      }
      set title(t) { alertTitle = t; }
      get title() { return alertTitle; }
      set message(m) { alertMessage = m; }
      get message() { return alertMessage; }
      addTextField(placeholder, initialValue) {
        const field = { placeholder, initialValue, setPhonePadKeyboard: () => {} };
        this.fields.push(field);
        return field;
      }
      addSecureTextField(placeholder, initialValue) {
        const field = { placeholder, initialValue };
        this.secureFields.push(field);
        return field;
      }
      addAction(a) { this.actions.push(a); }
      addCancelAction(a) { this.actions.push(a); }
      async presentAlert() {
        currentFields = textFieldValuesList.length > 0 ? textFieldValuesList.shift() : [];
        return alertActionResponses.length > 0 ? alertActionResponses.shift() : 1;
      }
      textFieldValue(idx) { return currentFields[idx] ?? ""; }
    };

    let keychainStore = new Map();
    globalThis.Keychain = {
      contains: (k) => keychainStore.has(k),
      get: (k) => keychainStore.get(k),
      set: (k, v) => keychainStore.set(k, v)
    };

    const mockTelcelValidator = async (phone, pass) => pass.startsWith("test_placeholder_pw") || pass === "valid_pw";

    // Case 1: valid credentials in keychain, runsInWidget=true
    globalThis.config = { runsInWidget: true };
    keychainStore.set("TELCEL_PHONE", "5512345679");
    keychainStore.set("TELCEL_PASS", "dummy_password");
    let creds = await getCredentials(mockTelcelValidator);
    assert.equal(creds.phone, "5512345679");
    assert.equal(creds.password, "dummy_password");

    // Case 2: valid credentials, runsInWidget=false (should skip alert)
    globalThis.config = { runsInWidget: false };
    creds = await getCredentials(mockTelcelValidator);
    assert.equal(creds.phone, "5512345679");
    assert.equal(creds.password, "dummy_password");

    // Case 3: invalid credentials in keychain, runsInWidget=true (skip alert)
    globalThis.config = { runsInWidget: true };
    keychainStore.set("TELCEL_PHONE", "55123");
    keychainStore.set("TELCEL_PASS", "");
    creds = await getCredentials(mockTelcelValidator);
    assert.equal(creds.phone, "55123");
    assert.equal(creds.password, "");

    // Case 4: invalid credentials, runsInWidget=false, cancel alert
    globalThis.config = { runsInWidget: false };
    alertActionResponses = [1]; // 1 means Cancel
    keychainStore.clear(); // Ensure we use empty config or fallback
    creds = await getCredentials(mockTelcelValidator);
    assert.equal(creds.phone, ""); // it falls back to CONFIG.phone which is ""
    assert.equal(creds.password, "");

    // Case 5: invalid credentials, runsInWidget=false, save valid inputs
    globalThis.config = { runsInWidget: false };
    alertActionResponses = [0]; // 0 means Save
    textFieldValuesList = [["+52 55 1234-5679", "test_placeholder_pw"]];
    keychainStore.clear();
    creds = await getCredentials(mockTelcelValidator);
    assert.equal(creds.phone, "5512345679"); // stripped formatting
    assert.equal(creds.password, "test_placeholder_pw");
    assert.equal(keychainStore.get("TELCEL_PHONE"), "5512345679");
    assert.equal(keychainStore.get("TELCEL_PASS"), "test_placeholder_pw");

    // Case 6: valid inputs containing non-numeric, save valid
    alertActionResponses = [0];
    textFieldValuesList = [["55abc12345679x", "test_placeholder_pw2"]];
    keychainStore.clear();
    creds = await getCredentials(mockTelcelValidator);
    assert.equal(creds.phone, "5512345679"); // strips abc and x
    assert.equal(creds.password, "test_placeholder_pw2");
    assert.equal(keychainStore.get("TELCEL_PHONE"), "5512345679");
    assert.equal(keychainStore.get("TELCEL_PASS"), "test_placeholder_pw2");

    // Case 7: invalid inputs (short phone), prompts "Credenciales incorrectas", then cancel
    alertActionResponses = [0, 1];
    textFieldValuesList = [["12345", "test_placeholder_pw"], ["12345", "test_placeholder_pw"]];
    keychainStore.clear();
    creds = await getCredentials(mockTelcelValidator);
    assert.equal(alertTitle, "Credenciales incorrectas");
    assert.equal(keychainStore.has("TELCEL_PHONE"), false);

    // Case 7b: invalid inputs (rejected phone 5512345678), prompts "Credenciales incorrectas", then cancel
    alertActionResponses = [0, 1];
    textFieldValuesList = [["5512345678", "test_placeholder_pw"], ["5512345678", "test_placeholder_pw"]];
    keychainStore.clear();
    creds = await getCredentials(mockTelcelValidator);
    assert.equal(alertTitle, "Credenciales incorrectas");
    assert.equal(keychainStore.has("TELCEL_PHONE"), false);

    // Case 8: invalid inputs (empty pass), prompts "Credenciales incorrectas", then cancel
    alertActionResponses = [0, 1];
    textFieldValuesList = [["5512345678", ""], ["5512345678", ""]];
    keychainStore.clear();
    creds = await getCredentials(mockTelcelValidator);
    assert.equal(alertTitle, "Credenciales incorrectas");
    assert.equal(keychainStore.has("TELCEL_PASS"), false);

    // Case 9: Incorrect credentials rejected by validator, prompts "Credenciales incorrectas", then valid
    alertActionResponses = [0, 0];
    textFieldValuesList = [["5512345679", "wrong_pw"], ["5512345679", "valid_pw"]];
    keychainStore.clear();
    creds = await getCredentials(mockTelcelValidator);
    assert.equal(creds.phone, "5512345679");
    assert.equal(creds.password, "valid_pw");
    assert.equal(keychainStore.get("TELCEL_PHONE"), "5512345679");
    assert.equal(keychainStore.get("TELCEL_PASS"), "valid_pw");

    // Case 10: Device offline, validator throws, prompts "Sin conexión a internet" and exits
    alertActionResponses = [0, 0];
    textFieldValuesList = [["5512345679", "some_pw"]];
    keychainStore.clear();
    const offlineValidator = async () => { throw new Error("The Internet connection appears to be offline."); };
    creds = await getCredentials(offlineValidator);
    assert.equal(alertTitle, "Sin conexión a internet");
    assert.equal(keychainStore.has("TELCEL_PHONE"), false);

    console.log("✅ getCredentials tests passed!");

  } finally {
    globalThis.Keychain = origKeychain;
    globalThis.config = origConfig;
    globalThis.Alert = origAlert;
  }
};
await runGetCredentialsTest();



// 1f. Test Bait getCredentials
const testBaitCredentials = async () => {
  const origKeychain = globalThis.Keychain;
  const origConfig = globalThis.config;
  const origAlert = globalThis.Alert;
  const origBaitPhone = baitConfig.phone;

  try {
    // Scenario 1: Keychain Happy Path
    globalThis.Keychain = { contains: (k) => k === "BAIT_PHONE" };
    globalThis.Keychain.get = (k) => k === "BAIT_PHONE" ? "5511223344" : null;
    globalThis.config = { runsInWidget: true };
    let creds = await getBaitCredentials();
    assert.equal(creds.phone, "5511223344");

    // Scenario 2: Number Normalization from CONFIG
    globalThis.Keychain.contains = () => false;
    baitConfig.phone = "+52 (55) 1234-5678";
    creds = await getBaitCredentials();
    assert.equal(creds.phone, "5512345678");

    // Scenario 3: Widget Mode Bypass
    baitConfig.phone = "123";
    globalThis.config = { runsInWidget: true };
    creds = await getBaitCredentials();
    assert.equal(creds.phone, "123");

    // Scenario 4 & 5 & 6: Interactive Mode
    globalThis.config = { runsInWidget: false };
    baitConfig.phone = "invalid";

    let alertTitle = "";
    let alertActionResponses = [];
    let textFieldValuesList = [];
    let currentFields = [];
    let savedKeychain = {};

    globalThis.Alert = class {
      constructor() { this.textFields = []; }
      set title(t) { alertTitle = t; }
      get title() { return alertTitle; }
      addTextField(t, v) {
        const field = { t, v, setPhonePadKeyboard: () => {} };
        this.textFields.push(field);
        return field;
      }
      addAction() {}
      addCancelAction() {}
      async presentAlert() {
        currentFields = textFieldValuesList.length > 0 ? textFieldValuesList.shift() : [];
        return alertActionResponses.length > 0 ? alertActionResponses.shift() : 1;
      }
      textFieldValue(idx = 0) { return currentFields[idx] ?? ""; }
    };

    globalThis.Keychain.set = (k, v) => { savedKeychain[k] = v; };

    const mockBaitValidator = async (phone) => phone === "5599887766";

    // Scenario 4: Interactive Save
    alertActionResponses = [0]; // Return index of first action (Guardar)
    textFieldValuesList = [["+52 (55) 9988-7766"]];
    savedKeychain = {};
    creds = await getBaitCredentials(mockBaitValidator);
    assert.equal(creds.phone, "5599887766");
    assert.equal(savedKeychain["BAIT_PHONE"], "5599887766");

    // Scenario 5: Interactive Cancel
    alertActionResponses = [1]; // Return index of second action (Cancelar)
    textFieldValuesList = [["+52 (55) 9988-7766"]];
    savedKeychain = {};
    creds = await getBaitCredentials(mockBaitValidator);
    assert.equal(creds.phone, "");
    assert.equal(savedKeychain["BAIT_PHONE"], undefined);

    // Scenario 6: Interactive Retry on invalid number
    alertActionResponses = [0, 0];
    textFieldValuesList = [["12345"], ["5599887766"]];
    savedKeychain = {};
    creds = await getBaitCredentials(mockBaitValidator);
    assert.equal(alertTitle, "Número incorrecto");
    assert.equal(creds.phone, "5599887766");
    assert.equal(savedKeychain["BAIT_PHONE"], "5599887766");

    // Scenario 7: Validator rejects non-Bait number, prompts "Número incorrecto", then valid
    alertActionResponses = [0, 0];
    textFieldValuesList = [["5511112222"], ["5599887766"]];
    savedKeychain = {};
    creds = await getBaitCredentials(mockBaitValidator);
    assert.equal(alertTitle, "Número incorrecto");
    assert.equal(creds.phone, "5599887766");
    assert.equal(savedKeychain["BAIT_PHONE"], "5599887766");

    // Scenario 8: Device offline, validator throws, prompts "Sin conexión a internet" and exits
    alertActionResponses = [0, 0];
    textFieldValuesList = [["5599887766"]];
    savedKeychain = {};
    const offlineBaitValidator = async () => { throw new Error("The Internet connection appears to be offline."); };
    creds = await getBaitCredentials(offlineBaitValidator);
    assert.equal(alertTitle, "Sin conexión a internet");
    assert.equal(savedKeychain["BAIT_PHONE"], undefined);
  } finally {
    globalThis.Keychain = origKeychain;
    globalThis.config = origConfig;
    globalThis.Alert = origAlert;
    baitConfig.phone = origBaitPhone;
  }
};

await testBaitCredentials();

// 1g. Test Movistar getCredentials & getSessionToken
const testMovistarCredentials = async () => {
  const origKeychain = globalThis.Keychain;
  const origConfig = globalThis.config;
  const origAlert = globalThis.Alert;

  try {
    let savedKeychain = {};
    globalThis.Keychain = {
      contains: (k) => k in savedKeychain,
      get: (k) => savedKeychain[k],
      set: (k, v) => { savedKeychain[k] = v; }
    };

    // Scenario 1: Keychain Happy Path
    savedKeychain["MOVISTAR_PID"] = "cached_pid_123";
    globalThis.config = { runsInWidget: true };
    assert.equal(await getSessionToken(false), "cached_pid_123");

    // Scenario 2: Widget Mode Bypass when empty
    delete savedKeychain["MOVISTAR_PID"];
    assert.equal(await getSessionToken(false), "");

    // Interactive Mode tests
    globalThis.config = { runsInWidget: false };
    let alertTitle = "";
    let alertActionResponses = [];
    let textFieldValuesList = [];
    let currentFields = [];

    globalThis.Alert = class {
      constructor() { this.fields = []; }
      set title(t) { alertTitle = t; }
      get title() { return alertTitle; }
      addSecureTextField() {}
      addAction() {}
      addCancelAction() {}
      async presentAlert() {
        currentFields = textFieldValuesList.length > 0 ? textFieldValuesList.shift() : [];
        return alertActionResponses.length > 0 ? alertActionResponses.shift() : 1;
      }
      textFieldValue(idx = 0) { return currentFields[idx] ?? ""; }
    };

    const mockMovistarValidator = async (pid) => pid === "valid_pid_456";

    // Scenario 3: Interactive Save
    alertActionResponses = [0];
    textFieldValuesList = [["valid_pid_456"]];
    delete savedKeychain["MOVISTAR_PID"];
    const token = await getSessionToken(false, mockMovistarValidator);
    assert.equal(token, "valid_pid_456");
    assert.equal(savedKeychain["MOVISTAR_PID"], "valid_pid_456");

    // Scenario 4: Interactive Cancel
    alertActionResponses = [1];
    textFieldValuesList = [["valid_pid_456"]];
    delete savedKeychain["MOVISTAR_PID"];
    const cancelledToken = await getSessionToken(false, mockMovistarValidator);
    assert.equal(cancelledToken, "");
    assert.equal(savedKeychain["MOVISTAR_PID"], undefined);

    // Scenario 5: Interactive Retry on invalid token
    alertActionResponses = [0, 0];
    textFieldValuesList = [["invalid_token"], ["valid_pid_456"]];
    delete savedKeychain["MOVISTAR_PID"];
    const retriedToken = await getSessionToken(false, mockMovistarValidator);
    assert.equal(alertTitle, "Credenciales incorrectas");
    assert.equal(retriedToken, "valid_pid_456");
    assert.equal(savedKeychain["MOVISTAR_PID"], "valid_pid_456");

    // Scenario 6: getCredentials wrapper
    const creds = await getMovistarCredentials(mockMovistarValidator);
    assert.equal(creds.pId, "valid_pid_456");

    // Scenario 7: Device offline, validator throws, prompts "Sin conexión a internet" and exits
    alertActionResponses = [0, 0];
    textFieldValuesList = [["valid_pid_456"]];
    delete savedKeychain["MOVISTAR_PID"];
    const offlineMovistarValidator = async () => { throw new Error("The Internet connection appears to be offline."); };
    const offlineToken = await getSessionToken(false, offlineMovistarValidator);
    assert.equal(alertTitle, "Sin conexión a internet");
    assert.equal(offlineToken, "");
    assert.equal(savedKeychain["MOVISTAR_PID"], undefined);
  } finally {
    globalThis.Keychain = origKeychain;
    globalThis.config = origConfig;
    globalThis.Alert = origAlert;
  }
};

await testMovistarCredentials();

// 1h. Test Network Validators
const testNetworkValidators = async () => {
  const origFetch = globalThis.fetch;
  const origRequest = globalThis.Request;
  delete globalThis.Request;
  try {
    // 1. validateTelcelCredentials
    let telcelRevoked = false;
    globalThis.fetch = async (url) => {
      if (url.includes("/login")) {
        return { ok: true, json: async () => ({ token: "mock_sso" }) };
      }
      if (url.includes("/revoke")) {
        telcelRevoked = true;
        return { ok: true, text: async () => "ok" };
      }
      return { ok: false };
    };
    assert.equal(await validateTelcelCredentials("5512345678", "valid_pw"), true);
    assert.equal(telcelRevoked, true);

    globalThis.fetch = async () => ({ ok: true, json: async () => ({ error: { description: "bad" } }) });
    assert.equal(await validateTelcelCredentials("5512345678", "wrong_pw"), false);

    globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({ error: "unauthorized" }) });
    assert.equal(await validateTelcelCredentials("5512345678", "wrong_pw"), false);

    globalThis.fetch = async () => ({ ok: false, status: 400, json: async () => ({ error: "bad request" }) });
    assert.equal(await validateTelcelCredentials("5512345678", "wrong_pw"), false);

    globalThis.fetch = async () => { throw new Error("Network offline"); };
    await assert.rejects(() => validateTelcelCredentials("5512345678", "pw"), /Network offline/);

    // 2. validateBaitCredentials
    globalThis.fetch = async (url) => {
      if (url.includes("/get/consumption")) {
        return { ok: true, json: async () => ({ success: true, data: [] }) };
      }
      return { ok: true, text: async () => "ordKey" };
    };
    assert.equal(await validateBaitCredentials("5512345678"), true);

    globalThis.fetch = async (url) => {
      if (url.includes("/get/consumption")) {
        return { ok: true, json: async () => ({ success: false }) };
      }
      return { ok: true, text: async () => "ordKey" };
    };
    assert.equal(await validateBaitCredentials("5512345678"), false);

    globalThis.fetch = async (url) => {
      if (url.includes("/get/consumption")) {
        return { ok: false, status: 404, json: async () => ({ error: "Not found" }) };
      }
      return { ok: true, text: async () => "ordKey" };
    };
    assert.equal(await validateBaitCredentials("5512345678"), false);

    globalThis.fetch = async (url) => {
      if (url.includes("/get/consumption")) {
        return { ok: false, status: 401, json: async () => ({ error: "Unauthorized" }) };
      }
      return { ok: true, text: async () => "ordKey" };
    };
    assert.equal(await validateBaitCredentials("5512345678"), false);

    const origWarn = console.warn;
    console.warn = () => {};
    globalThis.fetch = async () => { throw new Error("Network offline"); };
    await assert.rejects(() => validateBaitCredentials("5512345678"), /Network offline/);
    console.warn = origWarn;

    // 3. validateMovistarCredentials
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ content: "cipher:iv" }) });
    assert.equal(await validateMovistarCredentials("test_pid"), true);

    globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({ response: "401" }) });
    assert.equal(await validateMovistarCredentials("test_pid"), false);

    globalThis.fetch = async () => ({ ok: false, status: 403, json: async () => ({ response: "403" }) });
    assert.equal(await validateMovistarCredentials("test_pid"), false);

    globalThis.fetch = async () => { throw new Error("Network offline"); };
    await assert.rejects(() => validateMovistarCredentials("test_pid"), /Network offline/);
  } finally {
    globalThis.fetch = origFetch;
    if (origRequest !== undefined) globalThis.Request = origRequest;
  }
};

await testNetworkValidators();

// 1g. AT&T tests (Crypto, session extraction, parser, cache, network mock)
await import("./test_att.mjs");

// 2. Test Swift parser with the same fixture, error rejection, phone normalization & footerText
const swiftSource = readFileSync("MiTelcelWidget/TelcelNetworkService.swift", "utf8");
const swiftTest = `${swiftSource}
class MockURLProtocol: URLProtocol {
    static var requestHandler: ((URLRequest) throws -> (HTTPURLResponse, Data))?

    override class func canInit(with request: URLRequest) -> Bool {
        return true
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        return request
    }

    override func startLoading() {
        guard let handler = MockURLProtocol.requestHandler else { return }
        do {
            var req = request
            if req.httpBody == nil, let stream = req.httpBodyStream {
                stream.open()
                var data = Data()
                var buf = [UInt8](repeating: 0, count: 1024)
                while stream.hasBytesAvailable {
                    let n = stream.read(&buf, maxLength: buf.count)
                    if n > 0 { data.append(buf, count: n) } else { break }
                }
                stream.close()
                req.httpBody = data
            }
            let (response, data) = try handler(req)
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}
}

extension TelcelNetworkService {
    static func testRevokeSSOToken() async throws {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [MockURLProtocol.self]
        let session = URLSession(configuration: config)

        // Happy path
        var requestCount = 0
        MockURLProtocol.requestHandler = { request in
            requestCount += 1
            assert(request.url?.absoluteString == "https://dev.smapps.mx:9000/sso/revoke")
            assert(request.httpMethod == "POST")
            assert(request.value(forHTTPHeaderField: "Content-Type") == "application/x-www-form-urlencoded")
            let bodyString = String(data: request.httpBody ?? Data(), encoding: .utf8)
            assert(bodyString == "token=test_token_123&token_type=revoke")
            return (HTTPURLResponse(), Data())
        }
        await revokeSSOToken("test_token_123", session: session)
        assert(requestCount == 1)

        // Empty token
        requestCount = 0
        MockURLProtocol.requestHandler = { request in
            requestCount += 1
            let bodyString = String(data: request.httpBody ?? Data(), encoding: .utf8)
            assert(bodyString == "token=&token_type=revoke")
            return (HTTPURLResponse(), Data())
        }
        await revokeSSOToken("", session: session)
        assert(requestCount == 1)

        // Edge case: URL encoding check
        requestCount = 0
        MockURLProtocol.requestHandler = { request in
            requestCount += 1
            let bodyString = String(data: request.httpBody ?? Data(), encoding: .utf8)
            // URLComponents percent encodes =, &, space, and %; replacingOccurrences encodes + to %2B
            assert(bodyString == "token=token%2B%3D%26%20weird%25chars&token_type=revoke")
            return (HTTPURLResponse(), Data())
        }
        await revokeSSOToken("token+=& weird%chars", session: session)
        assert(requestCount == 1)
    }
}

let sem = DispatchSemaphore(value: 0)
Task {
    try await TelcelNetworkService.testRevokeSSOToken()
    sem.signal()
}
sem.wait()

let json = #"""
${JSON.stringify(fixture)}
"""#.data(using: .utf8)!
let entry = try TelcelNetworkService.parseHomeFlowJSON(json)
assert(entry.planName == "Telcel Libre 4")
assert(entry.cutoffDate == "28 de octubre")
assert(entry.shortCutoffDate == "28 oct")
assert(entry.daysLeft == 9)
assert(entry.buckets.map(\\.id) == ["0-0-0", "0-1-0", "0-10-0"])
assert(entry.totalMB == 15001)
assert(entry.consumedMB == 9501)
assert(entry.availableMB == 5474.5)
assert(entry.footerText.hasPrefix("Plan+Promo • ⏱️ "))
assert(TelcelNetworkService.normalizePhone("+52 (55) 1234-5678") == "5512345678")
let badJson = #"{"blocks":{"children":[{"id":"alert-error","config":{"value":"Mantenimiento"}}]}}"#.data(using: .utf8)!
assert((try? TelcelNetworkService.parseHomeFlowJSON(badJson)) == nil)
assert(TelcelUsageEntry.errorFallback.totalMB == 0)
assert(TelcelUsageEntry.errorFallback.cutoffDate == "Verificar cuenta")
assert(TelcelUsageEntry.errorFallback == TelcelUsageEntry.errorFallback)
assert(entry != TelcelUsageEntry.errorFallback)
assert(TelcelUsageEntry.errorFallback.isError)
assert(TelcelUsageEntry.errorFallback(for: .bait).isError)
assert(!TelcelUsageEntry.errorFallback.isUnlimited)
assert(!entry.isError)
assert(!entry.isUnlimited)

// Verify Swift parser prevents double counting with web-* blocks and supports web-only fallback
let webDupJson = #"""
{"blocks":{"children":[
  {"id":"text-plan-name","config":{"value":"Telcel Libre 4"}},
  {"id":"tabs-plans-v2-plan-name-0-0-0","config":{"value":"Datos de mi plan"}},
  {"id":"tabs-plans-v2-total-data-value-0-0-0","config":{"value":"10"}},
  {"id":"tabs-plans-v2-total-data-unit-0-0-0","config":{"value":"GB"}},
  {"id":"tabs-plans-v2-available-data-value-0-0-0","config":{"value":"4"}},
  {"id":"tabs-plans-v2-available-data-unit-0-0-0","config":{"value":"GB"}},
  {"id":"tabs-plans-v2-plan-name-web-0-0-0","config":{"value":"Datos de mi plan"}},
  {"id":"tabs-plans-v2-total-data-value-web-0-0-0","config":{"value":"10"}},
  {"id":"tabs-plans-v2-total-data-unit-web-0-0-0","config":{"value":"GB"}},
  {"id":"tabs-plans-v2-available-data-value-web-0-0-0","config":{"value":"4"}},
  {"id":"tabs-plans-v2-available-data-unit-web-0-0-0","config":{"value":"GB"}}
]}}
"""#.data(using: .utf8)!
let webDupEntry = try TelcelNetworkService.parseHomeFlowJSON(webDupJson)
assert(webDupEntry.totalMB == 10000)
assert(webDupEntry.availableMB == 4000)
assert(webDupEntry.buckets.count == 1)

let webOnlyJson = #"""
{"blocks":{"children":[
  {"id":"text-plan-name","config":{"value":"Telcel Libre"}},
  {"id":"tabs-plans-v2-plan-name-web-0-0-0","config":{"value":"Datos Web"}},
  {"id":"tabs-plans-v2-total-data-value-web-0-0-0","config":{"value":"10"}},
  {"id":"tabs-plans-v2-total-data-unit-web-0-0-0","config":{"value":"GB"}},
  {"id":"tabs-plans-v2-available-data-value-web-0-0-0","config":{"value":"6"}},
  {"id":"tabs-plans-v2-available-data-unit-web-0-0-0","config":{"value":"GB"}}
]}}
"""#.data(using: .utf8)!
let webOnlyEntry = try TelcelNetworkService.parseHomeFlowJSON(webOnlyJson)
assert(webOnlyEntry.totalMB == 10000)
assert(webOnlyEntry.availableMB == 6000)
assert(webOnlyEntry.buckets.count == 1)

// Test Swift Multi-Operator: Bait, Movistar, AT&T
let swiftBaitJson = #"""
{
  "success": true,
  "data": [
    {
      "category": "Data",
      "type": "BestEffort",
      "unlimited": false,
      "resume": { "total": 10240, "unused": 6144, "expire_date": "2026-11-01T23:59:59.000Z" }
    },
    {
      "category": "Data",
      "type": "Benefits",
      "offers_detail": [
        { "total": 5120, "unused": 5120, "expire_date": "2026-11-01T23:59:59.000Z" },
        { "total": 2048, "unused": 2048, "expire_date": "2026-09-01T00:00:00.000Z" }
      ]
    },
    {
      "category": "Data",
      "type": "SocialMedia",
      "unlimited": true,
      "resume": { "total": 5120, "unused": 4800, "expire_date": "2026-12-31T23:59:59.000Z" }
    }
  ]
}
"""#.data(using: .utf8)!
var swiftBaitComp = DateComponents()
swiftBaitComp.year = 2026
swiftBaitComp.month = 10
swiftBaitComp.day = 20
swiftBaitComp.hour = 10
swiftBaitComp.minute = 9
let swiftBaitNow = Calendar.current.date(from: swiftBaitComp)!
let swiftBaitEntry = try TelcelNetworkService.parseBaitJSON(swiftBaitJson, now: swiftBaitNow)
assert(swiftBaitEntry.planName == "Mi Bait")
assert(swiftBaitEntry.carrierDisplayName == "Mi Bait")
assert(swiftBaitEntry.cutoffDate == "1 de noviembre")
assert(swiftBaitEntry.shortCutoffDate == "1 nov")
assert(swiftBaitEntry.daysLeft == 12)
assert(swiftBaitEntry.totalMB == 15360)
assert(swiftBaitEntry.consumedMB == 4096)
assert(swiftBaitEntry.availableMB == 11264)
assert(swiftBaitEntry.remainingGB == 11.0)
assert(swiftBaitEntry.totalGB == 15.0)
assert(swiftBaitEntry.footerText.hasPrefix("Plan+Bono • ⏱️ "))
assert(swiftBaitEntry.accessibilitySummary == "Mi Bait: 11.00 GB disponibles de 15.0 GB, 12 días restantes")

// Swift Movistar Test
let swiftMovJson = #"""
{
  "offering": "Movistar Libre",
  "bolton": [
    {
      "name": "Navegación",
      "vigencia": "28/10/2026",
      "consumption": 65,
      "consumptionLabel": "Llevas 6.50 GB de 10.00 GB",
      "totalBenefit": "10.00 GB"
    },
    {
      "name": "Bono Datos Extra",
      "vigencia": "28/10/2026",
      "consumption": 50,
      "consumptionLabel": "Llevas 1.00 GB de 2.00 GB",
      "totalBenefit": "2.00 GB"
    },
    {
      "name": "Redes Sociales",
      "vigencia": "28/10/2026",
      "consumption": 0,
      "consumptionLabel": "Ilimitado",
      "totalBenefit": "Ilimitado"
    }
  ]
}
"""#.data(using: .utf8)!
var swiftMovComp = DateComponents()
swiftMovComp.year = 2026
swiftMovComp.month = 10
swiftMovComp.day = 21
let swiftMovNow = Calendar.current.date(from: swiftMovComp)!
let swiftMovEntry = try TelcelNetworkService.parseMovistarJSON(swiftMovJson, now: swiftMovNow)
assert(swiftMovEntry.planName == "Movistar Libre")
assert(swiftMovEntry.carrierDisplayName == "Mi Movistar")
assert(swiftMovEntry.totalMB == 12288)
assert(swiftMovEntry.consumedMB == 7680)
assert(swiftMovEntry.availableMB == 4608)
assert(swiftMovEntry.daysLeft == 7)
assert(swiftMovEntry.remainingGB == 4.5)
assert(swiftMovEntry.totalGB == 12.0)
assert(swiftMovEntry.accessibilitySummary == "Mi Movistar: 4.50 GB disponibles de 12.0 GB, 7 días restantes")

// Swift AT&T Test
let swiftAttJson = #"""
{
  "userBalances": [
    {
      "ServicePlan": {
        "ProductRatePlanName": "AT&T Ármalo 11 GB",
        "remainCutOffDays": "9",
        "allowances": [
          {
            "AllowanceID": "123456",
            "AllowanceName": "Datos Nacionales",
            "UnitType": "KBytes",
            "Quota": "11534336",
            "RemainingQuota": "6291456",
            "UtilizedQuota": "5242880",
            "Unlimited": "N",
            "EndTime": "2026-10-28T23:59:59"
          },
          {
            "AllowanceID": "99001234",
            "AllowanceName": "Bono Promocional",
            "UnitType": "MBytes",
            "Quota": "3072",
            "RemainingQuota": "3072",
            "UtilizedQuota": "0",
            "Unlimited": "N",
            "EndTime": "2026-10-28T23:59:59"
          }
        ]
      }
    }
  ]
}
"""#.data(using: .utf8)!
var swiftAttComp = DateComponents()
swiftAttComp.year = 2026
swiftAttComp.month = 10
swiftAttComp.day = 19
let swiftAttNow = Calendar.current.date(from: swiftAttComp)!
let swiftAttEntry = try TelcelNetworkService.parseATTJSON(swiftAttJson, now: swiftAttNow)
assert(swiftAttEntry.planName == "AT&T Ármalo 11 GB")
assert(swiftAttEntry.carrierDisplayName == "Mi AT&T")
assert(swiftAttEntry.totalMB == 14336)
assert(swiftAttEntry.consumedMB == 5120)
assert(swiftAttEntry.availableMB == 9216)
assert(swiftAttEntry.daysLeft == 9)
assert(swiftAttEntry.remainingGB == 9.0)
assert(swiftAttEntry.totalGB == 14.0)
assert(swiftAttEntry.accessibilitySummary == "Mi AT&T: 9.00 GB disponibles de 14.0 GB, 9 días restantes")

// Swift VoiceOver Accessibility Summary Tests
let swiftUnlimEntry = TelcelUsageEntry(
    date: .now,
    consumedMB: 1000,
    totalMB: 0,
    availableMB: 5120,
    daysLeft: 1,
    cutoffDate: "1 de noviembre",
    planName: "Bait Ilimitado",
    buckets: [],
    updatedAtString: "12:00",
    isCached: false,
    carrier: "bait",
    isUnlimited: true
)
assert(swiftUnlimEntry.accessibilitySummary == "Mi Bait: 5.0 GB velocidad normal, 1 día restante")

let swiftUnlimSlowEntry = TelcelUsageEntry(
    date: .now,
    consumedMB: 10000,
    totalMB: 0,
    availableMB: 0,
    daysLeft: 3,
    cutoffDate: "3 de noviembre",
    planName: "Bait Ilimitado",
    buckets: [],
    updatedAtString: "12:00",
    isCached: false,
    carrier: "bait",
    isUnlimited: true
)
assert(swiftUnlimSlowEntry.accessibilitySummary == "Mi Bait: Plan sin límite, 3 días restantes")

// Swift AT&T Crypto Test
let attPlain = "Swift AT&T Crypto Test Payload"
let attCipher = try TelcelNetworkService.aesEncryptATT(text: attPlain, password: "test-secret-key")
let attDecrypted = try TelcelNetworkService.aesDecryptATT(base64: attCipher, password: "test-secret-key")
assert(attDecrypted == attPlain)

// Swift Movistar Crypto Test
let movPlain = try TelcelNetworkService.decryptMovistarContent(payload: "${cipherPayload}", guardKey: "${staticKey}")
assert(movPlain.contains("Movistar Libre"))

print("✅ Swift & JS parser tests passed!")
`;

try {
  const out = execFileSync("swift", ["-"], { input: swiftTest, encoding: "utf8" });
  console.log(out.trim());
} catch (error) {
  if (error.code === 'ENOENT') {
    console.warn("⚠️ Swift binary not found. Skipping Swift parser tests.");
  } else {
    throw error;
  }
}


// Test requestBait error handling in Scriptable (Request) environment
{
  const origRequest = globalThis.Request;
  globalThis.Request = class {
    constructor(url) {
      this.url = url;
    }
    async loadJSON() {
      this.response = { statusCode: 500 };
      return {};
    }
    async loadString() {
      this.response = { statusCode: 500 };
      return "";
    }
  };
  try {
    await assert.rejects(
      () => requestBait("https://test.com", {}),
      /Error en la solicitud: código de estado 500/
    );
  } finally {
    if (origRequest !== undefined) {
      globalThis.Request = origRequest;
    } else {
      delete globalThis.Request;
    }
  }
}

// Test requestMovistar error handling in Scriptable (Request) environment
{
  const origRequest = globalThis.Request;
  globalThis.Request = class {
    constructor(url) {
      this.url = url;
    }
    async loadJSON() {
      this.response = { statusCode: 503 };
      return {};
    }
    async loadString() {
      this.response = { statusCode: 503 };
      return "";
    }
    async load() {
      this.response = { statusCode: 503 };
      return "";
    }
  };
  try {
    const origScript = globalThis.Script;
    globalThis.Script = {};
    await assert.rejects(
      () => requestMovistar("https://test.com", {}),
      /Error en la solicitud: código de estado 503/
    );
    if (origScript !== undefined) {
      globalThis.Script = origScript;
    } else {
      delete globalThis.Script;
    }
  } finally {
    if (origRequest !== undefined) {
      globalThis.Request = origRequest;
    } else {
      delete globalThis.Request;
    }
  }
}

// 4. Performance benchmark verification
await import("./test_performance.mjs");
