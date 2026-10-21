#!/usr/bin/env bash
# Lance Growth Hub et l'ouvre dans le navigateur.
cd "$(dirname "$0")"
PORT="${PORT:-8765}"
if ! curl -s -o /dev/null "http://127.0.0.1:$PORT/api/config"; then
  python3 serveur.py &
  sleep 1
fi
xdg-open "http://127.0.0.1:$PORT" >/dev/null 2>&1 || echo "Ouvre http://127.0.0.1:$PORT"
wait
