#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# check-system.sh — Monitoreo rápido de viveparche.cloud
#
# USO:
#   ./scripts/check-system.sh           → check completo con output
#   ./scripts/check-system.sh --quiet   → solo errores (para cron)
#   ./scripts/check-system.sh --json    → output JSON
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Config ─────────────────────────────────────────────────────────────
DOMAIN="https://viveparche.cloud"
BACKEND="http://127.0.0.1:8001"
LOG_DIR="/var/log/viveparche"
LOG_FILE="${LOG_DIR}/monitor.log"
TIMEOUT=10
ERRORS=0

# ─── Args ───────────────────────────────────────────────────────────────
QUIET=false
JSON=false
for arg in "$@"; do
    case $arg in
        --quiet|-q) QUIET=true ;;
        --json|-j)  JSON=true ;;
    esac
done

# ─── Setup ──────────────────────────────────────────────────────────────
mkdir -p "$LOG_DIR"
NOW=$(date '+%Y-%m-%d %H:%M:%S')

# ─── Colores ────────────────────────────────────────────────────────────
if [ "$QUIET" = false ] && [ "$JSON" = false ]; then
    GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'
    CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
else
    GREEN=''; RED=''; YELLOW=''; CYAN=''; BOLD=''; NC=''
fi

# ─── Helpers ────────────────────────────────────────────────────────────
log_error() {
    echo "[${NOW}] ERROR: $1" >> "$LOG_FILE"
    ERRORS=$((ERRORS + 1))
}

log_ok() {
    echo "[${NOW}] OK: $1" >> "$LOG_FILE"
}

check_http() {
    local name="$1" url="$2" expect="${3:-200}"
    local code body latency

    start_time=$(date +%s%N)
    body=$(curl -s --max-time "$TIMEOUT" -w "\n%{http_code}" "$url" 2>/dev/null) || {
        log_error "${name}: connection refused/timeout → ${url}"
        [ "$QUIET" = false ] && [ "$JSON" = false ] && echo -e "  ${RED}❌ ${name}: CONNECTION FAILED${NC}"
        return 1
    }
    end_time=$(date +%s%N)

    code=$(echo "$body" | tail -1)
    latency=$(( (end_time - start_time) / 1000000 ))

    if [ "$code" = "$expect" ]; then
        log_ok "${name}: HTTP ${code} (${latency}ms)"
        [ "$QUIET" = false ] && [ "$JSON" = false ] && echo -e "  ${GREEN}✅ ${name}: HTTP ${code}${NC} (${latency}ms)"
        return 0
    else
        log_error "${name}: HTTP ${code} (expected ${expect}) → ${url}"
        [ "$QUIET" = false ] && [ "$JSON" = false ] && echo -e "  ${RED}❌ ${name}: HTTP ${code}${NC} (expected ${expect})"
        return 1
    fi
}

check_process() {
    local name="$1" pattern="$2"
    if pgrep -f "$pattern" > /dev/null 2>&1; then
        log_ok "${name}: running"
        [ "$QUIET" = false ] && [ "$JSON" = false ] && echo -e "  ${GREEN}✅ ${name}: running${NC} (PID $(pgrep -f "$pattern" | head -1))"
        return 0
    else
        log_error "${name}: NOT running"
        [ "$QUIET" = false ] && [ "$JSON" = false ] && echo -e "  ${RED}❌ ${name}: NOT RUNNING${NC}"
        return 1
    fi
}

check_disk() {
    local usage
    usage=$(df / --output=pcent | tail -1 | tr -d ' %')
    if [ "$usage" -lt 85 ]; then
        [ "$QUIET" = false ] && [ "$JSON" = false ] && echo -e "  ${GREEN}✅ Disco: ${usage}% usado${NC}"
    elif [ "$usage" -lt 95 ]; then
        log_error "Disk usage high: ${usage}%"
        [ "$QUIET" = false ] && [ "$JSON" = false ] && echo -e "  ${YELLOW}⚠️  Disco: ${usage}% usado${NC}"
    else
        log_error "Disk usage CRITICAL: ${usage}%"
        [ "$QUIET" = false ] && [ "$JSON" = false ] && echo -e "  ${RED}❌ Disco: ${usage}% CRÍTICO${NC}"
    fi
}

check_memory() {
    local used total pct
    read -r total used <<< $(free -m | awk '/^Mem:/ {print $2, $3}')
    pct=$((used * 100 / total))
    if [ "$pct" -lt 85 ]; then
        [ "$QUIET" = false ] && [ "$JSON" = false ] && echo -e "  ${GREEN}✅ RAM: ${used}/${total} MB (${pct}%)${NC}"
    else
        log_error "Memory usage high: ${pct}%"
        [ "$QUIET" = false ] && [ "$JSON" = false ] && echo -e "  ${YELLOW}⚠️  RAM: ${used}/${total} MB (${pct}%)${NC}"
    fi
}

check_ssl() {
    local days
    days=$(echo | openssl s_client -connect viveparche.cloud:443 -servername viveparche.cloud 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | grep notAfter | cut -d= -f2)
    if [ -n "$days" ]; then
        local expiry_epoch now_epoch days_left
        expiry_epoch=$(date -d "$days" +%s 2>/dev/null || echo 0)
        now_epoch=$(date +%s)
        days_left=$(( (expiry_epoch - now_epoch) / 86400 ))
        if [ "$days_left" -gt 14 ]; then
            [ "$QUIET" = false ] && [ "$JSON" = false ] && echo -e "  ${GREEN}✅ SSL: ${days_left} días restantes${NC}"
        else
            log_error "SSL cert expiring in ${days_left} days!"
            [ "$QUIET" = false ] && [ "$JSON" = false ] && echo -e "  ${RED}❌ SSL: ${days_left} días — RENOVAR${NC}"
        fi
    fi
}

