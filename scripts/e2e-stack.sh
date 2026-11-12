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
chk "enregistrement" "$(post /api/setup/save "{\"kind\":\"$KIND\",\"appHost\":\"$APP\",\"brokerHost\":\"$LAN\",\"adminEmail\":\"Operateur@Exemple.fr\",\"adminName\":\"Opérateur E2E\",\"adminPassword\":\"operateur-e2e\"}")" '{"ok":true}'
for _ in $(seq 1 60); do sleep 1; curl -s "$B/api/setup/status" 2>/dev/null | grep -q '"configured":true' && break; done
J="$WORK/jar"; curl -s -o /dev/null -c "$J" -X POST -d 'user=operateur@exemple.fr&pass=operateur-e2e' "$B/api/login"
sleep 6
chk "setup ferme une fois configure" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' -d '{}' "$B/api/setup/save")" 409
chk "connexion de l'operateur par e-mail (insensible a la casse)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -d 'user=OPERATEUR@exemple.fr&pass=operateur-e2e' "$B/api/login")" 303
chk "l'operateur voit Parametres et Utilisateurs" "$(curl -s -b "$J" "$B/" | grep -oE 'href="/(parametres|utilisateurs)"' | wc -l)" 2
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
docker restart isno-cloud-server >/dev/null; sleep 6; curl -s -o /dev/null -X POST -d 'user=operateur@exemple.fr&pass=operateur-e2e' "$B/api/login"; sleep 8
FP2=$(docker exec isno-cloud-server openssl x509 -in /broker-certs/server.crt -noout -fingerprint -sha256)
chk "certificat reemis au nouveau nom" "$([ "$FP1" != "$FP2" ] && docker exec isno-cloud-server openssl x509 -in /broker-certs/server.crt -noout -ext subjectAltName | tail -1 | grep -c localtest.me)" 1
chk "le broker presente le nouveau certificat" "$(echo | openssl s_client -connect "$LAN:18883" 2>/dev/null | openssl x509 -noout -fingerprint -sha256)" "$FP2"

