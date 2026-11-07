# Widgets Móviles México — Prototipo Android (Termux + Termux:Widget / KWGT)

## Overview
Node.js CLI scripts and Termux:Widget shell launchers for Android that reuse the iOS carrier clients (`../src/MiTelcelWidget.js`, `../src/MiBaitWidget.js`, `../src/MiMovistarWidget.js`, and `../src/MiATTWidget.js`) to fetch live usage, persist JSON caches for KWGT, recalculate `daysLeft` from `cutoffISO`, and print formatted CLI usage summaries. Part of the root technical blueprint ([`../README_TECH.md`](../README_TECH.md)).

> [!WARNING]
> **No probado en hardware físico:** Estos scripts CLI de Android fueron construidos reutilizando la lógica validada y probada de iOS (`src/MiTelcelWidget.js`, `src/MiBaitWidget.js`, `src/MiMovistarWidget.js` y `src/MiATTWidget.js`), pero **no han sido probados en un teléfono Android real** por no contar con un dispositivo físico disponible.

## Interface
- `[android/mitelcel_widget.mjs:loadTelcelCache]` `export function loadTelcelCache(cachePath = CACHE_FILE)`
- `[android/mitelcel_widget.mjs:formatSummary]` `export function formatSummary(data)`
- `[android/mibait_widget.mjs:loadBaitCache]` `export function loadBaitCache(cachePath = CACHE_FILE, now = new Date())`
- `[android/mibait_widget.mjs:formatSummary]` `export function formatSummary(data)`
- `[android/mimovistar_widget.mjs:loadMovistarCache]` `export function loadMovistarCache(cachePath = CACHE_FILE, now = new Date())`
- `[android/mimovistar_widget.mjs:formatSummary]` `export function formatSummary(data)`
- `[android/miatt_widget.mjs:loadATTCache]` `export function loadATTCache(cachePath = CACHE_FILE, now = new Date())`
- `[android/miatt_widget.mjs:formatSummary]` `export function formatSummary(data)`
- `[android/shortcuts_mitelcel.sh:node]` CLI launcher executing `node android/mitelcel_widget.mjs` from `$HOME/telcel-widget-agy`
- `[android/shortcuts_mibait.sh:node]` CLI launcher executing `node android/mibait_widget.mjs` from `$HOME/telcel-widget-agy`
- `[android/shortcuts_mimovistar.sh:node]` CLI launcher executing `node android/mimovistar_widget.mjs` from `$HOME/telcel-widget-agy`
- `[android/shortcuts_miatt.sh:node]` CLI launcher executing `node android/miatt_widget.mjs` from `$HOME/telcel-widget-agy`

## Invariants
- `[android/mitelcel_widget.mjs:formatSummary]` Uses commercial unit conversion `1 GB = 1000 MB`.
- `[android/mibait_widget.mjs:formatSummary]` / `[android/mimovistar_widget.mjs:formatSummary]` / `[android/miatt_widget.mjs:formatSummary]` Use commercial unit conversion `1 GB = 1024 MB`; `miatt_widget.mjs:formatSummary` treats `data.totalMB === 0 && (String(data.planName || '').toLowerCase().includes('ilimitado') || data.unlimited)` as an unlimited plan (`Datos Ilimitados`).
- `[android/mibait_widget.mjs:loadBaitCache]` / `[android/mimovistar_widget.mjs:loadMovistarCache]` / `[android/miatt_widget.mjs:loadATTCache]` Return `null` if the cache file does not exist, fails JSON parsing, or parsed value is falsy, non-object, or an Array; set `parsed.fromCache = true` and dynamically recalculate `parsed.daysLeft` when `parsed.cutoffISO` matches `YYYY-MM-DD`.
- `[android/mitelcel_widget.mjs:loadTelcelCache]` Returns `null` if the cache file does not exist, fails JSON parsing, or parsed value is falsy, non-object, or an Array; sets `parsed.fromCache = true`.
- `[android/mibait_widget.mjs:runCli]` Standalone execution logic (`.env` parsing, cache loading, summary formatting, CLI runner) is intentionally kept self-contained per script without shared helper modules across `mitelcel_widget.mjs`, `mibait_widget.mjs`, `mimovistar_widget.mjs`, and `miatt_widget.mjs`.