check_nginx_errors() {
    local recent_errors=0
    if [ -f /var/log/nginx/error.log ]; then
        recent_errors=$(grep -c "error" /var/log/nginx/error.log 2>/dev/null || true)
        # Filter to only last 5 minutes (approximate by checking last 50 lines)
        recent_errors=$(tail -50 /var/log/nginx/error.log 2>/dev/null | grep -c "error" 2>/dev/null || true)
    fi
    recent_errors=${recent_errors:-0}
    if [ "$recent_errors" -gt 0 ] 2>/dev/null; then
        log_error "Nginx: ${recent_errors} errors in last 5min"
        [ "$QUIET" = false ] && [ "$JSON" = false ] && echo -e "  ${YELLOW}⚠️  Nginx errors (5min): ${recent_errors}${NC}"
    else
        [ "$QUIET" = false ] && [ "$JSON" = false ] && echo -e "  ${GREEN}✅ Nginx errors (5min): 0${NC}"
    fi
}

# ═══════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════

if [ "$JSON" = true ]; then
    # JSON output mode
    fe_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "${DOMAIN}/")
    api_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "${DOMAIN}/api/municipalities/")
    health=$(curl -s --max-time "$TIMEOUT" "${BACKEND}/health" 2>/dev/null || echo '{"status":"unreachable"}')
    disk_pct=$(df / --output=pcent | tail -1 | tr -d ' %')
    read -r mem_total mem_used <<< $(free -m | awk '/^Mem:/ {print $2, $3}')
    uvicorn_pid=$(pgrep -f "uvicorn app.main" | head -1 || echo "none")
    nginx_ok=$(systemctl is-active nginx 2>/dev/null || echo "inactive")

    cat <<EOF
{
  "timestamp": "${NOW}",
  "frontend": {"url": "${DOMAIN}/", "status": ${fe_code}},
  "api": {"url": "${DOMAIN}/api/municipalities/", "status": ${api_code}},
  "health": ${health},
  "processes": {"nginx": "${nginx_ok}", "uvicorn_pid": "${uvicorn_pid}"},
  "resources": {"disk_pct": ${disk_pct}, "ram_used_mb": ${mem_used}, "ram_total_mb": ${mem_total}},
  "healthy": $([ "$fe_code" = "200" ] && [ "$api_code" = "200" ] && echo "true" || echo "false")
}
EOF
    exit 0
fi

if [ "$QUIET" = false ]; then
    echo ""
    echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}  🔍 SYSTEM CHECK — viveparche.cloud${NC}"
    echo -e "${BOLD}  ${NOW}${NC}"
    echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
    echo ""
fi

# ─── Procesos ───────────────────────────────────────────────────────────
[ "$QUIET" = false ] && echo -e "${CYAN}▸ Procesos${NC}"
check_process "Nginx"   "nginx: master"    || true
check_process "Uvicorn" "uvicorn app.main" || true
check_process "Docker"  "dockerd"          || true
[ "$QUIET" = false ] && echo ""

# ─── Endpoints ──────────────────────────────────────────────────────────
[ "$QUIET" = false ] && echo -e "${CYAN}▸ Endpoints (público)${NC}"
check_http "Frontend"      "${DOMAIN}/"                     || true
check_http "API municipios" "${DOMAIN}/api/municipalities/" || true
check_http "API eventos"    "${DOMAIN}/api/events/"         || true
[ "$QUIET" = false ] && echo ""

# ─── Backend local ──────────────────────────────────────────────────────
[ "$QUIET" = false ] && echo -e "${CYAN}▸ Backend (local)${NC}"
check_http "Health (local)" "${BACKEND}/health" || true

# Parse health response for DB status
health_body=$(curl -s --max-time "$TIMEOUT" "${BACKEND}/health" 2>/dev/null || echo '{}')
db_status=$(echo "$health_body" | grep -o '"database":"[^"]*"' | cut -d'"' -f4)
db_latency=$(echo "$health_body" | grep -o '"db_latency_ms":[0-9]*' | cut -d: -f2)

if [ "$db_status" = "ok" ]; then
    [ "$QUIET" = false ] && echo -e "  ${GREEN}✅ Supabase DB: ok${NC} (${db_latency}ms)"
elif [ -n "$db_status" ]; then
    log_error "Supabase DB: ${db_status}"
    [ "$QUIET" = false ] && echo -e "  ${RED}❌ Supabase DB: ${db_status}${NC}"
fi
[ "$QUIET" = false ] && echo ""

# ─── Recursos ───────────────────────────────────────────────────────────
[ "$QUIET" = false ] && echo -e "${CYAN}▸ Recursos${NC}"
check_disk
check_memory
[ "$QUIET" = false ] && echo ""

# ─── SSL ────────────────────────────────────────────────────────────────
[ "$QUIET" = false ] && echo -e "${CYAN}▸ SSL & Nginx${NC}"
check_ssl
check_nginx_errors
[ "$QUIET" = false ] && echo ""

# ─── Resumen ────────────────────────────────────────────────────────────
if [ "$QUIET" = false ]; then
    if [ "$ERRORS" -eq 0 ]; then
        echo -e "${GREEN}${BOLD}  ✅ TODO OK — ${ERRORS} errores${NC}"
    else
        echo -e "${RED}${BOLD}  ⚠️  ${ERRORS} PROBLEMA(S) DETECTADO(S)${NC}"
        echo -e "  Ver log: ${LOG_FILE}"
    fi
    echo ""
fi

# Exit with error if any check failed (useful for cron alerting)
[ "$ERRORS" -eq 0 ] && exit 0 || exit 1
