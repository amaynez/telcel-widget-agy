import assert from "node:assert/strict";
import { createRequire } from "node:module";

if (!globalThis.Color) globalThis.Color = class { constructor(hex, alpha = 1) { this.hex = hex; this.alpha = alpha; } };
if (!globalThis.Size) globalThis.Size = class { constructor(w, h) { this.width = w; this.height = h; } };
if (!globalThis.Rect) globalThis.Rect = class { constructor(x, y, w, h) { this.x = x; this.y = y; this.width = w; this.height = h; } };
if (!globalThis.Point) globalThis.Point = class { constructor(x, y) { this.x = x; this.y = y; } };
if (!globalThis.Font) {
  globalThis.Font = {
    systemFont: (s) => ({ size: s, weight: "regular" }),
    boldSystemFont: (s) => ({ size: s, weight: "bold" }),
    semiboldSystemFont: (s) => ({ size: s, weight: "semibold" }),
    mediumSystemFont: (s) => ({ size: s, weight: "medium" }),
    regularSystemFont: (s) => ({ size: s, weight: "regular" })
  };
}
if (!globalThis.Path) {
  globalThis.Path = class {
    constructor() { this.pts = []; }
    move(p) { this.pts.push(p); }
    addLine(p) { this.pts.push(p); }
  };
}
if (!globalThis.DrawContext) {
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
}
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
if (!globalThis.ListWidget) {
  globalThis.ListWidget = class {
    constructor() {
      this.texts = [];
      this.images = [];
      Object.assign(this, makeStack(this.texts, this.images));
    }
  };
}

let testCacheStore = "";
const origFileManager = globalThis.FileManager;
globalThis.FileManager = {
  local: () => ({
    documentsDirectory: () => "/tmp",
    joinPath: (d, f) => `${d}/${f}`,
    fileExists: () => Boolean(testCacheStore),
    readString: () => testCacheStore,
    writeString: (_p, s) => { testCacheStore = s; }
  })
};

const require = createRequire(import.meta.url);
const {
  fetchATTData,
  parseATTResponse,
  aesEncrypt,
  aesDecrypt,
  evpBytesToKey,
  md5,
  extractSessionKey,
  createWidget,
  loadCache,
  validateATTCredentials,
  getCredentials,
  requestATT,
  CONFIG
} = require("../src/MiATTWidget.js");
const { formatSummary: formatATTSummary, loadATTCache: loadATTCacheAndroid } = await import("../android/miatt_widget.mjs");
import { writeFileSync } from "node:fs";

// 1. MD5 RFC 1321 Test Vectors
assert.equal(Buffer.from(md5("")).toString("hex"), "d41d8cd98f00b204e9800998ecf8427e");
assert.equal(Buffer.from(md5("a")).toString("hex"), "0cc175b9c0f1b6a831c399e269772661");
assert.equal(Buffer.from(md5("abc")).toString("hex"), "900150983cd24fb0d6963f7d28e17f72");
assert.equal(Buffer.from(md5("message digest")).toString("hex"), "f96b697d7cb7938d525a2f31aaf161d0");
assert.equal(Buffer.from(md5("abcdefghijklmnopqrstuvwxyz")).toString("hex"), "c3fcd3d76192e4007dfb496cca67e13b");

// 2. OpenSSL EVP_BytesToKey Key Derivation
const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
const { key, iv } = evpBytesToKey(CONFIG.clientCipherKey, salt);
assert.equal(key.length, 32);
assert.equal(iv.length, 16);

// 3. AES-256-CBC Encryption & Decryption
const pass = CONFIG.clientCipherKey;
const sampleText = "AT&T Ármalo 11 GB - Datos con acentos y emojis: ⏱️ ☁️";
const cipherB64 = await aesEncrypt(sampleText, pass);
assert(cipherB64.startsWith("U2FsdGVkX1")); // Starts with "Salted__" in Base64
const plainDecrypted = await aesDecrypt(cipherB64, pass);
assert.equal(plainDecrypted, sampleText);

// Rejection on malformed ciphertext
await assert.rejects(() => aesDecrypt("c2hvcnQ=", pass), /insuficiente/);
await assert.rejects(() => aesDecrypt("Tm9NYWdpY0Jhc2U2NEhlcmU=", pass), /inválida/);

