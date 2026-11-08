#!/usr/bin/env zsh
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"
COOKIE_JAR="$PROJECT_ROOT/cookies.txt"
ARTIFACTS_DIR="$PROJECT_ROOT/artifacts"
REPORT_FILE="$ARTIFACTS_DIR/probe_report.txt"

mkdir -p "$ARTIFACTS_DIR"

UA="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"

# Obtener token MTL_BASIC de forma dinámica
HTML_CONTENT=$(curl -s "https://www.mitelcel.com/mitelcel/login")
JS_PATH=$(echo "$HTML_CONTENT" | grep -o 'src="/assets/index-[^"]*\.js"' | sed 's/src="//;s/"//')
if [ -z "$JS_PATH" ]; then
    echo "❌ Error: No se pudo encontrar el archivo JS principal."
    exit 1
fi
JS_CONTENT=$(curl -s "https://www.mitelcel.com$JS_PATH")
MTL_BASIC=$(echo "$JS_CONTENT" | grep -o 'MTL_AUTHORIZATION_BASIC:"[^"]*"' | sed 's/MTL_AUTHORIZATION_BASIC:"//;s/"//')
if [ -z "$MTL_BASIC" ]; then
    echo "❌ Error: No se pudo extraer MTL_AUTHORIZATION_BASIC del JS."
    exit 1
fi

SSO_TOKEN=""
MTL_TOKEN=""
B2F_TOKEN=""

command -v jq >/dev/null 2>&1 || {
  echo "❌ Error: Instala jq (brew install jq) antes de ejecutar el probe."
  exit 1
}

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ Error: No existe el archivo .env en la raíz del proyecto."
  exit 1
fi