## Side Effects
- `[android/mitelcel_widget.mjs:Color]` / `[android/mibait_widget.mjs:Color]` / `[android/mimovistar_widget.mjs:Color]` / `[android/miatt_widget.mjs:Color]` Polyfill `globalThis.Color` on module import if undefined and read `../.env` (`envPath`) to populate unset `process.env` keys.
- `[android/mitelcel_widget.mjs:runCli]` Reads `TELCEL_PHONE`, `TELCEL_PASS`, and `TELCEL_CACHE_FILE` from `process.env`, calls `fetchTelcelData({ phone, password })`, reads/writes `CACHE_FILE` (`/sdcard/Download/mitelcel_widget.json` or `../mitelcel_usage_cache.json`), logs to stdout/stderr, and calls `process.exit(1)` if both live fetch and cache fallback fail.
- `[android/mibait_widget.mjs:runCli]` Reads `BAIT_PHONE` and `BAIT_CACHE_FILE` from `process.env`, calls `fetchBaitData({ phone })`, reads/writes `CACHE_FILE` (`/sdcard/Download/mibait_widget.json` or `../mibait_usage_cache.json`), logs to stdout/stderr, and calls `process.exit(1)` if both live fetch and cache fallback fail.
- `[android/mimovistar_widget.mjs:runCli]` Reads `MOVISTAR_PID` and `MOVISTAR_CACHE_FILE` from `process.env`, calls `fetchMovistarData({ pId })`, reads/writes `CACHE_FILE` (`/sdcard/Download/mimovistar_widget.json` or `../mimovistar_usage_cache.json`), logs to stdout/stderr, and calls `process.exit(1)` if both live fetch and cache fallback fail.
- `[android/miatt_widget.mjs:runCli]` Reads `ATT_PHONE`, `ATT_PASS`, and `ATT_CACHE_FILE` from `process.env`, calls `fetchATTData({ phone, password })`, reads/writes `CACHE_FILE` (`/sdcard/Download/miatt_widget.json` or `../miatt_usage_cache.json`), logs to stdout/stderr, and calls `process.exit(1)` if both live fetch and cache fallback fail.
- `[android/shortcuts_mitelcel.sh:cd]` / `[android/shortcuts_mibait.sh:cd]` / `[android/shortcuts_mimovistar.sh:cd]` / `[android/shortcuts_miatt.sh:cd]` Change working directory to `$HOME/telcel-widget-agy` (or exit with status `1`), execute the respective `node android/<carrier>_widget.mjs` script, and block on stdin (`read -r -p`).

## Verification
- Run: `node tests/test_parser.mjs`

---

## Cómo funciona cada operador

En lugar de reescribir clientes desde cero o alterar cabeceras y estándares validados, los scripts de Android importan directamente la lógica compartida:

1. **Mi Telcel ([`android/mitelcel_widget.mjs`](mitelcel_widget.mjs)):**
   - Importa `fetchTelcelData` (que ejecuta internamente `parseTelcelResponse`) de [`src/MiTelcelWidget.js`](../src/MiTelcelWidget.js).
   - Flujo seguro de 4 pasos (**WebLogin SSO -> JWT -> Wave B2F -> Revocación SSO obligatoria** en bloque `finally`).
   - Usa la convención comercial de Telcel: `1 GB = 1000 MB`.
   - Genera `/sdcard/Download/mitelcel_widget.json` para **KWGT** e imprime el resumen formateado para **Termux:Widget**.

2. **Mi Bait ([`android/mibait_widget.mjs`](mibait_widget.mjs)):**
   - Importa `fetchBaitData` (que ejecuta internamente `parseBaitResponse`) de [`src/MiBaitWidget.js`](../src/MiBaitWidget.js).
   - Consulta el endpoint público `/get/consumption` con el MSISDN (sin contraseña) y llave `x-ord-service` extraída dinámicamente de `mibait.com` (con fallback local).
   - Recorrido en una sola pasada: suma bolsas `BestEffort` + `Throttling` + ofertas promocionales vigentes en `Benefits.offers_detail[]`.
   - Usa la convención: `1 GB = 1024 MB`.
   - Persiste `cutoffISO` (`YYYY-MM-DD`) y **recalcula dinámicamente `daysLeft`** contra la fecha actual al leer desde caché, evitando contadores congelados.
   - Genera `/sdcard/Download/mibait_widget.json`.

