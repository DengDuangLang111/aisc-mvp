#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

REDIS_VERSION="7.2.4"
REDIS_SRC_DIR="$ROOT/.redis/redis-${REDIS_VERSION}"
REDIS_BIN="$REDIS_SRC_DIR/src/redis-server"
REDIS_PID=""

cleanup_lock() {
  local lock="$ROOT/apps/web/.next/dev/lock"
  if [[ -f "$lock" ]]; then
    rm -f "$lock"
    echo "🧹 Removed stale lock: $lock"
  fi
}

kill_process() {
  local pattern="$1"
  if pgrep -f "$pattern" >/dev/null 2>&1; then
    pkill -f "$pattern"
    echo "🛑 Stopped processes matching \"$pattern\""
  fi
}

kill_port() {
  local port="$1"
  local pids
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    echo "🛑 Freeing TCP port $port (PIDs: $pids)"
    kill $pids 2>/dev/null || true
  fi
}

check_script() {
  local pkg="$1"
  local script="$2"
  node -e "
    const path = require('path');
    const pkgPath = path.resolve('$pkg/package.json');
    const pkg = require(pkgPath);
    if (!pkg.scripts || !pkg.scripts['$script']) {
      console.error('❌ Missing script \"$script\" in ' + pkgPath);
      process.exit(1);
    }
  "
}

kill_process "next-server"
kill_process "nest start"
kill_process "nest serve"
kill_port 3000
kill_port 4001
cleanup_lock

ensure_redis_binary() {
  if [[ -x "$REDIS_BIN" ]]; then
    return
  fi

  mkdir -p "$ROOT/.redis"
  local archive="$ROOT/.redis/redis-${REDIS_VERSION}.tar.gz"
  if [[ ! -f "$archive" ]]; then
    echo "⬇️  Downloading Redis ${REDIS_VERSION}..."
    curl -L -o "$archive" "https://download.redis.io/releases/redis-${REDIS_VERSION}.tar.gz"
  fi

  if [[ ! -d "$REDIS_SRC_DIR" ]]; then
    tar -xzf "$archive" -C "$ROOT/.redis"
  fi

  echo "🔧 Building Redis ${REDIS_VERSION} (once)..."
  (cd "$REDIS_SRC_DIR" && make BUILD_TLS=no >/dev/null)
}

start_redis() {
  if lsof -i :6379 >/dev/null 2>&1; then
    echo "ℹ️  Redis already running on port 6379."
    return
  fi

  ensure_redis_binary

  echo "▶ Starting Redis locally..."
  "$REDIS_BIN" --save "" --appendonly no --port 6379 > "$ROOT/.redis/redis.log" 2>&1 &
  REDIS_PID=$!
  echo "   Redis PID $REDIS_PID listening on 6379"
  sleep 0.5
}

RETAINED_PIDS=()
cleanup() {
  for pid in "${RETAINED_PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  if [[ -n "${REDIS_PID}" ]]; then
    kill "$REDIS_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

start_redis
export ENABLE_OCR_QUEUE=${ENABLE_OCR_QUEUE:-true}

start_service() {
  local filter="$1"
  local script="$2"
  local name="$3"

  check_script "apps/$filter" "$script"

  if [[ "$filter" == "api" && "$script" == "start:dev" ]]; then
    local entry="$ROOT/apps/api/dist/main.js"
    if [[ ! -f "$entry" ]]; then
      echo "ℹ️  Building API once to generate $entry ..."
      (cd "$ROOT" && pnpm --filter "$filter" run build >/dev/null)
    fi
  fi

  echo "▶ Starting $name via \"pnpm --filter $filter run $script\"..."
  (
    cd "$ROOT"
    pnpm --filter "$filter" run "$script"
  ) &
  local pid=$!
  RETAINED_PIDS+=("$pid")
  printf "   %s PID %s\n" "$name" "$pid"
}

start_service "api" "start:dev" "API"
sleep 1
start_service "web" "dev" "Web"

echo
echo "🚀 Both services are starting. Watch this terminal for URLs; Ctrl+C stops both."

wait