// 4. Session Key Extraction from HTML
const htmlNormal = '<html><head><meta name="__kf" content="334dcbed"><meta name="__sk" content="3a3349dae2b56a533a32c604"></head></html>';
assert.equal(extractSessionKey(htmlNormal), "3a3349dae2b56a533a32c604");

const htmlReversed = '<html><head><meta content="aabbcc112233" name="__sk"></head></html>';
assert.equal(extractSessionKey(htmlReversed), "aabbcc112233");

assert.equal(extractSessionKey("<html><head></head></html>"), null);

// 5. Postpaid Response Parsing (Ármalo 11 GB + Promo Bono)
const attNow = new Date(2026, 9, 19, 10, 9);
const attPostpaidFixture = {
  userBalances: [
    {
      ServicePlan: {
        ProductRatePlanName: "AT&T Ármalo 11 GB",
        ProductRatePlanID: "283945505",
        remainCutOffDays: "9",
        allowances: [
          {
            AllowanceID: "283945505",
            AllowanceName: "Internet incluidos",
            AllowanceDescription: "Datos del plan",
            FriendlyName: "Datos del plan",
            UnitType: "KBytes",
            Quota: "11534336",
            RemainingQuota: "6291456",
            UtilizedQuota: "5242880",
            Unlimited: "N",
            EndTime: "2026-10-28T23:59:59"
          },
          {
            AllowanceID: "99001234",
            AllowanceName: "Bono Promocional",
            AllowanceDescription: "Datos Promocionales",
            FriendlyName: "Bono de datos",
            UnitType: "MBytes",
            Quota: "3072",
            RemainingQuota: "3072",
            UtilizedQuota: "0",
            Unlimited: "N",
            EndTime: "2026-10-28T23:59:59"
          },
          {
            AllowanceID: "777",
            AllowanceName: "Redes Sociales",
            AllowanceDescription: "Redes sociales ilimitadas",
            FriendlyName: "Redes",
            UnitType: "MBytes",
            Quota: "999999",
            Unlimited: "Y"
          },
          {
            AllowanceID: "888",
            AllowanceName: "Minutos y SMS",
            AllowanceDescription: "Llamadas ilimitadas",
            FriendlyName: "Minutos",
            UnitType: "MBytes",
            Quota: "999999",
            Unlimited: "Y"
          },
          {
            AllowanceID: "999",
            AllowanceName: "Bono Expirado",
            AllowanceDescription: "Bono viejo",
            UnitType: "MBytes",
            Quota: "2048",
            EndTime: "2026-10-01T00:00:00"
          }
        ]
      }
    }
  ]
};

const res = parseATTResponse(attPostpaidFixture, attNow);
assert.equal(res.planName, "AT&T Ármalo 11 GB");
assert.equal(res.cutoffDate, "28 de octubre");
assert.equal(res.cutoffISO, "2026-10-28");
assert.equal(res.daysLeft, 9);
assert.equal(res.promo, true);
assert.equal(res.unlimited, false);
assert.equal(res.totalMB, 14336);
assert.equal(res.consumedMB, 5120);
assert.equal(res.availableMB, 9216);

// 6. UI Widget Creation (Small Card)
const w = createWidget(res);
assert(w.texts.includes("Mi AT&T"));
assert(w.texts.includes("Corte 28 oct"));
assert(w.texts.includes("9 días"));
assert(w.texts.includes("● 5.00 GB (36%)"));
assert(w.texts.some(t => t.includes("● 1.00 GB/d")));
assert(w.texts.some(t => t.includes("Plan+Promo")));
assert.deepEqual(w.images[0].texts, ["9.00 GB", "libres de 14.0 GB"]);
assert.equal(w.images[0].arcs, 3); // track + red spent + green left
assert.equal(w.url, "https://miattweb.att.com.mx/");

// 7. Cache Loading and Days Left Recalculation
testCacheStore = JSON.stringify(res);
const cached = loadCache(new Date(2026, 9, 25, 10, 0)); // 3 days remaining until Oct 28
assert.equal(cached.fromCache, true);
assert.equal(cached.daysLeft, 3);
const wCached = createWidget(cached);
assert(wCached.texts.some(t => t.includes(" ☁️")));