3. **Mi Movistar ([`android/mimovistar_widget.mjs`](mimovistar_widget.mjs)):**
   - Importa `fetchMovistarData` (que ejecuta internamente `decryptMovistarContent` y `parseMovistarResponse`) de [`src/MiMovistarWidget.js`](../src/MiMovistarWidget.js).
   - Consume `/consumptions-controller/datos-iniciales` autenticado con el token de sesión `MOVISTAR_PID` (`p_id` capturado en la web de Movistar o exportado desde Keychain en iOS).
   - Desencripta el payload con **AES-256-GCM** usando la Web Crypto API (`globalThis.crypto.subtle`) y la llave `guardKey` descubierta dinámicamente en `mi.movistar.com.mx/login` (con soporte para `MOVISTAR_GUARD_KEY` en `.env` o fallback estático).
   - Usa la convención: `1 GB = 1024 MB`.
   - Persiste `cutoffISO` y **recalcula dinámicamente `daysLeft`** al leer desde caché.
   - Genera `/sdcard/Download/mimovistar_widget.json`.

4. **Mi AT&T ([`android/miatt_widget.mjs`](miatt_widget.mjs)):**
   - Importa `fetchATTData` (que ejecuta internamente `parseATTResponse`) de [`src/MiATTWidget.js`](../src/MiATTWidget.js).
   - Autentica contra `miattweb.att.com.mx` con doble cifrado **AES-256-CBC** con derivación EVP_BytesToKey (MD5) de CryptoJS: contraseña con clave de cliente y payload/token con llave de sesión `__sk` extraída dinámicamente de `GET /`.
   - Consulta balances en `/api/users/fetchUserBalances`.
   - Usa la convención: `1 GB = 1024 MB`.
   - Persiste `cutoffISO` (`YYYY-MM-DD`) y **recalcula dinámicamente `daysLeft`** contra la fecha actual al leer desde caché.
   - Genera `/sdcard/Download/miatt_widget.json`.

---

## Instalación Paso a Paso en Android

### 1. Instalar Termux y Termux:Widget
1. Instala **Termux** y **Termux:Widget** desde **F-Droid** (las versiones en Google Play Store están desactualizadas).
2. Abre Termux y concede permisos de almacenamiento:
   ```sh
   pkg update && pkg install -y nodejs git
   termux-setup-storage
   ```

### 2. Clonar el repositorio y configurar credenciales
```sh
cd ~
git clone https://github.com/amaynez/telcel-widget-agy.git telcel-widget-agy
cd telcel-widget-agy
cp .env.example .env
nano .env
```
Configura las credenciales del operador (o los operadores) que utilices:
- **Telcel:** `TELCEL_PHONE` (10 dígitos) y `TELCEL_PASS` (contraseña de Mi Telcel).
- **Bait:** `BAIT_PHONE` (10 dígitos, sin contraseña).
- **Movistar:** `MOVISTAR_PID` (token de sesión `p_id` extraído tras autenticarte en `mi.movistar.com.mx`). Opcionalmente `MOVISTAR_GUARD_KEY` si deseas fijar la llave de descifrado.
- **AT&T:** `ATT_PHONE` (10 dígitos) y `ATT_PASS` (contraseña de Mi AT&T).

Guarda los cambios en nano con `Ctrl+O`, `Enter`, y sal con `Ctrl+X`.

---

## Opción A: Usar con Termux:Widget (Rápido y táctil)

1. Crea la carpeta de atajos de Termux y copia los scripts lanzadores que necesites:
   ```sh
   mkdir -p ~/.shortcuts

   # Para Telcel:
   cp ~/telcel-widget-agy/android/shortcuts_mitelcel.sh ~/.shortcuts/MiTelcel
   chmod +x ~/.shortcuts/MiTelcel

   # Para Bait:
   cp ~/telcel-widget-agy/android/shortcuts_mibait.sh ~/.shortcuts/MiBait
   chmod +x ~/.shortcuts/MiBait

   # Para Movistar:
   cp ~/telcel-widget-agy/android/shortcuts_mimovistar.sh ~/.shortcuts/MiMovistar
   chmod +x ~/.shortcuts/MiMovistar

   # Para AT&T:
   cp ~/telcel-widget-agy/android/shortcuts_miatt.sh ~/.shortcuts/MiATT
   chmod +x ~/.shortcuts/MiATT
   ```
2. En la pantalla de inicio de Android, mantén presionado un espacio vacío > **Widgets** > **Termux:Widget**.
3. Elige el atajo correspondiente (**MiTelcel**, **MiBait**, **MiMovistar** o **MiATT**). Al tocarlo, ejecutará la consulta en vivo, guardará el JSON en tu almacenamiento local e imprimirá el resumen. Si no hay conexión, cargará automáticamente los datos de la caché local acompañados del icono `☁️`.

