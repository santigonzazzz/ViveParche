#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# deploy-frontend.sh — Deploy automático del frontend a producción
# Proyecto: Parché AI / viveparche.cloud
# ═══════════════════════════════════════════════════════════════════════
#
# USO:
#   ./scripts/deploy-frontend.sh          → Build + deploy normal
#   ./scripts/deploy-frontend.sh --skip-build  → Solo deploy (usa dist/ existente)
#   ./scripts/deploy-frontend.sh --rollback    → Restaurar versión anterior
#   ./scripts/deploy-frontend.sh --dry-run     → Simular sin aplicar cambios
#
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Configuración ──────────────────────────────────────────────────────
PROJECT_ROOT="/root/proyecto_eventos/Proyecto_Eventos"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"
DIST_DIR="${FRONTEND_DIR}/dist"
WEB_ROOT="/var/www/viveparche.cloud"
BACKUP_DIR="/var/www/viveparche.cloud_rollback"
LOG_FILE="${PROJECT_ROOT}/scripts/deploy.log"
WEB_USER="www-data"
WEB_GROUP="www-data"
REQUIRED_NODE_MAJOR=20

# ─── Colores ────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ─── Funciones ──────────────────────────────────────────────────────────
log()   { echo -e "${CYAN}[$(date '+%H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"; }
ok()    { echo -e "${GREEN}  ✅ $1${NC}" | tee -a "$LOG_FILE"; }
warn()  { echo -e "${YELLOW}  ⚠️  $1${NC}" | tee -a "$LOG_FILE"; }
fail()  { echo -e "${RED}  ❌ $1${NC}" | tee -a "$LOG_FILE"; exit 1; }

header() {
    echo "" | tee -a "$LOG_FILE"
    echo -e "${BOLD}═══════════════════════════════════════════════════${NC}" | tee -a "$LOG_FILE"
    echo -e "${BOLD}  🚀 DEPLOY FRONTEND — viveparche.cloud${NC}" | tee -a "$LOG_FILE"
    echo -e "${BOLD}  $(date '+%Y-%m-%d %H:%M:%S UTC')${NC}" | tee -a "$LOG_FILE"
    echo -e "${BOLD}═══════════════════════════════════════════════════${NC}" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
}

# ─── Parsear argumentos ────────────────────────────────────────────────
SKIP_BUILD=false
ROLLBACK=false
DRY_RUN=false

for arg in "$@"; do
    case $arg in
        --skip-build) SKIP_BUILD=true ;;
        --rollback)   ROLLBACK=true ;;
        --dry-run)    DRY_RUN=true ;;
        --help|-h)
            echo "Uso: $0 [--skip-build] [--rollback] [--dry-run]"
            echo ""
            echo "  --skip-build   Usa el dist/ existente sin rebuildar"
            echo "  --rollback     Restaura la versión anterior del deploy"
            echo "  --dry-run      Muestra qué haría sin aplicar cambios"
            echo ""
            exit 0
            ;;
        *) fail "Argumento desconocido: $arg (usa --help)" ;;
    esac
done

# ─── Rollback ───────────────────────────────────────────────────────────
if [ "$ROLLBACK" = true ]; then
    header
    log "🔄 Iniciando ROLLBACK..."

    if [ ! -d "$BACKUP_DIR" ]; then
        fail "No existe backup en $BACKUP_DIR — no se puede hacer rollback"
    fi

    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] rsync --archive --delete $BACKUP_DIR/ → $WEB_ROOT/"
        ok "Rollback simulado exitoso"
        exit 0
    fi

    rsync --archive --delete "${BACKUP_DIR}/" "${WEB_ROOT}/"
    chown -R "${WEB_USER}:${WEB_GROUP}" "${WEB_ROOT}"

    ok "Rollback completado — producción restaurada desde backup"
    log "Verificando con curl..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://viveparche.cloud/)
    if [ "$HTTP_CODE" = "200" ]; then
        ok "Frontend responde HTTP 200"
    else
        warn "Frontend responde HTTP $HTTP_CODE — verificar manualmente"
    fi
    exit 0
fi

# ─── Deploy normal ──────────────────────────────────────────────────────
header

# Paso 1: Validaciones previas
log "📋 Paso 1/6 — Validaciones previas"

if [ ! -d "$FRONTEND_DIR" ]; then
    fail "Directorio frontend no encontrado: $FRONTEND_DIR"
fi

if [ ! -f "${FRONTEND_DIR}/package.json" ]; then
    fail "package.json no encontrado en $FRONTEND_DIR"
fi

if [ "$SKIP_BUILD" = false ]; then
    NODE_VERSION=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1 || echo "0")
    if [ "$NODE_VERSION" -lt "$REQUIRED_NODE_MAJOR" ]; then
        fail "Node.js v${NODE_VERSION} detectado — se requiere v${REQUIRED_NODE_MAJOR}+"
    fi
    ok "Node.js v$(node --version 2>/dev/null | sed 's/v//') — compatible"
fi

if [ ! -d "$WEB_ROOT" ]; then
    fail "Web root no existe: $WEB_ROOT"
fi
ok "Web root existe: $WEB_ROOT"

# Verificar que Nginx está corriendo
if ! systemctl is-active --quiet nginx; then
    fail "Nginx no está corriendo"
fi
ok "Nginx activo"

# Paso 2: Git info (informativo, no bloquea)
log "📋 Paso 2/6 — Info del repositorio"

cd "$PROJECT_ROOT"
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "desconocido")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "desconocido")
GIT_DIRTY=$(git status --porcelain 2>/dev/null | wc -l)