while IFS='=' read -r key val || [[ -n "$key" ]]; do
  [[ "$key" =~ ^[[:space:]]*# || -z "${key//[[:space:]]/}" ]] && continue
  key="${key//[[:space:]]/}"
  val="$(printf '%s' "$val" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["'\''“]//' -e 's/["'\''”]$//')"
  typeset -g "$key=$val"
done < "$ENV_FILE"

TELCEL_PHONE="$(printf '%s' "${TELCEL_PHONE:-}" | tr -d '[:space:]\"'\''“”')"
TELCEL_PASS="${TELCEL_PASS:-}"

if [[ "$TELCEL_PHONE" == "5512345678" || "$TELCEL_PHONE" == "5500000000" || "$TELCEL_PASS" == "TU_PASSWORD" || "$TELCEL_PASS" == "tu_password_aqui" || "$TELCEL_PASS" == "TuPasswordAqui" || -z "$TELCEL_PHONE" || -z "$TELCEL_PASS" ]]; then
  echo "⚠️ Acción requerida: Edita el archivo .env con tu número Telcel y contraseña reales antes de ejecutar el probe."
  exit 2
fi

PASS_B64="$(printf '%s' "$TELCEL_PASS" | tr -d '[:space:]' | base64 | tr -d '\r\n')"

# Garantizar revocación de sesión SSO y limpieza de tokens/cookies al salir del script
cleanup() {
  if [[ -n "$SSO_TOKEN" ]]; then
    echo "🔒 Revocando sesión SSO activa en Mi Telcel (/sso/revoke)..."
    curl -s -X POST "https://dev.smapps.mx:9000/sso/revoke" \
      -H "Content-Type: application/x-www-form-urlencoded" \
      -H "Accept: application/json" \
      --data-urlencode "token=$SSO_TOKEN" \
      --data-urlencode "token_type=revoke" > /dev/null || true
  fi
  rm -f "$COOKIE_JAR" "$ARTIFACTS_DIR/login_output.json" "$ARTIFACTS_DIR/token_exchange.json" "$ARTIFACTS_DIR"/.status_*
}
trap cleanup EXIT

echo "=== Reporte de Pruebas API Mi Telcel ($(date)) ===" > "$REPORT_FILE"

# 1. Inicializar cookies del iframe WebLogin y autenticar vía SSO
echo "1. Autenticando en https://wbl.telcel-id.com:8443/login ..."
curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -X GET "https://wbl.telcel-id.com:8443/login?sitedomain=https://www.mitelcel.com&CCode=52&Type=MSISDN&Invocation=iFrame" \
  -H "User-Agent: $UA" > /dev/null || true

HTTP_LOGIN=$(curl -s -L -o "$ARTIFACTS_DIR/login_output.json" -w "%{http_code}" \
  -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  "https://wbl.telcel-id.com:8443/login" \
  -H "Origin: https://wbl.telcel-id.com:8443" \
  -H "Referer: https://wbl.telcel-id.com:8443/login?sitedomain=https://www.mitelcel.com&CCode=52&Type=MSISDN&Invocation=iFrame" \
  -H "Content-Type: application/x-www-form-urlencoded; charset=UTF-8" \
  -H "X-Requested-With: XMLHttpRequest" \
  -H "User-Agent: $UA" \
  --data-urlencode "username=$TELCEL_PHONE" \
  --data-urlencode "telcel-pass=$TELCEL_PASS" \
  --data-urlencode "sitedomain=https://www.mitelcel.com" \
  --data-urlencode "CCode=52" \
  --data-urlencode "Type=MSISDN" \
  --data-urlencode "Invocation=iFrame" \
  --data-urlencode "MSISDN=$TELCEL_PHONE" \
  --data-urlencode "Source=" \
  --data-urlencode "pB64=$PASS_B64" \
  --data-urlencode "url=https://wbl.telcel-id.com:8443")

echo "SSO Login HTTP Status: $HTTP_LOGIN" | tee -a "$REPORT_FILE"

SSO_TOKEN=$(jq -r '.token // empty' "$ARTIFACTS_DIR/login_output.json" 2>/dev/null || true)
LOGIN_ERR=$(jq -r '.error.description // .error // empty' "$ARTIFACTS_DIR/login_output.json" 2>/dev/null || true)

if [[ -z "$SSO_TOKEN" || "$SSO_TOKEN" == "null" ]]; then
  echo "⚠️ WebLogin 8443 sin token (F5 Bot Defense), autenticando vía OIDC (/oid-authorize-prod)..." | tee -a "$REPORT_FILE"
  OIDC_CLIENT_ID="31f419f6-5446-4e7e-a275-daf60f568698"
  OIDC_REDIRECT_URI="https://mtl.smapps.mx:1333/sso/callback"
  AUTH_RESP=$(curl -s -i -G "https://www.mitelcel.com/oid-authorize-prod/authorize" \
    -H "USERNAME: 52$TELCEL_PHONE" \
    -H "PASSWORD: $TELCEL_PASS" \
    -H "Accept: application/json" \
    -H "Accept-Charset: UTF-8" \
    --data-urlencode "client_id=$OIDC_CLIENT_ID" \
    --data-urlencode "response_type=code" \
    --data-urlencode "scope=openid" \
    --data-urlencode "redirect_uri=$OIDC_REDIRECT_URI" \
    --data-urlencode "acr_values=1" \
    --data-urlencode "state=M1T3c3L" \
    --data-urlencode "nonce=MiTelcel7007" || true)
  AUTH_CODE=$(printf '%s' "$AUTH_RESP" | sed -nE 's/.*(^|[?&])code=([^&[:space:]"]+).*/\2/p' | head -n 1)
  if [[ -n "$AUTH_CODE" ]]; then
    HTTP_LOGIN=$(curl -s -o "$ARTIFACTS_DIR/login_output.json" -w "%{http_code}" \
      -X POST "https://www.mitelcel.com/oid-authorize-prod/token" \
      -H "Accept: application/json" \
      -H "Content-Type: application/x-www-form-urlencoded" \
      --data-urlencode "grant_type=authorization_code" \
      --data-urlencode "redirect_uri=$OIDC_REDIRECT_URI" \
      --data-urlencode "client_id=$OIDC_CLIENT_ID" \
      --data-urlencode "code=$AUTH_CODE")
    SSO_TOKEN=$(jq -r '.access_token // .token // empty' "$ARTIFACTS_DIR/login_output.json" 2>/dev/null || true)
    LOGIN_ERR=$(jq -r '.error_description // .error // empty' "$ARTIFACTS_DIR/login_output.json" 2>/dev/null || true)
  fi
fi

if [[ -n "$SSO_TOKEN" && "$SSO_TOKEN" != "null" ]]; then
  echo "✅ Token SSO capturado correctamente." | tee -a "$REPORT_FILE"
else
  echo "❌ No se obtuvo Token SSO (Detalle: ${LOGIN_ERR:-sin detalle})." | tee -a "$REPORT_FILE"
  exit 1
fi

# 2. Intercambio de Token SSO -> Token MTL y Token B2F
MTL_HEADERS=(
  -H "Authorization: Basic $MTL_BASIC"
  -H "Accept: application/json"
  -H "Content-Type: application/json"
  -H "Accept-Charset: UTF-8"
  -H "Code-Version: 38"
  -H "Device-Id: DSK"
  -H "tipoRequest: 1"
  -H "Os: WEB"
  -H "Os-Version: 13"
  -H "X-Channel: web-browser"
  -H "User-Agent: ktor-client"
)

echo "2. Intercambiando token en /security/1.0.0/v2/token ..."
HTTP_TOKEN=$(curl -s -o "$ARTIFACTS_DIR/token_exchange.json" -w "%{http_code}" \
  -X GET "https://mi-telcel.smapps.mx/security/1.0.0/v2/token?user=${TELCEL_PHONE}&token=${SSO_TOKEN}" \
  "${MTL_HEADERS[@]}" -H "App-Version: 0.14" -H "scope: token:mit|token:b2f")

echo "Token Exchange HTTP Status: $HTTP_TOKEN" | tee -a "$REPORT_FILE"

MTL_TOKEN=$(jq -r '.tokenResponse.tokens[]? | select(.id=="token:mit") | .access_token // empty' "$ARTIFACTS_DIR/token_exchange.json" 2>/dev/null || true)
B2F_TOKEN=$(jq -r '.tokenResponse.tokens[]? | select(.id=="token:b2f") | .access_token // empty' "$ARTIFACTS_DIR/token_exchange.json" 2>/dev/null || true)

if [[ -n "$MTL_TOKEN" && -n "$B2F_TOKEN" ]]; then
  echo "✅ Tokens MTL y B2F obtenidos correctamente." | tee -a "$REPORT_FILE"
else
  echo "❌ Falló el intercambio de tokens MTL/B2F." | tee -a "$REPORT_FILE"
  exit 1
fi

# 3. Validar Perfil de Línea (/users/1.0.0/v2/info/validate)
echo "3. Validando perfil de línea en /users/1.0.0/v2/info/validate ..."
HTTP_VALIDATE=$(curl -s -o "$ARTIFACTS_DIR/validate_raw.json" -w "%{http_code}" \
  -X POST "https://mi-telcel.smapps.mx/users/1.0.0/v2/info/validate" \
  "${MTL_HEADERS[@]}" -H "App-Version: 0.14" -H "Token: $MTL_TOKEN" \
  -d "{\"user\":\"$TELCEL_PHONE\"}")

echo "Endpoint Validate Profile HTTP Status: $HTTP_VALIDATE" | tee -a "$REPORT_FILE"

PROFILE=$(jq -r '.validateUserInfoResponse.line.profile // "POSTPAID"' "$ARTIFACTS_DIR/validate_raw.json" 2>/dev/null || echo "POSTPAID")
REGION=$(jq -r '.validateUserInfoResponse.line.region // "9"' "$ARTIFACTS_DIR/validate_raw.json" 2>/dev/null || echo "9")
ACCOUNT=$(jq -r '.validateUserInfoResponse.line.account // "0"' "$ARTIFACTS_DIR/validate_raw.json" 2>/dev/null || echo "0")
IS_SUSPENDED=$(jq -r '.validateUserInfoResponse.line.isSuspended // false' "$ARTIFACTS_DIR/validate_raw.json" 2>/dev/null || echo "false")

echo "Perfil detectado: profile=$PROFILE, region=$REGION" | tee -a "$REPORT_FILE"

# 4-7. Probar endpoints de consumo en paralelo (Home Flow, Detalle Consumo, Paquetes Activos, Factura/MiPlan)
echo "4-7. Probando endpoints Home Flow, Consumo Details, Paquetes Activos y Factura/MiPlan en paralelo..."
BILLING_URL="https://mi-telcel.smapps.mx/services/1.0.0/v2/telcelBilling"
if [[ "$PROFILE" == "MASIVO" ]]; then
  BILLING_URL="https://mi-telcel.smapps.mx/users/1.0.0/miPlan?user=${TELCEL_PHONE}&profile=${PROFILE}&region=${REGION}"
fi
MTL_AUTH_HEADERS=("${MTL_HEADERS[@]}" -H "Token: $MTL_TOKEN" -H "user: $TELCEL_PHONE" -H "profile: $PROFILE" -H "region: $REGION")

curl -s -o "$ARTIFACTS_DIR/home_flow_raw.json" -w "%{http_code}" \
  -X GET "https://api.journeys.telcel.wavebybemobi.com/api/components/flow/home?externalCode=52${TELCEL_PHONE}" \
  -H "Authorization: Bearer $B2F_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "X-Is-iPad: false" \
  -H "x-wave-sdk: WEB" \
  -H "x-wave-device: Desktop" \
  -H "x-wave-device-type: browser" \
  -H "x-wave-os: macos-web" \
  -H "x-wave-os-version: 10.15.7" \
  -H "User-Agent: $UA" > "$ARTIFACTS_DIR/.status_home" &

curl -s -o "$ARTIFACTS_DIR/postpago_raw.json" -w "%{http_code}" \
  -X GET "https://mi-telcel.smapps.mx/users/1.0.0/consumption/v2/details?user=${TELCEL_PHONE}&profile=${PROFILE}&region=${REGION}&typeRequest=getModule&account=${ACCOUNT}" \
  "${MTL_AUTH_HEADERS[@]}" -H "App-Version: 0.15" > "$ARTIFACTS_DIR/.status_postpago" &

curl -s -o "$ARTIFACTS_DIR/prepago_raw.json" -w "%{http_code}" \
  -X GET "https://mi-telcel.smapps.mx/packages/1.0.0/v2/active/list?user=${TELCEL_PHONE}&profile=${PROFILE}&region=${REGION}&isSuspended=${IS_SUSPENDED}" \
  "${MTL_AUTH_HEADERS[@]}" -H "App-Version: 0.14" > "$ARTIFACTS_DIR/.status_prepago" &

curl -s -o "$ARTIFACTS_DIR/factura_raw.json" -w "%{http_code}" \
  -X GET "$BILLING_URL" \
  "${MTL_AUTH_HEADERS[@]}" -H "App-Version: 0.14" -H "account: $ACCOUNT" > "$ARTIFACTS_DIR/.status_factura" &

wait

{
  echo "Endpoint Home Flow (B2F) HTTP Status: $(<"$ARTIFACTS_DIR/.status_home")"
  echo "Endpoint Consumo Details HTTP Status: $(<"$ARTIFACTS_DIR/.status_postpago")"
  echo "Endpoint Paquetes Activos HTTP Status: $(<"$ARTIFACTS_DIR/.status_prepago")"
  echo "Endpoint Factura/MiPlan HTTP Status: $(<"$ARTIFACTS_DIR/.status_factura")"
} | tee -a "$REPORT_FILE"

# 8. Extraer resumen de consumo (Plan + Promo + Vigencia) y esquema JSON sin exponer datos sensibles
jq -r '
  [.. | objects | select(.id? | type == "string" and test("^tabs-plans-v2-plan-name-[0-9]+-[0-9]+-[0-9]+$")) | .id | sub("tabs-plans-v2-plan-name-"; "")] as $sfx
  | [.. | objects | select(.id? and .config?) | {key: .id, value: .config}] | from_entries as $byId
  | "Plan: \($byId["text-plan-name"].value // "N/A") | Fecha de corte: \($byId["plan-details-row-template-col-2-0-0"].value // "N/A") | Vigencia: \(([$byId["tabs-plans-v2-limited-cutoff-message-0-0-0"].segments[]?.text] | join("")) // "N/A")",
    ($sfx[] | "  - Bucket [\(. )]: \($byId["tabs-plans-v2-plan-name-\(.)"].value) -> Total: \($byId["tabs-plans-v2-total-data-value-\(.)"].value) \($byId["tabs-plans-v2-total-data-unit-\(.)"].value) | Usados: \($byId["tabs-plans-v2-used-data-value-\(.)"].value) \($byId["tabs-plans-v2-used-data-unit-\(.)"].value) | Disponibles: \($byId["tabs-plans-v2-available-data-value-\(.)"].value) \($byId["tabs-plans-v2-available-data-unit-\(.)"].value)")
' "$ARTIFACTS_DIR/home_flow_raw.json" 2>/dev/null | tee -a "$REPORT_FILE" || true

jq -s '
  def schema: [paths(scalars) as $p | { path: ($p | map(tostring) | join(".")), type: (getpath($p) | type) }];
  {
    validate: (.[0] | schema),
    home_usage_blocks: [.[1] | .. | objects | select(.id? | type == "string" and test("^(last-update-text|text-plan-name|plan-details-name|plan-details-row-template-col-2-0-0|tabs-plans-v2-(tabs-0|plan-name|total-data-value|total-data-unit|used-data-value|used-data-unit|available-data-value|available-data-unit|limited-cutoff-message|usage-chart)-[0-9]+-[0-9]+-[0-9]+)$")) | { id: .id, type: .type, configKeys: (.config | keys) }],
    consumption_details: (.[2] | schema),
    active_packages: (.[3] | schema),
    billing_or_plan: (.[4] | schema)
  }
' \
  "$ARTIFACTS_DIR/validate_raw.json" \
  "$ARTIFACTS_DIR/home_flow_raw.json" \
  "$ARTIFACTS_DIR/postpago_raw.json" \
  "$ARTIFACTS_DIR/prepago_raw.json" \
  "$ARTIFACTS_DIR/factura_raw.json" > "$ARTIFACTS_DIR/schema_summary.json" 2>/dev/null || echo "{}" > "$ARTIFACTS_DIR/schema_summary.json"
echo "✅ Esquema de llaves extraído en artifacts/schema_summary.json" | tee -a "$REPORT_FILE"

echo "Pruebas finalizadas. Revisa artifacts/probe_report.txt"