echo "== parametres et securite des comptes locaux"
totp_code() { python3 - "$1" "$2" <<'PY'
import sys,hmac,hashlib,struct,time,base64
sec=base64.b32decode(sys.argv[1]+'='*(-len(sys.argv[1])%8)); step=int(time.time()//30)+int(sys.argv[2])
h=hmac.new(sec,struct.pack('>Q',step),hashlib.sha1).digest(); o=h[-1]&15
print(str((struct.unpack('>I',h[o:o+4])[0]&0x7fffffff)%1000000).zfill(6))
PY
}
setsec() { curl -s -o /dev/null -w '%{http_code}' -b "$J" -X POST -H 'content-type: application/json' -d "$1" "$B/api/settings/security"; }
login() { curl -s -o /dev/null -w '%{redirect_url}' -c "${3:-/dev/null}" -X POST --data-urlencode "user=$1" --data-urlencode "pass=$2" "$B/api/login"; }
chk "nom du portail enregistre" "$(curl -s -o /dev/null -w '%{http_code}' -b "$J" -X POST -H 'content-type: application/json' -d '{"appName":"Maison Durand"}' "$B/api/settings/general")" 200
chk "nom du portail dans le titre" "$(curl -s -b "$J" "$B/parametres" | grep -c '<title>Paramètres · Maison Durand</title>')" 1
chk "reglages de securite enregistres" "$(setsec '{"lockoutEnabled":true,"maxFailures":3,"lockMinutes":1,"totp":"optional","passwordMinLength":12}')" 200
chk "regle de mot de passe : 10 caracteres refuses (minimum 12)" "$(curl -s -o /dev/null -w '%{http_code}' -b "$J" -X POST -H 'content-type: application/json' -d '{"email":"bob@exemple.fr","name":"Bob","password":"court12345","cap":5}' "$B/api/user/new")" 400
chk "compte bob cree (mot de passe conforme)" "$(curl -s -o /dev/null -w '%{http_code}' -b "$J" -X POST -H 'content-type: application/json' -d '{"email":"bob@exemple.fr","name":"Bob","password":"bob-mot-de-passe","cap":5}' "$B/api/user/new")" 200
for _ in 1 2; do login bob@exemple.fr faux >/dev/null; done
chk "3e echec : compte bloque" "$(login bob@exemple.fr faux | grep -c 'e=locked')" 1
chk "bloque : meme le bon mot de passe est refuse" "$(login bob@exemple.fr bob-mot-de-passe | grep -c 'e=locked')" 1
chk "l'operateur debloque bob" "$(curl -s -o /dev/null -w '%{http_code}' -b "$J" -X POST -H 'content-type: application/json' -d '{"id":"bob@exemple.fr"}' "$B/api/user/unlock")" 200
JB="$WORK/jar-bob"; chk "bob se connecte apres deblocage" "$(login bob@exemple.fr bob-mot-de-passe "$JB")" "$B/"
chk "captcha active" "$(setsec '{"captcha":true,"lockoutEnabled":true,"maxFailures":3,"lockMinutes":1,"totp":"optional","passwordMinLength":12}')" 200
chk "captcha : connexion sans le code refusee" "$(login bob@exemple.fr bob-mot-de-passe | grep -c 'e=captcha')" 1
PAGE=$(curl -s "$B/connexion?local=1"); TOK=$(echo "$PAGE" | grep -o 'name="captcha_token" value="[^"]*"' | cut -d'"' -f4)
CODE=$(echo "$PAGE" | grep -o '<svg[^§]*</svg>' | head -1 | grep -o '>[A-Z0-9]</text>' | tr -d '<>/text' | tr -d '\n')
chk "captcha : avec le bon code, connexion acceptee" "$(curl -s -o /dev/null -w '%{redirect_url}' -X POST --data-urlencode 'user=bob@exemple.fr' --data-urlencode 'pass=bob-mot-de-passe' --data-urlencode "captcha=$CODE" --data-urlencode "captcha_token=$TOK" "$B/api/login")" "$B/"
setsec '{"captcha":false,"lockoutEnabled":true,"maxFailures":3,"lockMinutes":1,"totp":"optional","passwordMinLength":12}' >/dev/null
SEC=$(curl -s -b "$JB" -X POST "$B/api/account/totp/start" | python3 -c 'import sys,json;print(json.load(sys.stdin)["secret"])')
chk "2FA : activation confirmee par un code" "$(curl -s -o /dev/null -w '%{http_code}' -b "$JB" -X POST -H 'content-type: application/json' -d "{\"code\":\"$(totp_code "$SEC" 0)\"}" "$B/api/account/totp/confirm")" 200
JP="$WORK/jar-pending"; chk "2FA : apres le mot de passe, etape du code" "$(login bob@exemple.fr bob-mot-de-passe "$JP" | grep -c 'step=totp')" 1
NEXT=$(totp_code "$SEC" 1)
chk "2FA : code juste, session ouverte" "$(curl -s -o /dev/null -w '%{redirect_url}' -b "$JP" -c "$JB" -X POST --data-urlencode "code=$NEXT" "$B/api/login/totp")" "$B/"
login bob@exemple.fr bob-mot-de-passe "$JP" >/dev/null
chk "2FA : le meme code rejoue est refuse" "$(curl -s -o /dev/null -w '%{redirect_url}' -b "$JP" -X POST --data-urlencode "code=$NEXT" "$B/api/login/totp" | grep -c 'e=totp')" 1
chk "politique « exigee pour les operateurs »" "$(setsec '{"lockoutEnabled":false,"totp":"operators","passwordMinLength":12}')" 200
chk "operateur sans 2FA renvoye vers Compte" "$(curl -s -o /dev/null -w '%{redirect_url}' -b "$J" "$B/")" "$B/compte?totp=required"
setsec '{"totp":"off"}' >/dev/null

echo "== greffons : la gestion des comptes est un greffon (desactive => ecrans et connexion locale absents)"
chk "Parametres liste le greffon « Comptes locaux »" "$(curl -s -b "$J" "$B/parametres" | grep -c 'Comptes locaux')" 1
docker exec isno-cloud-server sh -c "python3 -c 1 2>/dev/null; node -e \"const f='/data/portal.config.json';const c=JSON.parse(require('fs').readFileSync(f));c.plugins=[];require('fs').writeFileSync(f,JSON.stringify(c))\""
docker restart isno-cloud-server >/dev/null; for _ in $(seq 1 30); do curl -s -o /dev/null "$B/api/setup/status" && break; sleep 1; done
chk "sans greffon : connexion locale refusee" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -d 'user=operateur@exemple.fr&pass=operateur-e2e' "$B/api/login")" 404
chk "sans greffon : la page de connexion le dit" "$(curl -s "$B/connexion" | grep -c 'Aucun mode de connexion')" 1

echo; echo "RESULTAT : $ok OK, $ko KO"; [ "$ko" = 0 ]