// 8. Prepaid Schema Support
const attPrepaidFixture = {
  userBalances: {
    planName: "AT&T Más",
    MTX_SS_GetBalanceOutVO: {
      BalanceVO: {
        AllowanceVO: [
          {
            FriendlyName: "Recarga Datos",
            UnitType: "MBytes",
            Quota: "4096",
            RemainingQuota: "2048",
            UtilizedQuota: "2048",
            Unlimited: "N",
            EndTime: "2026-11-05T23:59:59"
          }
        ]
      }
    }
  }
};
const prepRes = parseATTResponse(attPrepaidFixture, attNow);
assert.equal(prepRes.totalMB, 4096);
assert.equal(prepRes.availableMB, 2048);
assert.equal(prepRes.consumedMB, 2048);
assert.equal(prepRes.cutoffDate, "5 de noviembre");
assert.equal(prepRes.daysLeft, 17);
assert.equal(prepRes.promo, false);

// 9. Single-Bucket Unlimited Plan
const attUnlimitedFixture = {
  userBalances: {
    ServicePlan: {
      ProductRatePlanName: "AT&T Ármalo Ilimitado",
      remainCutOffDays: "5",
      allowances: [
        {
          AllowanceName: "Internet Ilimitado",
          UnitType: "MBytes",
          Quota: "999999999",
          Unlimited: "Y",
          EndTime: "2026-10-24T23:59:59"
        }
      ]
    }
  }
};
const unlRes = parseATTResponse(attUnlimitedFixture, attNow);
assert.equal(unlRes.unlimited, true);
assert.equal(unlRes.totalMB, 0);
assert.equal(unlRes.daysLeft, 5);
const wUnl = createWidget(unlRes);
assert.deepEqual(wUnl.images[0].texts, ["Ilimitado", "datos libres"]);
assert(wUnl.texts.includes("● Datos Ilimitado"));
assert(wUnl.texts.includes("● Ilimitado"));

// 10. Parser Error Rejections & Offline Fallbacks
assert.throws(() => parseATTResponse({ userBalances: [] }), /Sin bolsas de datos/);
assert.throws(() => parseATTResponse({ allowances: [{ AllowanceName: "Redes Sociales", UnitType: "MBytes" }] }), /Sin bolsas de navegación/);

const wNull = createWidget(null);
assert(wNull.texts.includes("⚠️"));
assert(wNull.texts.some(t => t.includes("No pudimos cargar tus datos")));
assert.equal(wNull.url, "scriptable://");

globalThis.Script = { name: () => "Mi ATT" };
assert.equal(createWidget(null).url, "scriptable:///run?scriptName=Mi%20ATT");
delete globalThis.Script;

