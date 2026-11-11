#!/usr/bin/env bash
# Test d'intégration bout-en-bout : enrôlement -> auth -> relais -> réception par le device,
# contre un vrai broker mTLS. STORE : sqlite (défaut) ou mongo.
#   scripts/integration-test.sh          # SQLite
#   scripts/integration-test.sh mongo    # MongoDB (démarre un conteneur mongo)
# N'écrit QUE dans des dossiers jetables (ne touche jamais certs/ du dépôt).
set -euo pipefail
STORE="${1:-sqlite}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
NET="isno-it-$$"; IMG=eclipse-mosquitto:2.0.22
WORK="$(mktemp -d)"; mkdir -p "$WORK/certs" "$WORK/config" "$WORK/dev"
cleanup(){
  docker rm -f it-broker it-server it-mongo >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  docker run --rm -v "$WORK:/w" alpine chown -R "$(id -u):$(id -g)" /w >/dev/null 2>&1 || true
  rm -rf "$WORK" || true
}
trap cleanup EXIT

echo "== build serveur =="; docker build -q -t isno-cloud-server:dev ./server >/dev/null
C="$WORK/certs"
openssl genrsa -out "$C/ca.key" 2048 2>/dev/null
openssl req -x509 -new -nodes -key "$C/ca.key" -sha256 -days 3650 -subj "/CN=ISNO Test CA" -out "$C/ca.crt" 2>/dev/null
openssl genrsa -out "$C/server.key" 2048 2>/dev/null
openssl req -new -key "$C/server.key" -subj "/CN=broker" -out "$C/s.csr" 2>/dev/null
printf "subjectAltName=DNS:broker,DNS:localhost,IP:127.0.0.1\n" > "$C/san.cnf"
openssl x509 -req -in "$C/s.csr" -CA "$C/ca.crt" -CAkey "$C/ca.key" -CAcreateserial -sha256 -days 365 -extfile "$C/san.cnf" -out "$C/server.crt" 2>/dev/null
openssl genrsa -out "$C/relay.key" 2048 2>/dev/null
openssl req -new -key "$C/relay.key" -subj "/CN=relay" -out "$C/r.csr" 2>/dev/null
openssl x509 -req -in "$C/r.csr" -CA "$C/ca.crt" -CAkey "$C/ca.key" -CAcreateserial -sha256 -days 365 -out "$C/relay.crt" 2>/dev/null
cp config/mosquitto.conf config/acl "$WORK/config/"

docker network create "$NET" >/dev/null
docker run -d --name it-broker --network "$NET" --network-alias broker \
  -v "$WORK/config:/mosquitto/config" -v "$WORK/certs:/mosquitto/certs" $IMG >/dev/null
MONGO_ENV=""
if [ "$STORE" = mongo ]; then
  docker run -d --name it-mongo --network "$NET" mongo:8.0 >/dev/null
  MONGO_ENV="-e MONGO_URL=mongodb://it-mongo:27017"; sleep 5
fi
docker run -d --name it-server --network "$NET" -p 18080:8080 -v "$WORK/certs:/certs" \
  -e ADMIN_TOKEN=tok -e ADMIN_PASS=pass123 -e SESSION_SECRET=s3cr3t \
  -e CERTS_DIR=/certs -e BROKER_URL=mqtts://broker:8883 $MONGO_ENV isno-cloud-server:dev >/dev/null
sleep 4
H='-H content-type:application/json'; base=http://127.0.0.1:18080
echo "== store : $(docker logs it-server 2>&1 | grep -o '\[store\].*') =="
CODE=$(curl -s $H -X POST $base/api/device/new -H "authorization: Bearer tok" -d '{"name":"Volet test"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['code'])")
R=$(curl -s $H -X POST $base/api/enroll -d "{\"code\":\"$CODE\"}")
DID=$(echo "$R" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['device_id']);open('$WORK/dev/dev.crt','w').write(d['cert']);open('$WORK/dev/dev.key','w').write(d['key'])")
echo "enrôlé : $DID"
curl -s $H -X POST $base/api/enroll -d "{\"code\":\"$CODE\"}" | grep -q error || { echo "ECHEC: code réutilisable"; exit 1; }
curl -s $H -c "$WORK/ck" -o /dev/null -X POST $base/login -d '{"user":"admin","pass":"pass123"}'
( docker run --rm --network "$NET" -v "$WORK/certs:/c:ro" -v "$WORK/dev:/d:ro" $IMG \
    mosquitto_sub -W 6 --cafile /c/ca.crt --cert /d/dev.crt --key /d/dev.key -h broker -p 8883 --insecure \
    -t "openprofalux/$DID/cover/+/set" > "$WORK/recv" 2>&1 ) &
sleep 2
curl -s $H -b "$WORK/ck" -X POST $base/api/cmd -d "{\"device_id\":\"$DID\",\"action\":\"DOWN\"}" >/dev/null
sleep 4
GOT=$(grep -v '^$' "$WORK/recv" | head -1 || true)
echo "device a reçu : '$GOT'"
[ "$GOT" = "CLOSE" ] || { echo "ECHEC: attendu CLOSE ; broker: $(docker logs it-broker 2>&1 | tail -2)"; exit 1; }
curl -s -b "$WORK/ck" $base/ | grep -q "Volet test" || { echo "ECHEC: app ne liste pas le device"; exit 1; }
echo "OK ($STORE) : enrôlement + usage unique + auth + relais + réception + app"
