#!/usr/bin/env bash
# capture.sh — Capture tmux pane output over time for classifier spike
#
# Usage: ./capture.sh <session-name> <state-label> [interval_secs] [num_captures]
#
# Example: ./capture.sh claude-idle idle 2 10
#   -> Takes 10 captures, 2 seconds apart, saving to spike/fixtures/idle/

set -euo pipefail

SESSION="$1"
STATE="$2"
INTERVAL="${3:-2}"
NUM_CAPTURES="${4:-10}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FIXTURE_DIR="$SCRIPT_DIR/fixtures/$STATE"

mkdir -p "$FIXTURE_DIR"

echo "Capturing $NUM_CAPTURES snapshots from session '$SESSION' (state: $STATE)"
echo "Interval: ${INTERVAL}s | Output: $FIXTURE_DIR"
echo "---"

for i in $(seq 1 "$NUM_CAPTURES"); do
    TIMESTAMP=$(date +%s)
    PREFIX="${STATE}_${i}_${TIMESTAMP}"

    # Capture without ANSI (stripped) — this is what the classifier will primarily use
    tmux capture-pane -p -S -200 -t "$SESSION" > "$FIXTURE_DIR/${PREFIX}_stripped.txt" 2>&1

    # Capture with ANSI escape sequences preserved — for validating stripping
    tmux capture-pane -p -e -S -200 -t "$SESSION" > "$FIXTURE_DIR/${PREFIX}_ansi.txt" 2>&1

    echo "  [$i/$NUM_CAPTURES] Captured at $(date +%H:%M:%S)"

    if [ "$i" -lt "$NUM_CAPTURES" ]; then
        sleep "$INTERVAL"
    fi
done

echo "---"
echo "Done. $NUM_CAPTURES captures saved to $FIXTURE_DIR"
