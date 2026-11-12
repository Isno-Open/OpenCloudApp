#!/usr/bin/env bash
# Test de bout en bout de la VRAIE pile (compose + superviseur + modules), sur cette machine.
# Rejoue l'installation telle que /setup la fait, puis un boitier simule, l'isolation et la
# reconciliation au demarrage. Ports a part (18080 / 18883), projet compose « isnoe2e ».
#   scripts/e2e-stack.sh            # nom des hotes = IP locale de la machine (cas « reseau local »)
#   scripts/e2e-stack.sh sqlite     # base SQLite au lieu de MongoDB fourni
# Demonte tout a la fin (conteneurs installes par le superviseur compris).
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
KIND="${1:-mongo-bundled}"
LAN="$(hostname -I | awk '{print $1}')"
APP="$LAN:18080"; B="http://$APP"
WORK="$(mktemp -d)"; ENV_CREATED=0
cat > "$WORK/override.yml" <<EOF
services:
  server:
    ports: !override
      - "0.0.0.0:18080:8080"
    environment:
      - PORTAL_SETUP_WINDOW_S=1800
EOF
C=(docker compose -p isnoe2e -f docker-compose.yml -f "$WORK/override.yml")
teardown() {
  docker rm -f isno-mqtt isno-mongo isno-e2e-device >/dev/null 2>&1
  "${C[@]}" down -v >/dev/null 2>&1
  docker volume rm isno-broker-data isno-mongo-data >/dev/null 2>&1
  [ "$ENV_CREATED" = 1 ] && rm -f .env
  rm -rf "$WORK"
}
trap teardown EXIT
if [ ! -f .env ]; then printf 'SESSION_SECRET=e2e-%s\nADMIN_TOKEN=e2e-%s\nBROKER_PUBLIC_PORT=18883\n' "$RANDOM$RANDOM" "$RANDOM$RANDOM" > .env; ENV_CREATED=1
else echo "un .env existe deja : test refuse (il porterait vos reglages)"; exit 2; fi

ok=0; ko=0
chk() { if [ "$2" = "$3" ]; then echo "  OK   $1"; ok=$((ok+1)); else echo "  KO   $1 (attendu=$3 obtenu=$2)"; ko=$((ko+1)); fi; }
jget() { python3 -c "import sys,json;d=json.load(sys.stdin);print(d$1)"; }
post() { curl -s -X POST -H 'content-type: application/json' -d "$2" "$B$1"; }
wait_ready() { for _ in $(seq 1 180); do curl -s "$B$1" | grep -q '"ready":true' && return 0; sleep 1; done; return 1; }

echo "== demarrage de la pile (IP locale $LAN)"
"${C[@]}" up -d --build >/dev/null 2>&1 || { echo "echec du build/demarrage"; exit 1; }
for _ in $(seq 1 60); do curl -s -o /dev/null "$B/api/setup/status" && break; sleep 1; done
chk "instance non configuree" "$(curl -s "$B/api/setup/status")" '{"configured":false}'
chk "accueil -> /setup" "$(curl -s -o /dev/null -w '%{redirect_url}' "$B/")" "$B/setup"

echo "== etape 1 : base ($KIND)"
if [ "$KIND" = mongo-bundled ]; then
  post /api/setup/module '{"kind":"mongo-bundled"}' >/dev/null
  wait_ready "/api/setup/module?kind=mongo-bundled"; chk "MongoDB installe par le superviseur" "$?" 0
  chk "MongoDB non privilegie, volume nomme" "$(docker inspect isno-mongo --format '{{.HostConfig.Privileged}} {{.HostConfig.Binds}}')" "false [isno-mongo-data:/data/db]"
fi