// 11. End-to-End fetchATTData Flow Simulation
const sessionKey = "3a3349dae2b56a533a32c604";
const rawToken = "eyJhbGciOiJIUzI1NiJ9.test.jwt.token";
const origFetch = globalThis.fetch;
try {
  globalThis.fetch = async (url, opts) => {
    if (url === "https://miattweb.att.com.mx/") {
      return {
        ok: true,
        status: 200,
        headers: {
          getSetCookie: () => ["crypto.sid=session_sid_123; Path=/; HttpOnly"]
        },
        text: async () => `<html><head><meta name="__sk" content="${sessionKey}"></head></html>`
      };
    }
    if (url === "https://miattweb.att.com.mx/api/auth/login") {
      const body = JSON.parse(opts.body);
      const dec = await aesDecrypt(body.encrypted_data, sessionKey);
      const parsed = JSON.parse(dec);
      assert.equal(parsed.msisdn, "5512345678");
      assert(opts.headers.Cookie.includes("session_sid_123"));
      const encResp = await aesEncrypt(JSON.stringify({
        statusCode: 200,
        statusMessage: "LOGIN_SUCCESS",
        token: rawToken,
        userInfo: { subscriber_type: "postpaid" }
      }), sessionKey);
      return {
        ok: true,
        status: 200,
        headers: {
          getSetCookie: () => ["BIGipServer=pool_123; Path=/"]
        },
        json: async () => ({ encrypted_data: encResp })
      };
    }
    if (url === "https://miattweb.att.com.mx/api/users/fetchUserBalances") {
      assert(opts.headers.Authorization.startsWith("Bearer "));
      assert(opts.headers.Cookie.includes("session_sid_123"));
      assert(opts.headers.Cookie.includes("BIGipServer=pool_123"));
      const encResp = await aesEncrypt(JSON.stringify(attPostpaidFixture), sessionKey);
      return {
        ok: true,
        status: 200,
        json: async () => ({ encrypted_data: encResp })
      };
    }
    throw new Error(`Unexpected url: ${url}`);
  };

  const fetched = await fetchATTData({ phone: "5512345678", password: "mypassword" });
  assert.equal(fetched.planName, "AT&T Ármalo 11 GB");
  assert.equal(fetched.totalMB, 14336);
  assert.equal(fetched.availableMB, 9216);
  assert.equal(fetched.consumedMB, 5120);

  // 12. validateATTCredentials
  const valid = await validateATTCredentials("5512345678", "mypassword");
  assert.equal(valid, true);

  globalThis.fetch = async () => ({ ok: false, status: 401 });
  const invalid = await validateATTCredentials("5512345678", "wrongpass");
  assert.equal(invalid, false);

  globalThis.fetch = async () => ({ ok: false, status: 403 });
  assert.equal(await validateATTCredentials("5512345678", "wrongpass"), false);

  globalThis.fetch = async () => ({ ok: false, status: 404 });
  assert.equal(await validateATTCredentials("5512345678", "wrongpass"), false);

  globalThis.fetch = async () => { throw new Error("connect ECONNREFUSED 127.0.0.1:4000"); };
  await assert.rejects(() => validateATTCredentials("5512345678", "pass"), /ECONNREFUSED/);

  globalThis.fetch = async () => { throw new Error("Offline network"); };
  await assert.rejects(() => validateATTCredentials("5512345678", "pass"), /Offline network/);
} finally {
  globalThis.fetch = origFetch;
}

// 13. getCredentials Flow
const store = new Map();
globalThis.Keychain = {
  contains: (k) => store.has(k),
  get: (k) => store.get(k),
  set: (k, v) => store.set(k, v)
};
store.set("ATT_PHONE", "5512345679");
store.set("ATT_PASS", "secret_pass");
const creds1 = await getCredentials();
assert.equal(creds1.phone, "5512345679");
assert.equal(creds1.password, "secret_pass");

// In-app prompt flow when credentials missing
store.clear();
let alertFieldValues = ["5587654321", "my_new_pass"];
globalThis.Alert = class {
  addTextField() {}
  addSecureTextField() {}
  addAction() {}
  addCancelAction() {}
  async presentAlert() { return 0; }
  textFieldValue(idx) { return alertFieldValues[idx]; }
};
const mockValidator = async (phone, pass) => phone === "5587654321" && pass === "my_new_pass";
const creds2 = await getCredentials(mockValidator);
assert.equal(creds2.phone, "5587654321");
assert.equal(creds2.password, "my_new_pass");
assert.equal(store.get("ATT_PHONE"), "5587654321");
assert.equal(store.get("ATT_PASS"), "my_new_pass");

// 14. Non-numeric remainCutOffDays fallback & raw "Bytes" unit parsing
const nonNumericFixture = {
  userBalances: [
    {
      ServicePlan: {
        ProductRatePlanName: "AT&T Ármalo",
        remainCutOffDays: "N/A",
        allowances: [
          {
            AllowanceName: "Datos",
            UnitType: "Bytes",
            Quota: "1073741824", // 1 GB in bytes
            RemainingQuota: "536870912", // 512 MB in bytes
            UtilizedQuota: "536870912",
            EndTime: "2026-10-28T23:59:59"
          }
        ]
      }
    }
  ]
};
const nonNumRes = parseATTResponse(nonNumericFixture, attNow);
assert.equal(Number.isFinite(nonNumRes.daysLeft), true);
assert.equal(nonNumRes.daysLeft, 9); // Fallback to chosenCutoff (Oct 19 to Oct 28)
assert.equal(nonNumRes.totalMB, 1024);
assert.equal(nonNumRes.availableMB, 512);
assert.equal(nonNumRes.consumedMB, 512);