ok "Branch: ${GIT_BRANCH} | Commit: ${GIT_COMMIT} | Archivos sin commit: ${GIT_DIRTY}"

if [ "$GIT_DIRTY" -gt 0 ]; then
    warn "Hay $GIT_DIRTY archivo(s) modificados sin commitear"
fi

# Paso 3: Instalar dependencias
if [ "$SKIP_BUILD" = false ]; then
    log "📦 Paso 3/6 — Instalando dependencias"

    cd "$FRONTEND_DIR"

    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] npm ci --prefer-offline"
    else
        npm ci --prefer-offline 2>&1 | tail -3 | tee -a "$LOG_FILE"
    fi
    ok "Dependencias instaladas"

    # Paso 4: Build de producción
    log "🔨 Paso 4/6 — Building frontend"

    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] NODE_OPTIONS='--max-old-space-size=4096' npm run build"
    else
        NODE_OPTIONS="--max-old-space-size=4096" npm run build 2>&1 | tee -a "$LOG_FILE"
    fi

    if [ ! -f "${DIST_DIR}/index.html" ]; then
        fail "Build falló — dist/index.html no existe"
    fi
    ok "Build exitoso — $(du -sh "$DIST_DIR" | cut -f1) total"
else
    log "⏭️  Paso 3/6 — SKIP (--skip-build)"
    log "⏭️  Paso 4/6 — SKIP (--skip-build)"

    if [ ! -f "${DIST_DIR}/index.html" ]; then
        fail "dist/index.html no existe — no se puede hacer deploy sin build"
    fi
    ok "Usando dist/ existente — $(du -sh "$DIST_DIR" | cut -f1)"
fi

# Paso 5: Backup + Deploy
log "🔄 Paso 5/6 — Backup de producción actual + Deploy"

if [ "$DRY_RUN" = true ]; then
    log "[DRY RUN] rsync $WEB_ROOT/ → $BACKUP_DIR/ (backup)"
    log "[DRY RUN] rsync --delete $DIST_DIR/ → $WEB_ROOT/ (deploy)"
    log "[DRY RUN] chown -R $WEB_USER:$WEB_GROUP $WEB_ROOT"
else
    # Crear backup atómico de la versión actual
    rsync --archive --delete "${WEB_ROOT}/" "${BACKUP_DIR}/"
    ok "Backup guardado en ${BACKUP_DIR}"

    # Desplegar nueva versión
    rsync --archive --delete --checksum "${DIST_DIR}/" "${WEB_ROOT}/"
    chown -R "${WEB_USER}:${WEB_GROUP}" "${WEB_ROOT}"
    ok "Deploy completado — archivos copiados a ${WEB_ROOT}"
fi

# Paso 6: Verificaciones post-deploy
log "🧪 Paso 6/6 — Verificaciones post-deploy"

if [ "$DRY_RUN" = true ]; then
    log "[DRY RUN] curl https://viveparche.cloud/"
    log "[DRY RUN] Comparar hash dist/assets/*.js vs producción"
    ok "Dry run completado — no se aplicaron cambios"
    exit 0
fi

# Test 1: HTTP status
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://viveparche.cloud/)
if [ "$HTTP_CODE" = "200" ]; then
    ok "Frontend responde HTTP 200"
else
    warn "Frontend responde HTTP $HTTP_CODE"
fi

# Test 2: Verificar que el JS bundle existe en producción
JS_FILE=$(ls "${DIST_DIR}/assets/"*.js 2>/dev/null | head -1)
if [ -n "$JS_FILE" ]; then
    JS_BASENAME=$(basename "$JS_FILE")
    REMOTE_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://viveparche.cloud/assets/${JS_BASENAME}")
    if [ "$REMOTE_CODE" = "200" ]; then
        ok "Bundle JS accesible: /assets/${JS_BASENAME}"
    else
        warn "Bundle JS NO accesible: HTTP ${REMOTE_CODE}"
    fi
fi

# Test 3: Comparar hash local vs producción
LOCAL_HASH=$(md5sum "$JS_FILE" 2>/dev/null | cut -d' ' -f1)
REMOTE_HASH=$(curl -s "https://viveparche.cloud/assets/${JS_BASENAME}" | md5sum | cut -d' ' -f1)
if [ "$LOCAL_HASH" = "$REMOTE_HASH" ]; then
    ok "Hash MD5 coincide — deploy verificado ✅"
else
    warn "Hash NO coincide — local: $LOCAL_HASH vs remoto: $REMOTE_HASH"
fi

# Test 4: API health
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://viveparche.cloud/api/municipalities/)
if [ "$API_CODE" = "200" ]; then
    ok "API backend responde HTTP 200"
else
    warn "API responde HTTP $API_CODE"
fi

# ─── Resumen ────────────────────────────────────────────────────────────
echo "" | tee -a "$LOG_FILE"
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}" | tee -a "$LOG_FILE"
echo -e "${GREEN}${BOLD}  ✅ DEPLOY COMPLETADO EXITOSAMENTE${NC}" | tee -a "$LOG_FILE"
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo -e "  Branch:  ${GIT_BRANCH}" | tee -a "$LOG_FILE"
echo -e "  Commit:  ${GIT_COMMIT}" | tee -a "$LOG_FILE"
echo -e "  Backup:  ${BACKUP_DIR}" | tee -a "$LOG_FILE"
echo -e "  WebRoot: ${WEB_ROOT}" | tee -a "$LOG_FILE"
echo -e "  Log:     ${LOG_FILE}" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo -e "  Para rollback: ${BOLD}$0 --rollback${NC}" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
