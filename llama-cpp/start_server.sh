#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${GEMMA4_ROOT:-$HOME/Developer/local-ai/gemma4}"
SESSION_NAME="${SESSION_NAME:-gemma4-server}"
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8081}"
CTX_SIZE="${CTX_SIZE:-32768}"
PARALLEL="${PARALLEL:-1}"
SPEC_DRAFT_N_MAX="${SPEC_DRAFT_N_MAX:-3}"

LLAMA_SERVER="$ROOT_DIR/repos/llama.cpp/build/bin/llama-server"
MODEL="$ROOT_DIR/models/unsloth-gemma-4-26B-A4B-it-GGUF/gemma-4-26B-A4B-it-UD-Q4_K_XL.gguf"
DRAFT_MODEL="$ROOT_DIR/models/unsloth-gemma-4-26B-A4B-it-GGUF/MTP/gemma-4-26B-A4B-it-Q8_0-MTP.gguf"
MMPROJ="$ROOT_DIR/models/unsloth-gemma-4-26B-A4B-it-GGUF/mmproj-BF16.gguf"
LOG_FILE="$ROOT_DIR/logs/llama-server-mtp.log"

for required in "$LLAMA_SERVER" "$MODEL" "$DRAFT_MODEL" "$MMPROJ"; do
  if [[ ! -e "$required" ]]; then
    echo "Missing required file: $required" >&2
    exit 1
  fi
done

mkdir -p "$ROOT_DIR/logs"

if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "tmux session already exists: $SESSION_NAME"
  echo "Attach: tmux attach -t $SESSION_NAME"
  exit 0
fi

tmux new-session -d -s "$SESSION_NAME" -c "$ROOT_DIR" \
  "$LLAMA_SERVER \
    -m '$MODEL' \
    --model-draft '$DRAFT_MODEL' \
    --mmproj '$MMPROJ' \
    --spec-type draft-mtp \
    --spec-draft-n-max '$SPEC_DRAFT_N_MAX' \
    -ngl 999 \
    -fa on \
    -c '$CTX_SIZE' \
    --parallel '$PARALLEL' \
    --host '$HOST' \
    --port '$PORT' \
    2>&1 | tee -a '$LOG_FILE'"

echo "Started $SESSION_NAME on http://$HOST:$PORT"
echo "Logs: $LOG_FILE"
echo "Attach: tmux attach -t $SESSION_NAME"