// 15. requestATT in Node.js (fetch) environment
const origFetch2 = globalThis.fetch;
try {
  globalThis.fetch = async (url) => {
    if (url === "https://test.com/json") {
      return {
        ok: true,
        status: 200,
        headers: { getSetCookie: () => ["sid=123; Path=/"] },
        json: async () => ({ ok: true })
      };
    }
    if (url === "https://test.com/401") {
      return { ok: false, status: 401 };
    }
    throw new Error("offline");
  };
  const rJson = await requestATT("https://test.com/json", "GET", {}, null, true);
  assert.deepEqual(rJson.data, { ok: true });
  assert.equal(rJson.cookies, "sid=123");
  assert.equal(rJson.status, 200);

  await assert.rejects(
    () => requestATT("https://test.com/401", "GET", {}, null, true),
    /código de estado 401/
  );
} finally {
  globalThis.fetch = origFetch2;
}

// 16. requestATT in Scriptable (Request) environment
const origRequest = globalThis.Request;
try {
  globalThis.Request = class {
    constructor(url) {
      this.url = url;
      this.method = "GET";
      this.headers = {};
      this.response = {
        statusCode: url.includes("error") ? 500 : 200,
        cookies: [{ name: "session", value: "abc" }]
      };
    }
    async loadString() {
      if (this.url.includes("error")) return "<html>Server Error</html>";
      return JSON.stringify({ success: true });
    }
  };

  const reqSuccess = await requestATT("https://test.com/ok", "GET", {}, null, true);
  assert.deepEqual(reqSuccess.data, { success: true });
  assert.equal(reqSuccess.cookies, "session=abc");
  assert.equal(reqSuccess.status, 200);

  await assert.rejects(
    () => requestATT("https://test.com/error", "GET", {}, null, true),
    /código de estado 500/
  );
} finally {
  if (origRequest !== undefined) globalThis.Request = origRequest;
  else delete globalThis.Request;
}

// 17. Android AT&T formatSummary and loadATTCache
const attRegularData = {
  planName: "AT&T Ármalo 11 GB",
  availableMB: 9363.46,
  totalMB: 11264,
  consumedMB: 1900.54,
  cutoffDate: "28 de octubre",
  daysLeft: 9,
  updatedAt: "14:30"
};
const summaryReg = formatATTSummary(attRegularData);
assert(summaryReg.includes("Mi AT&T • AT&T Ármalo 11 GB"));
assert(summaryReg.includes("9.14 GB libres de 11.0 GB"));
assert(summaryReg.includes("Usados: 1.86 GB (17%)"));
assert(summaryReg.includes("Corte: 28 de octubre (9d) • ⏱ 14:30"));

const summaryCached = formatATTSummary({ ...attRegularData, fromCache: true });
assert(summaryCached.includes("☁️"));

const attUnlimitedData = {
  planName: "AT&T Ármalo Ilimitado",
  availableMB: 0,
  totalMB: 0,
  consumedMB: 5120,
  cutoffDate: "28 de octubre",
  daysLeft: 9,
  updatedAt: "14:30",
  unlimited: true
};
const summaryUnl = formatATTSummary(attUnlimitedData);
assert(summaryUnl.includes("Datos Ilimitados"));
assert(summaryUnl.includes("Usados: 5.00 GB"));

const tmpATTCache = "/tmp/test_att_cache_android.json";
writeFileSync(tmpATTCache, JSON.stringify({ ...attRegularData, cutoffISO: "2026-10-28" }));
try {
  const androidATTCached = loadATTCacheAndroid(tmpATTCache, new Date(2026, 9, 21));
  assert.equal(androidATTCached.fromCache, true);
  assert.equal(androidATTCached.daysLeft, 7);
  writeFileSync(tmpATTCache, "[1, 2, 3]");
  assert.equal(loadATTCacheAndroid(tmpATTCache), null);
} finally {
  try { (await import("node:fs")).unlinkSync(tmpATTCache); } catch (_) {}
}

// Cleanup globals
delete globalThis.Keychain;
delete globalThis.Alert;
if (origFileManager) globalThis.FileManager = origFileManager;

console.log("✅ Mi AT&T widget and parser tests passed!");
