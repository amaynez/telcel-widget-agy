# Especificación del API de Mi Telcel para el Widget de iOS (2026)

Este documento describe la arquitectura actual de autenticación y consumo del portal **Mi Telcel** y cómo utilizar sus endpoints REST/JWT desde el widget de **Scriptable** ([`src/MiTelcelWidget.js`](file:///Users/armandomaynez/Code/Repos/telcel-widget-agy/src/MiTelcelWidget.js)) o desde una extensión nativa **SwiftUI / WidgetKit** para obtener:
- **Datos del Plan Base** (`Datos de mi plan`)
- **Datos Promocionales** (`Datos Promocionales`, p. ej. `PROMO 50% DE DATOS 24 MDP`)
- **Total Combinado (Plan + Promo)**, **Consumo Acumulado** y **Datos Disponibles**
- **Días Restantes** y **Siguiente Fecha de Corte / Vigencia** (p. ej. `28 de octubre`)

---

## 1. Flujo General de Autenticación y Consulta (4 Pasos)

La arquitectura web actual de Mi Telcel separa el inicio de sesión SSO, la emisión de tokens de microservicios y la consulta del árbol de componentes de la pantalla de inicio (*Wave B2F*):

```mermaid
sequenceDiagram
    participant W as iOS Widget (Scriptable / SwiftUI)
    participant SSO as WebLogin SSO (wbl.telcel-id.com:8443)
    participant SEC as Security API (mi-telcel.smapps.mx)
    participant B2F as Wave B2F Home (api.journeys.telcel.wavebybemobi.com)
    participant REV as SSO Revoke (dev.smapps.mx:9000)

    W->>SSO: 1. POST /login (username, telcel-pass, pB64)
    SSO-->>W: 302 Redirect -> GET /Auth -> 200 JSON { "token": "<sso_token>" }
    W->>SEC: 2. GET /security/1.0.0/v2/token?user={phone}&token={sso_token}
    SEC-->>W: 200 JSON { tokenResponse: { tokens: [token:mit, token:b2f] } }
    W->>B2F: 3. GET /api/components/flow/home?externalCode=52{phone} (Bearer token:b2f)
    B2F-->>W: 200 JSON { blocks: ... } (Plan Base + Promo + Vigencia)
    W->>REV: 4. POST /sso/revoke (token={sso_token}&token_type=revoke)
    REV-->>W: 200 OK (Sesión liberada)
```

---

## 2. Detalle de Endpoints Necesarios para el Widget

### Paso 1: Inicio de Sesión SSO (`wbl.telcel-id.com:8443`)

Autentica el número a 10 dígitos y la contraseña. El servidor responde con un `302 Found` hacia `/Auth?username=52...&password=...` que al seguirse (`curl -L` o `URLSession` / `Request` de Scriptable automáticamente) devuelve un objeto JSON con el token SSO.

- **Método y URL:** `POST https://wbl.telcel-id.com:8443/login`
- **Headers requeridos:**
  - `Origin: https://wbl.telcel-id.com:8443`
  - `Referer: https://wbl.telcel-id.com:8443/login?sitedomain=https://www.mitelcel.com&CCode=52&Type=MSISDN&Invocation=iFrame`
  - `Content-Type: application/x-www-form-urlencoded; charset=UTF-8`
  - `X-Requested-With: XMLHttpRequest`
- **Body (`application/x-www-form-urlencoded`):**
  | Parámetro | Valor | Descripción |
  | :--- | :--- | :--- |
  | `username` | `<10_digitos>` | Número Telcel a 10 dígitos |
  | `telcel-pass` | `<password>` | Contraseña en texto plano |
  | `pB64` | `<base64(password_sin_espacios)>` | Contraseña sin espacios codificada en Base64 |
  | `MSISDN` | `<10_digitos>` | Número Telcel a 10 dígitos |
  | `sitedomain` | `https://www.mitelcel.com` | Dominio origen del portal |
  | `CCode` | `52` | Código de país (México) |
  | `Type` | `MSISDN` | Tipo de credencial |
  | `Invocation` | `iFrame` | Modo de invocación |
  | `Source` | `""` | Vacío |
  | `url` | `https://wbl.telcel-id.com:8443` | URL base del servicio WebLogin |

- **Respuesta Exitosa (`200 OK` tras redirección `302`):**
  ```json
  {
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI...",
    "loginname": "525512345678"
  }
  ```
- **Fallback OIDC (`www.mitelcel.com/oid-authorize-prod`) cuando F5 Bot Defense devuelve cuerpo vacío en `8443`:**
  1. `GET https://www.mitelcel.com/oid-authorize-prod/authorize?client_id=31f419f6-5446-4e7e-a275-daf60f568698&response_type=code&scope=openid&redirect_uri=https%3A%2F%2Fmtl.smapps.mx%3A1333%2Fsso%2Fcallback&acr_values=1&state=M1T3c3L&nonce=MiTelcel7007` con headers `USERNAME: 52<10_digitos>` y `PASSWORD: <password>` $\rightarrow$ extrae `code` del header `x-oidc-redirect-location` (o `location`).
  2. `POST https://www.mitelcel.com/oid-authorize-prod/token` (`grant_type=authorization_code&redirect_uri=...&client_id=...&code=...`) $\rightarrow$ `{ "access_token": "<sso_token>" }`.

---

### Paso 2: Intercambio de Tokens (`mi-telcel.smapps.mx`)

Intercambia el `sso_token` por dos tokens JWT específicos de plataforma:
- `token:mit`: para microservicios administrativos en `mi-telcel.smapps.mx`.
- `token:b2f`: para el motor de bloques de inicio en `api.journeys.telcel.wavebybemobi.com`.

- **Método y URL:**
  `GET https://mi-telcel.smapps.mx/security/1.0.0/v2/token?user={10_digitos}&token={sso_token}`
- **Headers requeridos:**
  - `Authorization: Basic $MTL_BASIC` *(Obtenido dinámicamente del JS de la SPA)*
  - `scope: token:mit|token:b2f`
  - `Accept: application/json`
  - `Content-Type: application/json`
  - `App-Version: 0.14`
  - `Code-Version: 38`
  - `Device-Id: DSK`
  - `tipoRequest: 1`
  - `Os: WEB`
  - `Os-Version: 13`
  - `X-Channel: web-browser`
  - `User-Agent: ktor-client`
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "code": "200.0",
    "message": "Success",
    "tokenResponse": {
      "tokens": [
        { "id": "token:mit", "access_token": "<MTL_TOKEN>" },
        { "id": "token:b2f", "access_token": "<B2F_TOKEN>" }
      ]
    }
  }
  ```

---

### Paso 3: Consulta de Consumo, Promociones y Vigencia (`Wave B2F Home Flow`)

Con un solo `GET` usando `<B2F_TOKEN>`, este endpoint devuelve toda la información de la pantalla principal de Mi Telcel, incluyendo **todas las bolsas de datos** (Plan Base + Datos Promocionales), los **días restantes** y la **siguiente fecha de corte/vigencia**.

- **Método y URL:**
  `GET https://api.journeys.telcel.wavebybemobi.com/api/components/flow/home?externalCode=52{10_digitos}`
- **Headers requeridos:**
  - `Authorization: Bearer <B2F_TOKEN>`
  - `Accept: application/json`
  - `Content-Type: application/json`
  - `X-Is-iPad: false`
  - `x-wave-sdk: WEB`
  - `x-wave-device: iPhone` (o `Desktop`)
  - `x-wave-device-type: mobile` (o `browser`)
  - `x-wave-os: iOS-web` (o `macos-web`)
  - `x-wave-os-version: 18.0`

#### Mapa de Bloques (`id`) en la Respuesta JSON de `/api/components/flow/home`

El JSON devuelto contiene un árbol recursivo bajo `.blocks.children`. Cada nodo tiene la forma `{ "id": "<identificador>", "type": "...", "config": { ... }, "children": [ ... ] }`. Al indexar todos los nodos por su `id`, se obtienen directamente todas las métricas necesarias para el widget:

| Dato para el Widget | ID del Bloque (`node.id`) | Propiedad en `node.config` | Ejemplo Real en Línea |
| :--- | :--- | :--- | :--- |
| **Nombre del Plan** | `text-plan-name` / `plan-details-name` | `.value` | `"Telcel Libre 4"` |
| **Siguiente Fecha de Corte / Vigencia** | `plan-details-row-template-col-2-0-0` | `.value` | `"28 de octubre"` |
| **Días Restantes para el Corte** | `tabs-plans-v2-limited-cutoff-message-0-0-0` | `.segments[].text` | `["Faltan ", "9", " días", " para el próximo corte"]` → `9` |
| **Pestañas Disponibles** | `tabs-plans-v2-tabs-0` | `.options[]` | `t0`: `"Datos de mi plan"`, `t1`: `"Datos Promocionales"` |
| **Bolsa 1 (`0-0-0`): Nombre** | `tabs-plans-v2-plan-name-0-0-0` | `.value` | `"Datos de mi plan"` |
| **Bolsa 1 (`0-0-0`): Total Incluido** | `tabs-plans-v2-total-data-value-0-0-0` + `...-unit-0-0-0` | `.value` | `"10"` + `"GB"` (`10000 MB`) |
| **Bolsa 1 (`0-0-0`): Consumido** | `tabs-plans-v2-used-data-value-0-0-0` + `...-unit-0-0-0` | `.value` | `"9.5"` + `"GB"` (`9500 MB`) |
| **Bolsa 1 (`0-0-0`): Disponible** | `tabs-plans-v2-available-data-value-0-0-0` + `...-unit-0-0-0` | `.value` | `"474"` + `"MB"` (`474 MB`) |
| **Bolsa 1 (`0-0-0`): KB Exactos** | `tabs-plans-v2-usage-chart-0-0-0` | `.data[]` (`key: "used" \| "available"`) | `used: 10000485` KB, `available: 485275` KB |
| **Bolsa 2 (`0-1-0`): Nombre Promo** | `tabs-plans-v2-plan-name-0-1-0` | `.value` | `"PROMO 50% DE DATOS 24 MDP"` |
| **Bolsa 2 (`0-1-0`): Total Promo** | `tabs-plans-v2-total-data-value-0-1-0` + `...-unit-0-1-0` | `.value` | `"5"` + `"GB"` (`5000 MB`) |
| **Bolsa 2 (`0-1-0`): Usado Promo** | `tabs-plans-v2-used-data-value-0-1-0` + `...-unit-0-1-0` | `.value` | `"0"` + `"MB"` (`0 MB`) |
| **Bolsa 2 (`0-1-0`): Disponible Promo** | `tabs-plans-v2-available-data-value-0-1-0` + `...-unit-0-1-0` | `.value` | `"5"` + `"GB"` (`5000 MB`) |
| **Bolsa 2 (`0-1-0`): KB Exactos Promo** | `tabs-plans-v2-usage-chart-0-1-0` | `.data[]` (`key: "used" \| "available"`) | `used: 0` KB, `available: 5242880` KB |

> **Regla de Agregación (Plan + Promo y Cambio de Plan):**
> Para obtener el total combinado en el widget, se buscan todos los sufijos `X-Y-Z` que coincidan con `^tabs-plans-v2-plan-name-(\d+-\d+-\d+)$` (por ejemplo `0-0-0` y `0-1-0`) y se suman sus valores en MB. Si el usuario cambia de plan a mitad de ciclo (más o menos GB), Telcel mantiene la bolsa promocional del plan anterior con `0 MB` disponibles junto al plan activo; por ello, cuando existe saldo disponible en alguna bolsa, se descartan las bolsas promocionales (`índice > 0`) con `availableMB <= 0`:
> - $\text{Total MB} = 10,000 + 5,000 = 15,000\text{ MB}$ (`15.0 GB`)
> - $\text{Consumido MB} = 9,500 + 0 = 9,500\text{ MB}$ (`9.50 GB`)
> - $\text{Disponible MB} = 474 + 5,000 = 5,474\text{ MB}$ (`5.47 GB`)

---

### Paso 4: Cierre de Sesión / Revocación SSO (`dev.smapps.mx:9000`)

Revoca el token SSO inmediatamente después de actualizar el widget para evitar bloqueos por sesiones concurrentes.

- **Método y URL:** `POST https://dev.smapps.mx:9000/sso/revoke`
- **Headers:** `Content-Type: application/x-www-form-urlencoded`, `Accept: application/json`
- **Body:** `token={sso_token}&token_type=revoke`

---

## 3. Endpoints Complementarios (`mi-telcel.smapps.mx` con `MTL_TOKEN`)

Si en el futuro se desea consultar información adicional fuera del Home Flow, estos endpoints aceptan `Authorization: Basic $MTL_BASIC` y `Token: <MTL_TOKEN>`:

1. **Validación de Perfil y Cuenta (`POST /users/1.0.0/v2/info/validate`):**
   - Body: `{"user": "<10_digitos>"}`
   - Devuelve `validateUserInfoResponse.line` con `profile` (`MASIVO`), `region` (`9`), `account`, `cutoffDate` (`YYYY-MM-DD`) y `fecha_forzoso`.
2. **Detalle de Mi Plan (`GET /users/1.0.0/miPlan?user={phone}&profile={profile}&region={region}`):**
   - Devuelve `miPlanResponse.planInfo.planDetails` con `"Plan:": "TELCEL LIBRE 4"` y `"Fecha de corte:": "28 de octubre de 2026"`, además de `planIncluded`.
3. **Paquetes Activos (`GET /packages/1.0.0/v2/active/list?user={phone}&profile={profile}&region={region}&isSuspended=false`):**
   - Devuelve las secciones de paquetes adicionales o recargas activas (`listActivePackagesResponse`).
4. **Historial de Consumo Mensual (`GET /users/1.0.0/consumption/v2/details?user={phone}&profile={profile}&region={region}&typeRequest=getModule&account={account}`):**
   - Devuelve los meses disponibles para descarga de estado de cuenta (`userConsumptionDetailsResponse.mainModule.months`).
