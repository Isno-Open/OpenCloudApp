#!/usr/bin/env bash
# Pile neuve, parcours des ecrans au navigateur (scripts/e2e-ui.py), puis demontage. Prerequis :
# python3 avec playwright (et son chromium). Refuse de tourner si un .env existe (il porterait vos reglages).
set -u
cd "$(dirname "$0")/.."
LAN="$(hostname -I | awk '{print $1}')"
WORK="$(mktemp -d)"
[ -f .env ] && { echo "un .env existe deja : test refuse"; exit 2; }
printf 'SESSION_SECRET=ui-%s\nADMIN_TOKEN=ui-%s\nBROKER_PUBLIC_PORT=18883\n' "$RANDOM$RANDOM" "$RANDOM$RANDOM" > .env
cat > "$WORK/override.yml" <<YML
services:
  server:
    ports: !override
      - "0.0.0.0:18080:8080"
    environment:
      - PORTAL_SETUP_WINDOW_S=1800
YML
C=(docker compose -p isnoui -f docker-compose.yml -f "$WORK/override.yml")
teardown() {
  "${C[@]}" down -v >/dev/null 2>&1
  docker rm -f isno-mqtt isno-mongo >/dev/null 2>&1
  docker volume rm isno-broker-data isno-mongo-data isno-plugins >/dev/null 2>&1
  rm -f .env; rm -rf "$WORK"
}
trap teardown EXIT
"${C[@]}" up -d --build >/dev/null 2>&1 || { echo "echec du build/demarrage"; exit 1; }
for _ in $(seq 1 60); do curl -s -o /dev/null "http://$LAN:18080/api/setup/status" && break; sleep 1; done
python3 scripts/e2e-ui.py "$LAN" ${E2E_UI_SHOTS:+"$E2E_UI_SHOTS"}
