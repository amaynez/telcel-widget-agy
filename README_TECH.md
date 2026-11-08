# Widgets de Consumo Móvil para iOS y Android (Telcel, Bait, Movistar y AT&T)

Widgets para iOS y Android que consultan y muestran los **GB disponibles combinados (Plan Base + Datos Promocionales)**, el **consumo acumulado**, los **días restantes** y la **siguiente fecha de corte/vigencia** de tu línea **Mi Telcel**, **Mi Bait**, **Mi Movistar** o **Mi AT&T**.

<p align="center">
  <img src="assets/widget_preview.png" alt="Mi Telcel Widget Preview" width="280">
</p>

---

## System Overview

Multi-platform mobile data consumption widgets for Mexican carriers (**Telcel**, **Bait**, **Movistar**, and **AT&T**) across three execution targets:
1. **iOS Scriptable (`./src`)**: Autonomous JavaScript widgets with interactive credential validation, iOS Keychain storage, local JSON caching, and CommonJS exports for CLI/test reuse.
2. **iOS Native WidgetKit & SwiftUI (`./MiTelcelApp`, `./MiTelcelWidget`)**: Native iOS 17+ container app and WidgetKit extension backed by `TelcelNetworkService` actor, `AppIntentConfiguration`, Keychain (`mx.mitelcel.widget`), and App Group cache (`group.mx.mitelcel.widget`).
3. **Android Termux / KWGT (`./android`)**: Node.js CLI wrappers and `~/.shortcuts` launchers that import the `./src` carrier clients and output JSON files for KWGT and text summaries for Termux:Widget.

## Subdirectories & System Boundaries

- **src**: [`./src/README.md`](./src/README.md) - Autonomous iOS Scriptable widgets (`MiTelcelWidget.js`, `MiBaitWidget.js`, `MiMovistarWidget.js`, `MiATTWidget.js`) and Keychain reset utility (`ResetearPassword.js`).
- **MiTelcelWidget**: [`./MiTelcelWidget/README.md`](./MiTelcelWidget/README.md) - Native iOS 17+ WidgetKit extension (`MiTelcelUsageWidget`, `MiTelcelTimelineProvider`, `RefreshTelcelUsageIntent`) and shared `TelcelNetworkService` actor / `MiTelcelWidgetCardContent` view.
- **MiTelcelApp**: [`./MiTelcelApp/README.md`](./MiTelcelApp/README.md) - Native SwiftUI companion app (`MiTelcelApp`, `ContentView`) for managing carrier credentials and previewing widget states.
- **android**: [`./android/README.md`](./android/README.md) - Node.js CLI scripts (`mitelcel_widget.mjs`, `mibait_widget.mjs`, `mimovistar_widget.mjs`, `miatt_widget.mjs`) and shell launchers (`shortcuts_*.sh`) for Termux:Widget and KWGT.
- **telcel-api-probe**: [`./.agents/skills/telcel-api-probe/SKILL.md`](./.agents/skills/telcel-api-probe/SKILL.md) - Live Telcel WebLogin SSO + Wave B2F API probe and schema analyzer skill.

## Global Invariants

- **Mandatory Telcel SSO Revocation**: Every Telcel authentication flow (standard WebLogin 8443 and OIDC fallback via `https://www.mitelcel.com/oid-authorize-prod`) across `./src`, `./MiTelcelWidget`, and `./.agents/skills/telcel-api-probe` MUST revoke the SSO token (`POST https://dev.smapps.mx:9000/sso/revoke`) inside a `finally` / `defer` / `trap` block to prevent concurrent session lockouts.
- **Mid-Cycle Plan Change & Promo Filtering**: When upgrading or downgrading a plan mid-cycle, Telcel leaves deactivated promotional buckets from the previous plan with `0 MB` available. Both JS (`src/MiTelcelWidget.js`) and Swift (`MiTelcelWidget/TelcelNetworkService.swift`) identify base buckets via `/^(web-)?0-0-0$/` and filter out zero-available promo buckets ONLY when multiple promotional buckets exist and at least one has active data (`hasActivePromo`), preserving legitimately exhausted promotional buckets in normal billing cycles and 100% consumed plans.
- **Pre-Persistence Credential Validation**: Carrier credentials and session tokens (`TELCEL_PHONE`/`TELCEL_PASS`, `BAIT_PHONE`, `MOVISTAR_PID`/`MOVISTAR_GUARD_KEY`, `ATT_PHONE`/`ATT_PASS`) are never persisted to Keychain until upstream authentication or consumption verification succeeds.
- **Commercial vs. Binary Unit Parity**: Telcel uses `1 GB = 1000 MB` for commercial GB labels and `1 MB = 1024 KB` for fallback chart data across `./src`, `./MiTelcelWidget`, and `./android`. Bait, Movistar, and AT&T use binary `1 GB = 1024 MB` across all platforms.
- **Offline Cache & Cutoff Recalculation**: Cached payloads for Bait, Movistar, and AT&T in `./src` and `./android` persist `cutoffISO` (`YYYY-MM-DD`) and recalculate `daysLeft` against the current date when loaded offline, whereas `./MiTelcelWidget` enforces cache freshness via `maxAge` expiration.

