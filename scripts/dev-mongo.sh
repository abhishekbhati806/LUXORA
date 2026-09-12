#!/usr/bin/env bash
# Starts a local MongoDB instance for Luxora development.
# Real MongoDB on a dedicated data dir — not an in-memory mock.
set -euo pipefail

MONGO_BIN="${MONGO_BIN:-$HOME/.cache/mongodb/bin/mongod}"
DATA_DIR="${MONGO_DATA:-$HOME/.cache/luxora-mongo-data}"
LOG_FILE="$DATA_DIR/mongod.log"
PORT="${MONGO_PORT:-27017}"

mkdir -p "$DATA_DIR"

if pgrep -f "mongod --dbpath $DATA_DIR" > /dev/null 2>&1; then
  echo "mongod already running on port $PORT"
  exit 0
fi

[ -x "$MONGO_BIN" ] || { echo "mongod not found at $MONGO_BIN (set MONGO_BIN)"; exit 1; }

nohup "$MONGO_BIN" \
  --dbpath "$DATA_DIR" \
  --bind_ip 127.0.0.1 \
  --port "$PORT" \
  --ipv6 \
  --wiredTigerCacheSizeGB 0.25 \
  > "$LOG_FILE" 2>&1 &

for _ in $(seq 1 40); do
  if "$MONGO_BIN" --version > /dev/null 2>&1 && grep -q "Waiting for connections" "$LOG_FILE" 2>/dev/null; then
    echo "mongod ready (mongodb://127.0.0.1:$PORT) — log: $LOG_FILE"
    exit 0
  fi
  sleep 0.5
done
echo "mongod did not become ready; see $LOG_FILE"
exit 1