echo "== etape 2 : broker au nom choisi ($LAN), verification, enregistrement"
chk "nom du broker propose" "$(curl -s "$B/api/setup/defaults" | jget "['brokerHost']")" "$LAN"
post /api/setup/broker "{\"brokerHost\":\"$LAN\"}" >/dev/null
wait_ready /api/setup/broker; chk "broker installe et demarre" "$?" 0
chk "cle de la CA absente du broker" "$(docker exec isno-mqtt ls /mosquitto/certs | grep -c ca.key)" 0
sleep 2
chk "noms d'hote verifies jusqu'a cette instance" "$(post /api/setup/check-hosts "{\"appHost\":\"$APP\",\"brokerHost\":\"$LAN\"}" | jget "['ok']")" True
chk "enregistrement" "$(post /api/setup/save "{\"kind\":\"$KIND\",\"appHost\":\"$APP\",\"brokerHost\":\"$LAN\",\"adminPassword\":\"operateur-e2e\"}")" '{"ok":true}'
for _ in $(seq 1 60); do sleep 1; curl -s "$B/api/setup/status" 2>/dev/null | grep -q '"configured":true' && break; done
J="$WORK/jar"; curl -s -o /dev/null -c "$J" -X POST -d 'user=admin&pass=operateur-e2e' "$B/api/login"
sleep 6
chk "setup ferme une fois configure" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' -d '{}' "$B/api/setup/save")" 409
chk "relais connecte au broker" "$(docker logs isno-mqtt 2>&1 | grep -c "u'relay'" | awk '{print ($1>0)}')" 1

echo "== boitier simule : device grant, mTLS, commande, isolation"
R=$(post /api/device/start '{"firmware":"openprofalux"}'); DC=$(echo "$R" | jget "['device_code']"); UC=$(echo "$R" | jget "['user_code']")
chk "approbation par l'utilisateur" "$(curl -s -o /dev/null -w '%{http_code}' -b "$J" -X POST -H 'content-type: application/json' -d "{\"code\":\"$UC\"}" "$B/api/device/approve")" 200
post /api/device/poll "{\"device_code\":\"$DC\"}" > "$WORK/bundle.json"
python3 - "$WORK" <<'EOF'
import json,sys; d=sys.argv[1]; b=json.load(open(d+'/bundle.json'))
for k in ('ca','cert','key'): open(f'{d}/{k}.pem','w').write(b[k])
open(d+'/id','w').write(b['device_id'])
EOF
ID=$(cat "$WORK/id"); chmod 644 "$WORK"/*.pem
SUB=(eclipse-mosquitto:2.0.22 mosquitto_sub -h "$LAN" -p 18883 --cafile /d/ca.pem --cert /d/cert.pem --key /d/key.pem)
docker run -d --name isno-e2e-device -v "$WORK:/d:ro" "${SUB[@]}" -t "openprofalux/$ID/cover/volet/set" -C 1 -W 25 >/dev/null; sleep 3
curl -s -o /dev/null -b "$J" -X POST -H 'content-type: application/json' -d "{\"device_id\":\"$ID\",\"slug\":\"volet\",\"action\":\"DOWN\"}" "$B/api/cmd"
sleep 3; chk "commande recue par le boitier (mTLS, nom verifie)" "$(docker logs isno-e2e-device 2>&1)" "CLOSE"
chk "isolation : un autre topic ne recoit rien" "$(docker run --rm -v "$WORK:/d:ro" "${SUB[@]}" -t 'openprofalux/opf-autre/#' -C 1 -W 4 2>&1 | grep -vc 'Timed out')" 0

echo "== reconciliation : la config change de nom, le certificat suit"
FP1=$(docker exec isno-cloud-server openssl x509 -in /broker-certs/server.crt -noout -fingerprint -sha256)
docker exec isno-cloud-server sh -c "sed -i 's#mqtts://$LAN:18883#mqtts://localtest.me:18883#' /data/portal.config.json"
docker restart isno-cloud-server >/dev/null; sleep 6; curl -s -o /dev/null -X POST -d 'user=admin&pass=operateur-e2e' "$B/api/login"; sleep 8
FP2=$(docker exec isno-cloud-server openssl x509 -in /broker-certs/server.crt -noout -fingerprint -sha256)
chk "certificat reemis au nouveau nom" "$([ "$FP1" != "$FP2" ] && docker exec isno-cloud-server openssl x509 -in /broker-certs/server.crt -noout -ext subjectAltName | tail -1 | grep -c localtest.me)" 1
chk "le broker presente le nouveau certificat" "$(echo | openssl s_client -connect "$LAN:18883" 2>/dev/null | openssl x509 -noout -fingerprint -sha256)" "$FP2"

echo; echo "RESULTAT : $ok OK, $ko KO"; [ "$ko" = 0 ]