## Global Side Effects

- **Direct Carrier Network I/O**: Performs HTTPS requests directly to official carrier endpoints (`wbl.telcel-id.com:8443`, `www.mitelcel.com/oid-authorize-prod`, `mi-telcel.smapps.mx`, `api.journeys.telcel.wavebybemobi.com`, `dev.smapps.mx:9000`, `mibait.com`, `mi.movistar.com.mx`, `miattweb.att.com.mx`).
- **Device Keychain & App Group Storage**: Reads and mutates credentials in the iOS Keychain (Scriptable `Keychain` and native `kSecClassGenericPassword` under service `mx.mitelcel.widget` with `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`) and non-secret metadata/caches in `UserDefaults(suiteName: "group.mx.mitelcel.widget")`, `FileManager.local().documentsDirectory()`, or `/sdcard/Download/*_widget.json`.

## System Verification

- Run: `node tests/test_parser.mjs`
- Run: `node tests/test_att.mjs`
- Run: `xcodebuild -project MiTelcelWidget.xcodeproj -scheme MiTelcelApp -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build`

---

## Características

- **Soporte multi-operador (Scriptable):** Scripts autónomos en [`src/MiTelcelWidget.js`](src/MiTelcelWidget.js) (**Telcel**), [`src/MiBaitWidget.js`](src/MiBaitWidget.js) (**Bait**, consulta directa sin contraseña), [`src/MiMovistarWidget.js`](src/MiMovistarWidget.js) (**Movistar**, login interactivo con WebView por reCAPTCHA v3 y desencriptado AES-256-GCM) y [`src/MiATTWidget.js`](src/MiATTWidget.js) (**AT&T**, autenticación con cifrado CryptoJS AES-256-CBC).
- **Validación interactiva de credenciales:** Valida tus credenciales en vivo contra la API del operador antes de guardarlas en el Keychain; detecta errores de captura y problemas de conectividad con reintento guiado.
- **Agregación inteligente y cambios de plan:** Suma los datos del Plan Base y los Datos Promocionales/Bonos vigentes. Al cambiar de plan mid-cycle, descarta bolsas promocionales obsoletas (`0 MB` disponibles) si existe otra promo activa, preservando siempre promociones agotadas legítimas y planes 100% consumidos.
- **Resiliencia ante F5 Bot Defense (Fallback OIDC):** Conmuta automáticamente al flujo OIDC (`www.mitelcel.com/oid-authorize-prod`) si WebLogin 8443 es bloqueado por F5 Volterra (`volt-adc`).
- **Fecha de corte y vigencia:** Muestra los días restantes y la fecha de corte o vigencia reportada por el operador (recalculada dinámicamente desde `cutoffISO` al leer desde caché en Scriptable y Android).
- **Medidor semicircular y presupuesto diario:** Arco bicolor (rojo gastado vs. verde disponible), porcentaje usado (`%`) y cálculo de ritmo diario disponible (`MB/d` o `GB/d`).
- **Almacenamiento seguro:** Las credenciales y tokens nunca se guardan en texto plano; se almacenan en el **Keychain de iOS** aislados por dispositivo.
- **Caché local y desconexión segura:** Guarda la última consulta en caché para respaldo sin conexión y revoca el token SSO de Telcel al terminar para evitar bloqueos por sesiones concurrentes.
- **Recuperación táctil de errores:** Estado visual con icono de advertencia (`⚠️`) y mensaje descriptivo ante fallos de conexión o sesión expirada; tocar el widget ejecuta el enlace `scriptable:///run` para abrir el script en Scriptable.
- **Tres métodos de uso:**
  1. **Scriptable (iOS):** Ejecución directa desde el iPhone sin Mac ni Xcode.
  2. **Nativo WidgetKit / SwiftUI (iOS 17+):** Proyecto Xcode completo con app contenedora y extensión de widget.
  3. **Android (Termux:Widget / KWGT):** Scripts CLI en Node.js y lanzadores `~/.shortcuts` que exportan JSON para KWGT y resumen en consola.