---

## Opción B: Widget Visual con KWGT (Kustom Widget Maker)

Cada script exporta un archivo JSON listo para ser consumido por fórmulas de **KWGT**:

| Operador | Archivo JSON | Conversión de MB a GB |
| :--- | :--- | :--- |
| **Mi Telcel** | `/sdcard/Download/mitelcel_widget.json` | Dividir entre `1000` |
| **Mi Bait** | `/sdcard/Download/mibait_widget.json` | Dividir entre `1024` |
| **Mi Movistar** | `/sdcard/Download/mimovistar_widget.json` | Dividir entre `1024` |
| **Mi AT&T** | `/sdcard/Download/miatt_widget.json` | Dividir entre `1024` |

### Fórmulas KWGT

#### Mi Telcel (`mitelcel_widget.json`)
- **GB Disponibles:** `$mu(round, wg("file:///sdcard/Download/mitelcel_widget.json", json, .availableMB) / 1000, 2)$ GB`
- **GB Totales:** `$mu(round, wg("file:///sdcard/Download/mitelcel_widget.json", json, .totalMB) / 1000, 1)$ GB`
- **Días Restantes:** `$wg("file:///sdcard/Download/mitelcel_widget.json", json, .daysLeft)$ días`
- **Fecha de Corte:** `$wg("file:///sdcard/Download/mitelcel_widget.json", json, .cutoffDate)$`
- **Última Actualización:** `$wg("file:///sdcard/Download/mitelcel_widget.json", json, .updatedAt)$$if(wg("file:///sdcard/Download/mitelcel_widget.json", json, .fromCache), " ☁️", "")$`

#### Mi Bait (`mibait_widget.json`)
- **GB Disponibles:** `$mu(round, wg("file:///sdcard/Download/mibait_widget.json", json, .availableMB) / 1024, 2)$ GB`
- **GB Totales:** `$mu(round, wg("file:///sdcard/Download/mibait_widget.json", json, .totalMB) / 1024, 1)$ GB`
- **Días Restantes:** `$wg("file:///sdcard/Download/mibait_widget.json", json, .daysLeft)$ días`
- **Fecha de Vigencia:** `$wg("file:///sdcard/Download/mibait_widget.json", json, .cutoffDate)$`
- **Última Actualización:** `$wg("file:///sdcard/Download/mibait_widget.json", json, .updatedAt)$$if(wg("file:///sdcard/Download/mibait_widget.json", json, .fromCache), " ☁️", "")$`

#### Mi Movistar (`mimovistar_widget.json`)
- **GB Disponibles:** `$mu(round, wg("file:///sdcard/Download/mimovistar_widget.json", json, .availableMB) / 1024, 2)$ GB`
- **GB Totales:** `$mu(round, wg("file:///sdcard/Download/mimovistar_widget.json", json, .totalMB) / 1024, 1)$ GB`
- **Días Restantes:** `$wg("file:///sdcard/Download/mimovistar_widget.json", json, .daysLeft)$ días`
- **Fecha de Vigencia:** `$wg("file:///sdcard/Download/mimovistar_widget.json", json, .cutoffDate)$`
- **Última Actualización:** `$wg("file:///sdcard/Download/mimovistar_widget.json", json, .updatedAt)$$if(wg("file:///sdcard/Download/mimovistar_widget.json", json, .fromCache), " ☁️", "")$`

#### Mi AT&T (`miatt_widget.json`)
- **GB Disponibles:** `$mu(round, wg("file:///sdcard/Download/miatt_widget.json", json, .availableMB) / 1024, 2)$ GB`
- **GB Totales:** `$mu(round, wg("file:///sdcard/Download/miatt_widget.json", json, .totalMB) / 1024, 1)$ GB`
- **Días Restantes:** `$wg("file:///sdcard/Download/miatt_widget.json", json, .daysLeft)$ días`
- **Fecha de Corte:** `$wg("file:///sdcard/Download/miatt_widget.json", json, .cutoffDate)$`
- **Última Actualización:** `$wg("file:///sdcard/Download/miatt_widget.json", json, .updatedAt)$$if(wg("file:///sdcard/Download/miatt_widget.json", json, .fromCache), " ☁️", "")$`
