#!/usr/bin/env bash
# Start/stop/restart/status for both bots in dedicated tmux sessions.
# VPS-oriented wrapper; keep one copy in each bot repo so both stay in sync.
# Usage: scripts/bots.sh {start|stop|restart|status}
set -euo pipefail

NODE_BIN=${NODE_BIN:-/root/.nvm/versions/node/v22.23.5/bin}
export PATH="$NODE_BIN:$PATH"
export YOUTUBE_PROXY="${YOUTUBE_PROXY:-socks5://127.0.0.1:9050}"

WA_DIR=${WA_DIR:-/root/bot-whatsapp}
TG_DIR=${TG_DIR:-/root/bot-telegram}

die() { printf 'error: %s\n' "$*" >&2; exit 1; }

ensure_tor() {
  if ! systemctl is-active --quiet tor; then
    systemctl start tor
  fi
  for _ in 1 2 3 4 5; do
    ss -tln 2>/dev/null | grep -q ':9050 ' && return 0
    sleep 1
  done
  die 'tor socks5 is not listening on 127.0.0.1:9050'
}

start_one() {
  local session=$1 dir=$2 cmd=$3
  [ -d "$dir" ] || die "missing directory: $dir"
  tmux has-session -t "$session" 2>/dev/null && tmux kill-session -t "$session"
  tmux new-session -d -s "$session" -c "$dir"
  tmux send-keys -t "$session:0" \
    "export PATH=$NODE_BIN:\$PATH; export YOUTUBE_PROXY=$YOUTUBE_PROXY; $cmd" Enter
  printf 'started %s: %s\n' "$session" "$cmd"
}

start_all() {
  ensure_tor
  start_one bot-whatsapp "$WA_DIR" 'node bot.js'
  start_one bot-telegram "$TG_DIR" './.venv311/bin/python bot.py'
  printf 'both bots starting in tmux (proxy=%s)\n' "$YOUTUBE_PROXY"
}

stop_all() {
  for session in bot-whatsapp bot-telegram; do
    if tmux has-session -t "$session" 2>/dev/null; then
      tmux send-keys -t "$session:0" C-c || true
      sleep 1
      tmux kill-session -t "$session" || true
      printf 'stopped %s\n' "$session"
    else
      printf '%s not running\n' "$session"
    fi
  done
}

status_all() {
  printf 'tor: %s\n' "$(systemctl is-active tor 2>/dev/null || echo inactive)"
  printf 'socks5: '; ss -tln 2>/dev/null | grep -q ':9050 ' && echo listening || echo down
  printf 'sessions:\n'; tmux list-sessions 2>/dev/null | sed 's/^/  /' || echo '  none'
  printf 'processes:\n'; pgrep -af 'node bot.js|\.venv311/bin/python bot.py' | grep -v pgrep | sed 's/^/  /' || echo '  none'
}

case "${1:-start}" in
  start)   start_all ;;
  stop)    stop_all ;;
  restart) stop_all; start_all ;;
  status)  status_all ;;
  *) die "usage: $0 {start|stop|restart|status}" ;;
esac