---

## Método 1: Instalación vía Scriptable (Recomendado, Sin Mac)

Instala y ejecuta el widget en tu iPhone directamente sin necesidad de cuenta de desarrollador ni computadora.

### 1. Instalar Scriptable
Descarga la app gratuita **[Scriptable](https://apps.apple.com/app/scriptable/id1405459188)** desde la App Store en tu iPhone.

### 2. Copiar el código del Widget
1. Según tu operador, abre el archivo correspondiente en este repositorio:
   - **Telcel:** [`src/MiTelcelWidget.js`](src/MiTelcelWidget.js)
   - **Bait:** [`src/MiBaitWidget.js`](src/MiBaitWidget.js)
   - **Movistar:** [`src/MiMovistarWidget.js`](src/MiMovistarWidget.js)
   - **AT&T:** [`src/MiATTWidget.js`](src/MiATTWidget.js)
2. Copia todo su contenido al portapapeles de tu iPhone (puedes usar el Portapapeles Universal de Apple, AirDrop, o enviártelo por mensaje).

### 3. Crear el script en Scriptable
1. Abre **Scriptable** en tu iPhone.
2. Pulsa el botón **`+`** en la esquina superior derecha para crear un nuevo script.
3. Toca el título en la parte superior (dice *Untitled Script*) y cámbialo a **`MiTelcel`**, **`MiBait`**, **`MiMovistar`** o **`MiATT`**.
4. Pega el código copiado dentro del editor.
5. Pulsa **Done** en la esquina superior izquierda.

### 4. Configurar tus datos por primera vez
1. Abre nuevamente el script (**MiTelcel**, **MiBait**, **MiMovistar** o **MiATT**) dentro de Scriptable.
2. Pulsa el botón **Play (▶)** en la esquina inferior derecha.
3. Se iniciará la configuración guiada con **validación previa en vivo**:
   - **En Mi Telcel:** Ingresa tu **número a 10 dígitos** y tu **contraseña de Mi Telcel**. El script valida la autenticación ante el servicio SSO oficial (y revoca de inmediato el token de prueba) antes de guardar los datos en Keychain.
   - **En Mi Bait:** Ingresa únicamente tu **número Bait a 10 dígitos** (no requiere contraseña). Se verifica la línea contra el API de Altán antes de guardarla.
   - **En Mi Movistar:** Se abrirá una ventana de navegador (WebView) en `mi.movistar.com.mx/login`. Inicia sesión normalmente para superar el reCAPTCHA v3; el widget capturará el token `p_id` (`ec_auth`), validará el acceso al consumo con su llave `guardKey` y lo guardará en el Keychain para las siguientes actualizaciones en segundo plano.
   - **En Mi AT&T:** Ingresa tu **número a 10 dígitos** y tu **contraseña de Mi AT&T**. El script valida tus credenciales contra `miattweb.att.com.mx` antes de guardarlas en el Keychain.
4. Si ingresaste un dato incorrecto o hay una falla de red, el script te avisará de inmediato y te permitirá reintentar sin guardar credenciales inválidas.
5. Tras la validación, el script ejecutará la consulta y mostrará la vista previa del widget. Pulsa **Done**.

### 5. Agregar el Widget a tu Pantalla de Inicio
1. Ve a la pantalla de inicio de tu iPhone.
2. Mantén presionada cualquier área vacía hasta que los íconos comiencen a temblar.
3. Toca el botón **`+`** en la esquina superior izquierda.
4. Busca y selecciona **Scriptable**.
5. Elige el tamaño **Pequeño (Small)** y toca **Agregar widget**.
6. Mientras los íconos sigan temblando, toca el widget recién agregado (o mantenlo presionado y selecciona **Editar widget**).
7. En el campo **Script**, selecciona **`MiTelcel`**, **`MiBait`**, **`MiMovistar`** o **`MiATT`**.
8. En **When Interacting** (Al interactuar), selecciona **Run Script** (Ejecutar script).
9. Toca fuera del widget para guardar. El widget se actualizará periódicamente.

> [!TIP]
> Si el widget alguna vez pierde conexión o requiere renovar sesión (por ejemplo en Movistar), mostrará un estado de advertencia (`⚠️`) y al tocarlo abrirá el script en Scriptable (`scriptable:///run`) para reautenticar o reintentar la consulta.

### 6. ¿Cómo actualizar desde una versión anterior?
Si ya tenías una versión previa del script instalada:
1. Copia el nuevo código del script correspondiente desde [`src/`](src/).
2. En Scriptable, abre tu script existente (`MiTelcel`, `MiBait`, etc.), selecciona todo el código anterior y reemplázalo por el nuevo.
3. > [!IMPORTANT]
   > **Paso indispensable:** Pulsa el botón **Play (▶)** abajo a la derecha para ejecutar el script dentro de la app por lo menos una vez. Esto regenera la caché local y revalida las credenciales. Si omites este paso, el widget en la pantalla de inicio se mostrará como un **recuadro blanco** debido a que iOS impide ejecutar flujos interactivos o de primera carga en segundo plano.
4. Pulsa **Done** y el widget en tu pantalla de inicio se actualizará en unos segundos.

### 7. Restablecer credenciales o cambiar de línea (Resetear contraseña)
Gracias a la validación previa en vivo, el widget evita guardar credenciales o números inválidos durante la configuración inicial. Si cambiaste tu contraseña en el portal de la operadora, cambiaste de número o deseas registrar otra cuenta:
1. Crea un nuevo script en Scriptable y nómbralo **`ResetearPassword`** (o **`resetear password`**).
2. Pega el código de [`src/ResetearPassword.js`](src/ResetearPassword.js).
3. Ejecútalo pulsando **Play (▶)** y elige el operador a restablecer (o **Todos**):
   - **Mi Telcel:** borra `TELCEL_PHONE` y `TELCEL_PASS`.
   - **Mi Bait:** borra `BAIT_PHONE`.
   - **Mi Movistar:** borra el token de sesión `MOVISTAR_PID` y su llave `MOVISTAR_GUARD_KEY`.
   - **Mi AT&T:** borra `ATT_PHONE` y `ATT_PASS`.
4. Vuelve a abrir el script del operador (**`MiTelcel`**, **`MiBait`**, **`MiMovistar`** o **`MiATT`**) y pulsa **Play (▶)** para ingresar tus nuevos datos (en Movistar se abrirá otra vez el login en WebView).

---

## Método 2: Compilación Nativa en Xcode (`WidgetKit` / SwiftUI)

Para usuarios con Mac y Xcode que deseen compilar la app y extensión nativa:

1. Abre `MiTelcelWidget.xcodeproj` en **Xcode 15+ / 16+**.
2. En la pestaña **Signing & Capabilities** de los targets `MiTelcelApp` y `MiTelcelWidgetExtension`, selecciona tu equipo (*Personal Team* o *Apple Developer Program*) y ajusta el `Bundle Identifier` si es necesario.
3. Conecta tu iPhone, habilita el **Modo de desarrollador** en *Ajustes > Privacidad y seguridad*.
4. Compila y ejecuta el esquema `MiTelcelApp` (`Cmd + R`).
5. Abre la app en el iPhone, selecciona tu operador (**Telcel**, **Bait**, **AT&T** o **Movistar**), ingresa los datos solicitados (número a 10 dígitos y contraseña en Telcel/AT&T, solo número a 10 dígitos en Bait, o token de sesión activo `p_id` / `ec_auth` en Movistar) y pulsa **Actualizar Consumo Ahora**.
6. Añade el widget nativo **MiTelcelWidget** desde el menú de widgets de iOS.

---

## Método 3: Prototipo para Android (Termux:Widget / KWGT)

> [!WARNING]
> **Nota:** **Los scripts de Android no han sido probados en un teléfono físico real**. Reutilizan los mismos parsers y flujos de red de iOS (`src/MiTelcelWidget.js`, `src/MiBaitWidget.js`, `src/MiMovistarWidget.js` y `src/MiATTWidget.js`) y se incluyen como referencia experimental.

1. Instala **Termux** y **Termux:Widget** desde **F-Droid**, luego instala Node.js y Git:
   ```sh
   pkg update && pkg install -y nodejs git
   termux-setup-storage
   ```
2. Clona este repositorio en Termux y configura tu archivo `.env` (credenciales para Telcel, Bait, Movistar y/o AT&T):
   ```sh
   cp .env.example .env
   nano .env
   ```
3. Copia los lanzadores que necesites a `~/.shortcuts/` para usar con **Termux:Widget** (`MiTelcel`, `MiBait`, `MiMovistar`, `MiATT`), o lee los archivos JSON correspondientes generados en `/sdcard/Download/` (`mitelcel_widget.json`, `mibait_widget.json`, `mimovistar_widget.json`, `miatt_widget.json`) desde **KWGT**.
4. Consulta la guía completa de configuración y fórmulas KWGT en [`android/README.md`](android/README.md).

---

## Pruebas y Validación desde Terminal (macOS)

### 1. Suite de Pruebas Automatizadas (Offline / Mocks)
Valida todos los parsers JS (Telcel, Bait, Movistar con descifrado AES-256-GCM simulado y AT&T con doble cifrado AES-256-CBC), validación interactiva de credenciales y red, renderizado `DrawContext`, resumen Android y parser nativo Swift:
```sh
node tests/test_parser.mjs
node tests/test_att.mjs
```

### 2. Validación de Endpoints en Vivo con Telcel
Puedes probar las llamadas reales y verificar el formato devuelto por Mi Telcel usando el script automatizado:

1. Copia `.env.example` a `.env` y configura tus credenciales:
   ```zsh
   cp .env.example .env
   ```
2. Ejecuta el probe seguro (revoca la sesión SSO al terminar):
   ```zsh
   zsh .agents/skills/telcel-api-probe/scripts/probe_telcel.sh
   ```
3. El reporte con el desglose de bolsas se guardará en `artifacts/probe_report.txt`.

---

## Estructura del Repositorio

```text
.
├── assets/
│   └── widget_preview.png          # Captura del widget en pantalla de inicio
├── src/
│   ├── MiTelcelWidget.js           # Widget autónomo Mi Telcel para Scriptable (iOS)
│   ├── MiBaitWidget.js             # Widget autónomo Mi Bait para Scriptable (iOS)
│   ├── MiMovistarWidget.js         # Widget autónomo Mi Movistar para Scriptable (iOS)
│   ├── MiATTWidget.js              # Widget autónomo Mi AT&T para Scriptable (iOS)
│   ├── ResetearPassword.js         # Script para limpiar credenciales de operadores en Keychain
│   └── README.md                   # Contrato de interfaz e invariantes de módulos Scriptable
├── tests/
│   ├── test_parser.mjs             # Suite de pruebas unitarias (Telcel, Bait, Movistar, Keychain, UI y Swift)
│   ├── test_att.mjs                # Pruebas criptográficas y parser de Mi AT&T
│   └── test_performance.mjs        # Benchmark de rendimiento para parseo de respuestas
├── android/
│   ├── mitelcel_widget.mjs         # Prototipo Node.js para Mi Telcel (Termux / KWGT)
│   ├── mibait_widget.mjs           # Prototipo Node.js para Mi Bait (Termux / KWGT)
│   ├── mimovistar_widget.mjs       # Prototipo Node.js para Mi Movistar (Termux / KWGT)
│   ├── miatt_widget.mjs            # Prototipo Node.js para Mi AT&T (Termux / KWGT)
│   ├── shortcuts_mitelcel.sh       # Lanzador Telcel para Termux:Widget (~/.shortcuts)
│   ├── shortcuts_mibait.sh         # Lanzador Bait para Termux:Widget (~/.shortcuts)
│   ├── shortcuts_mimovistar.sh     # Lanzador Movistar para Termux:Widget (~/.shortcuts)
│   ├── shortcuts_miatt.sh          # Lanzador AT&T para Termux:Widget (~/.shortcuts)
│   └── README.md                   # Guía de configuración y fórmulas KWGT en Android
├── MiTelcelApp/
│   ├── MiTelcelApp.swift           # App contenedora iOS (SwiftUI)
│   └── README.md                   # Contrato de interfaz de la app contenedora iOS
├── MiTelcelWidget/
│   ├── TelcelNetworkService.swift  # Servicio multi-operador (Telcel, Bait, Movistar, AT&T) y vista compartida
│   ├── MiTelcelWidget.swift        # Extensión WidgetKit y TimelineProvider
│   ├── Info.plist                  # Configuración de extensión WidgetKit
│   └── README.md                   # Contrato de interfaz de la extensión WidgetKit y servicio de red
├── MiTelcelWidget.xcodeproj/       # Proyecto Xcode (iOS 17+)
├── .agents/skills/telcel-api-probe/
│   ├── SKILL.md                    # Skill para pruebas de API Telcel
│   └── scripts/probe_telcel.sh     # CLI de autenticación y extracción de esquema
├── Telcel Widget API.md            # Especificación técnica del API Wave B2F (Telcel)
├── Mexican Carriers Widget API.md  # Especificación de APIs para Bait, AT&T y Movistar
├── API Validation.md               # Guía de validación manual con curl
├── Research.md                     # Bitácora técnica y arquitectura de endpoints
├── README.md                       # Guía principal de instalación para usuarios
└── README_TECH.md                  # Blueprint técnico de arquitectura e invariantes (EGM)
```

---

## Seguridad y Privacidad

- **Sin servidores intermediarios:** Las peticiones viajan directamente desde el dispositivo a los servidores oficiales de cada operador:
  - **Telcel:** `wbl.telcel-id.com:8443`, `mi-telcel.smapps.mx`, `api.journeys.telcel.wavebybemobi.com` y `dev.smapps.mx:9000`.
  - **Bait:** `mibait.com` (consulta directa por número a través del proxy Ordenaris/Altán, sin contraseña).
  - **Movistar:** `mi.movistar.com.mx` (login interactivo en WebView y consulta de consumos cifrados con AES-256-GCM).
  - **AT&T:** `miattweb.att.com.mx` (autenticación y consulta de balances con doble cifrado AES-256-CBC y cookie de sesión `crypto.sid`).
- **Validación previa:** Credenciales y tokens se verifican directamente contra los servidores del operador antes de persistirse en el dispositivo.
- **Keychain de iOS:** Contraseñas, números y tokens (`TELCEL_PHONE`/`TELCEL_PASS`, `BAIT_PHONE`, `MOVISTAR_PID`/`MOVISTAR_GUARD_KEY`, `ATT_PHONE`/`ATT_PASS`) se almacenan mediante el subsistema de seguridad de iOS (`Keychain`) con protección por dispositivo (`kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`), nunca en texto plano en el código.
- **Descubrimiento dinámico de llaves con respaldo auditado:** Las llaves públicas de cliente/servicio —`MTL_AUTHORIZATION_BASIC` (credencial Basic Auth de cliente para intercambio de token JWT en Telcel), `x-ord-service` (cabecera de servicio del API de consumo en Bait), `guardKey` (llave simétrica de 32 caracteres para descifrado AES-256-GCM en Movistar) y `<meta name="__sk">` (llave de sesión por petición para cifrado AES-256-CBC en AT&T)— se extraen dinámicamente de los portales web oficiales. Cuando una llave de cliente cuenta con un valor de respaldo estático público en el código, se documenta con el marcador de auditoría `Sec-Safe` (llave pública de cliente intencional, no secreto privado) y emite advertencia en consola si se utiliza el fallback.
- **Revocación y ciclo de vida de sesión:** Cada consulta de Telcel (incluyendo la validación inicial de credenciales) revoca el token SSO generado (`/sso/revoke`) en un bloque `finally` / `defer` / `trap`, evitando bloqueos por sesiones simultáneas. Bait no abre sesión; Movistar reutiliza el token `p_id` guardado hasta su expiración; AT&T negocia una llave de sesión efímera `__sk` en cada consulta.
