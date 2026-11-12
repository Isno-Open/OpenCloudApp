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
  supervisor:
    environment:
      - PLUGIN_CATALOG_PATH=/e2e/plugins.json
      - NODE_EXTRA_CA_CERTS=/e2e/ca.pem
    volumes:
      - $WORK/plugins.json:/e2e/plugins.json:ro
      - $WORK/ca.pem:/e2e/ca.pem:ro
EOF
# source de catalogue tierce, servie en https dans le reseau de la pile (AC de test, connue du seul superviseur de test)
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj "/CN=e2e-ca" -keyout "$WORK/ca.key" -out "$WORK/ca.pem" 2>/dev/null
openssl req -newkey rsa:2048 -nodes -subj "/CN=isno-e2e-catalog" -keyout "$WORK/src.key" -out "$WORK/src.csr" 2>/dev/null
printf 'subjectAltName=DNS:isno-e2e-catalog\n' > "$WORK/san.ext"
openssl x509 -req -in "$WORK/src.csr" -CA "$WORK/ca.pem" -CAkey "$WORK/ca.key" -CAcreateserial -days 1 -extfile "$WORK/san.ext" -out "$WORK/src.pem" 2>/dev/null
cat > "$WORK/third.json" <<'JSON'
{ "tiers": { "title": "Plugin tiers", "description": { "fr": "Venu d'une source ajoutee.", "en": "From an added source." }, "image": "tiers/plugin:1.0.0" },
  "example": { "title": "Imposteur", "description": { "fr": "x", "en": "x" }, "image": "tiers/piege:1.0.0" } }
JSON
chmod 644 "$WORK"/*.pem "$WORK"/*.key "$WORK"/*.json
# catalogue de test : le plugin d'exemple du depot, construit ici (image locale, pas de registre)
cat > "$WORK/plugins.json" <<'JSON'
{ "example": { "title": "Exemple", "description": { "fr": "Plugin de reference.", "en": "Reference plugin." }, "image": "isno-cloud-plugin-example:e2e" } }
JSON
docker build -q -f plugins/example/Dockerfile -t isno-cloud-plugin-example:e2e . >/dev/null || { echo "construction du plugin d'exemple impossible"; exit 2; }
C=(docker compose -p isnoe2e -f docker-compose.yml -f "$WORK/override.yml")
teardown() {
  docker rm -f isno-mqtt isno-mongo isno-e2e-device isno-e2e-mail isno-e2e-catalog >/dev/null 2>&1
  "${C[@]}" down -v >/dev/null 2>&1
  docker volume rm isno-broker-data isno-mongo-data isno-plugins >/dev/null 2>&1
  [ "$ENV_CREATED" = 1 ] && rm -f .env
  rm -rf "$WORK"
}
trap teardown EXIT
[ -n "${E2E_KEEP:-}" ] && trap - EXIT
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

echo "== types d'appareils : un type gere a sa carte, tout autre est un appareil inconnu"
PUB=(eclipse-mosquitto:2.0.22 mosquitto_pub -h "$LAN" -p 18883 --cafile /d/ca.pem --cert /d/cert.pem --key /d/key.pem -r)
docker run --rm -v "$WORK:/d:ro" "${PUB[@]}" -t "openprofalux/$ID/cover/salon/attrs" -m '{"type":"volet","positional":true}'
docker run --rm -v "$WORK:/d:ro" "${PUB[@]}" -t "openprofalux/$ID/cover/pergola/attrs" -m '{"type":"pergola","positional":false}'
docker run --rm -v "$WORK:/d:ro" "${PUB[@]}" -t "openprofalux/$ID/cover/mystere/attrs" -m '{"positional":false}'
sleep 3; PAGE=$(curl -s -b "$J" "$B/")
chk "type gere : une carte de commande" "$(echo "$PAGE" | grep -c 'data-slug="salon"')" 1
chk "type non gere : pas de commandes" "$(echo "$PAGE" | grep -c 'data-slug="pergola"')" 0
chk "type non gere : nomme dans la carte inconnue" "$(echo "$PAGE" | grep -c 'Type « pergola » non géré par ce portail.')" 1
chk "aucun type declare : dit tel quel" "$(echo "$PAGE" | grep -c 'Le boîtier ne déclare aucun type pour cet appareil.')" 1

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
# reglages du plugin « Comptes locaux », par l'ecran generique des plugins (valeurs du formulaire declare)
setsec() { curl -s -o /dev/null -w '%{http_code}' -b "$J" -X POST -H 'content-type: application/json' -d "{\"id\":\"local-accounts\",\"values\":$1}" "$B/api/settings/plugin"; }
login() { curl -s -o /dev/null -w '%{redirect_url}' -c "${3:-/dev/null}" -X POST --data-urlencode "user=$1" --data-urlencode "pass=$2" "$B/api/login"; }
chk "nom du portail enregistre" "$(curl -s -o /dev/null -w '%{http_code}' -b "$J" -X POST -H 'content-type: application/json' -d '{"appName":"Maison Durand"}' "$B/api/settings/general")" 200
chk "nom du portail dans le titre" "$(curl -s -b "$J" "$B/parametres" | grep -c '<title>Paramètres · Maison Durand</title>')" 1
chk "reglages de securite enregistres" "$(setsec '{"lockoutEnabled":true,"lockoutMaxFailures":3,"lockoutMinutes":1,"totp":"optional","passwordMinLength":12}')" 200
chk "regle de mot de passe : 10 caracteres refuses (minimum 12)" "$(curl -s -o /dev/null -w '%{http_code}' -b "$J" -X POST -H 'content-type: application/json' -d '{"email":"bob@exemple.fr","name":"Bob","password":"court12345","cap":5}' "$B/api/user/new")" 400
chk "compte bob cree (mot de passe conforme)" "$(curl -s -o /dev/null -w '%{http_code}' -b "$J" -X POST -H 'content-type: application/json' -d '{"email":"bob@exemple.fr","name":"Bob","password":"bob-mot-de-passe","cap":5}' "$B/api/user/new")" 200
for _ in 1 2; do login bob@exemple.fr faux >/dev/null; done
chk "3e echec : compte bloque" "$(login bob@exemple.fr faux | grep -c 'e=locked')" 1
chk "bloque : meme le bon mot de passe est refuse" "$(login bob@exemple.fr bob-mot-de-passe | grep -c 'e=locked')" 1
chk "l'operateur debloque bob" "$(curl -s -o /dev/null -w '%{http_code}' -b "$J" -X POST -H 'content-type: application/json' -d '{"id":"bob@exemple.fr"}' "$B/api/user/unlock")" 200
JB="$WORK/jar-bob"; chk "bob se connecte apres deblocage" "$(login bob@exemple.fr bob-mot-de-passe "$JB")" "$B/"
chk "captcha active" "$(setsec '{"captcha":true,"lockoutEnabled":true,"lockoutMaxFailures":3,"lockoutMinutes":1,"totp":"optional","passwordMinLength":12}')" 200
chk "captcha : connexion sans le code refusee" "$(login bob@exemple.fr bob-mot-de-passe | grep -c 'e=captcha')" 1
PAGE=$(curl -s "$B/connexion?local=1"); TOK=$(echo "$PAGE" | grep -o 'name="captcha_token" value="[^"]*"' | cut -d'"' -f4)
CODE=$(echo "$PAGE" | grep -o '<svg[^§]*</svg>' | head -1 | grep -o '>[A-Z0-9]</text>' | tr -d '<>/text' | tr -d '\n')
chk "captcha : avec le bon code, connexion acceptee" "$(curl -s -o /dev/null -w '%{redirect_url}' -X POST --data-urlencode 'user=bob@exemple.fr' --data-urlencode 'pass=bob-mot-de-passe' --data-urlencode "captcha=$CODE" --data-urlencode "captcha_token=$TOK" "$B/api/login")" "$B/"
setsec '{"captcha":false,"lockoutEnabled":true,"lockoutMaxFailures":3,"lockoutMinutes":1,"totp":"optional","passwordMinLength":12}' >/dev/null
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

echo "== messagerie : SMTP de test (Mailpit, rien ne sort), invitation, mot de passe oublie"
docker run -d --name isno-e2e-mail --network isno-cloud-net -p 18025:8025 axllent/mailpit:v1.33.1 >/dev/null
for _ in $(seq 1 30); do curl -s -o /dev/null http://127.0.0.1:18025/api/v1/messages && break; sleep 1; done
# texte du dernier e-mail recu par une adresse (vide s'il n'y en a pas)
mail_text() { sleep 1; local id; id=$(curl -s "http://127.0.0.1:18025/api/v1/search?query=to:$1" | python3 -c 'import sys,json;m=json.load(sys.stdin)["messages"];print(m[0]["ID"] if m else "")'); [ -n "$id" ] && curl -s "http://127.0.0.1:18025/api/v1/message/$id" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["Subject"]);print(d["Text"])'; }
mail_count() { curl -s "http://127.0.0.1:18025/api/v1/search?query=to:$1" | python3 -c 'import sys,json;print(json.load(sys.stdin)["messages_count"])'; }
link_token() { grep -o 't=[^ ]*' | head -1 | cut -c3- | python3 -c 'import sys,urllib.parse;print(urllib.parse.unquote(sys.stdin.read().strip()))'; }
apiJ() { curl -s -o /dev/null -w '%{http_code}' -b "$J" -X POST -H 'content-type: application/json' -d "$2" "$B$1"; }
chk "sans messagerie : pas de lien « mot de passe oublie »" "$(curl -s "$B/connexion?local=1" | grep -c 'mot-de-passe-oublie')" 0
chk "sans messagerie : creer un compte SANS mot de passe est refuse" "$(apiJ /api/user/new '{"email":"carole@exemple.fr","name":"Carole","cap":5}')" 400
chk "SMTP incomplet refuse (pas d'expediteur)" "$(apiJ /api/settings/general '{"smtp":{"host":"isno-e2e-mail","port":1025,"security":"none"}}')" 400
chk "SMTP enregistre" "$(apiJ /api/settings/general '{"smtp":{"host":"isno-e2e-mail","port":1025,"security":"none","fromEmail":"portail@exemple.fr","fromName":"Maison Durand"}}')" 200
chk "messagerie enregistree sans toucher au nom du portail" "$(curl -s -b "$J" "$B/parametres" | grep -c '<title>Paramètres · Maison Durand</title>')" 1
chk "e-mail de test envoye" "$(apiJ /api/settings/smtp-test '{"lang":"fr"}')" 200
chk "e-mail de test recu par l'operateur" "$(mail_text operateur@exemple.fr | head -1)" "Test de messagerie : Maison Durand"
chk "invitation : compte cree sans mot de passe" "$(apiJ /api/user/new '{"email":"carole@exemple.fr","name":"Carole","cap":5,"lang":"fr"}')" 200
INV=$(mail_text carole@exemple.fr); TOKI=$(echo "$INV" | link_token)
chk "invitation recue, au nom du portail" "$(echo "$INV" | head -1)" "Invitation : Maison Durand"
chk "invitation : lien vers la page publique du portail" "$(echo "$INV" | grep -c "$B/mot-de-passe?t=")" 1
chk "Utilisateurs : compte marque « invite », avec « renvoyer »" "$(curl -s -b "$J" "$B/utilisateurs" | grep -c 'data-invite="carole@exemple.fr"')" 1
chk "invitation renvoyee" "$(apiJ /api/user/invite-resend '{"id":"carole@exemple.fr","lang":"fr"}')" 200
INV=$(mail_text carole@exemple.fr); TOKI=$(echo "$INV" | link_token)
chk "invitee : pas de connexion avant d'avoir choisi" "$(login carole@exemple.fr '' | grep -c 'e=1$')" 1
chk "invitee : le lien ouvre le formulaire" "$(curl -s "$B/mot-de-passe?t=$TOKI" | grep -c 'id="pw2"')" 1
chk "invitee : mot de passe trop court refuse" "$(post /api/password/set "{\"token\":\"$TOKI\",\"password\":\"court\"}" | grep -c 'trop court')" 1
chk "invitee : mot de passe choisi" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' -d "{\"token\":\"$TOKI\",\"password\":\"carole-mot-de-passe\"}" "$B/api/password/set")" 200
chk "invitee : connexion avec son mot de passe" "$(login carole@exemple.fr carole-mot-de-passe)" "$B/"
chk "lien d'invitation rejoue : refuse (usage unique)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' -d "{\"token\":\"$TOKI\",\"password\":\"autre-mot-de-passe\"}" "$B/api/password/set")" 400
chk "lien rejoue : la page le dit" "$(curl -s "$B/mot-de-passe?t=$TOKI" | grep -c 'a déjà servi')" 1
chk "connexion : lien « mot de passe oublie » present" "$(curl -s "$B/connexion?local=1" | grep -c 'href="/mot-de-passe-oublie"')" 1
chk "oubli : reponse identique pour un compte inconnu" "$(post /api/password/forgot '{"email":"personne@exemple.fr"}')" '{"ok":true}'
chk "oubli : reponse identique pour un compte connu" "$(post /api/password/forgot '{"email":"carole@exemple.fr","lang":"fr"}')" '{"ok":true}'
RST=$(mail_text carole@exemple.fr); TOKR=$(echo "$RST" | link_token)
chk "oubli : e-mail recu par le compte connu" "$(echo "$RST" | head -1)" "Mot de passe : Maison Durand"
chk "oubli : rien envoye a une adresse inconnue" "$(mail_count personne@exemple.fr)" 0
chk "oubli : un lien de reinitialisation ne vaut pas invitation (et inversement)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' -d "{\"token\":\"$TOKI\",\"password\":\"x-nouveau-mot-de-passe\"}" "$B/api/password/set")" 400
chk "oubli : nouveau mot de passe enregistre" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' -d "{\"token\":\"$TOKR\",\"password\":\"carole-nouveau-mdp\"}" "$B/api/password/set")" 200
chk "oubli : l'ancien mot de passe ne marche plus" "$(login carole@exemple.fr carole-mot-de-passe | grep -c 'e=1$')" 1
chk "oubli : le nouveau marche" "$(login carole@exemple.fr carole-nouveau-mdp)" "$B/"
[ -n "${E2E_KEEP:-}" ] && { echo "pile laissee en place (E2E_KEEP)"; exit 0; }
chk "messagerie retiree (serveur vide)" "$(apiJ /api/settings/general '{"smtp":{"host":""}}')" 200
chk "sans messagerie : page « oubli » renvoie a la connexion" "$(curl -s -o /dev/null -w '%{http_code}' "$B/mot-de-passe-oublie")" 302
chk "sans messagerie : API « oubli » fermee" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' -d '{"email":"carole@exemple.fr"}' "$B/api/password/forgot")" 404

echo "== page Plugins : catalogue ISNO, installation par le superviseur, reglages, retrait"
# le portail redemarre de lui-meme apres activation ou retrait : on attend son retour, puis on se reconnecte
wait_restart() { sleep 2; for _ in $(seq 1 60); do curl -s -o /dev/null "$B/api/setup/status" && break; sleep 1; done; sleep 1; curl -s -o /dev/null -c "$J" -X POST -d 'user=operateur@exemple.fr&pass=operateur-e2e' "$B/api/login"; }
PL=$(curl -s -b "$J" "$B/plugins")
chk "Plugins : « Gestion des comptes » installee, avec son ecrou" "$(echo "$PL" | grep -c 'href="/plugins/local-accounts"')" 1
chk "Plugins : elle se retire (la connexion est native)" "$(echo "$PL" | grep -c 'data-disable="local-accounts"')" 1
chk "catalogue jamais vide : la gestion des comptes y figure, marquee installee" "$(echo "$PL" | grep -c '✓ installé')" 1
chk "Plugins : l'exemple du catalogue est propose" "$(echo "$PL" | grep -c 'data-install="example"')" 1
chk "source http refusee" "$(apiJ /api/plugins/sources '{"add":"http://exemple.fr/plugins.json"}')" 400
chk "source https injoignable refusee (rien n'est garde)" "$(apiJ /api/plugins/sources '{"add":"https://nexiste-pas.invalid/plugins.json"}')" 400
docker run -d --name isno-e2e-catalog --network isno-cloud-net -v "$WORK":/w:ro node:26.13.1-trixie-slim node -e "require('https').createServer({key:require('fs').readFileSync('/w/src.key'),cert:require('fs').readFileSync('/w/src.pem')},(q,r)=>{r.setHeader('content-type','application/json');r.end(require('fs').readFileSync('/w/third.json'))}).listen(443)" >/dev/null; sleep 2
chk "source https valide ajoutee" "$(apiJ /api/plugins/sources '{"add":"https://isno-e2e-catalog/plugins.json"}')" 200
PL=$(curl -s -b "$J" "$B/plugins")
chk "catalogue : le plugin de la source est propose, avec son origine" "$(echo "$PL" | grep -c 'isno-e2e-catalog</span>')" 1
chk "catalogue : la source ne remplace pas le plugin ISNO de meme identifiant" "$(echo "$PL" | grep -c 'Imposteur')" 0
chk "sources : le conflit est signale sous la source" "$(echo "$PL" | grep -c 'existe deja')" 1
chk "source retiree" "$(apiJ /api/plugins/sources '{"remove":"https://isno-e2e-catalog/plugins.json"}')" 200
chk "source retiree : son plugin n'est plus propose" "$(curl -s -b "$J" "$B/plugins" | grep -c 'data-install="tiers"')" 0
chk "aucune source gardee apres les refus" "$(curl -s -b "$J" "$B/plugins" | grep -c 'data-source-remove="')" 0
chk "activer un plugin non installe : refuse" "$(apiJ /api/plugins/enable '{"id":"example"}')" 404
chk "installation lancee" "$(apiJ /api/plugins/install '{"id":"example"}')" 200
for _ in $(seq 1 60); do curl -s -b "$J" "$B/api/plugins/status?id=example" | grep -q '"busy":false' && break; sleep 1; done
chk "installation terminee sans erreur" "$(curl -s -b "$J" "$B/api/plugins/status?id=example" | grep -c '"error"')" 0
chk "activation (le portail redemarre)" "$(apiJ /api/plugins/enable '{"id":"example"}')" 200
wait_restart
PL=$(curl -s -b "$J" "$B/plugins")
chk "apres redemarrage : l'exemple est installe" "$(echo "$PL" | grep -c 'href="/plugins/example"')" 1
chk "apres redemarrage : il n'est plus propose" "$(echo "$PL" | grep -c 'data-install="example"')" 0
chk "ecran de l'exemple : ses reglages declares" "$(curl -s -b "$J" "$B/plugins/example" | grep -c 'data-key="times"')" 1
chk "reglage hors bornes enregistre" "$(apiJ /api/settings/plugin '{"id":"example","values":{"greet":true,"times":9}}')" 200
chk "le plugin a borne la valeur (9 -> 5)" "$(curl -s -b "$J" "$B/plugins/example" | grep -o 'data-key="times"[^>]*' | grep -c 'value="5"')" 1
echo "== mise a jour d'un plugin : version plus recente au catalogue"
chk "installe : l'etiquette porte l'image du catalogue" "$(docker run --rm -v isno-plugins:/p:ro busybox:1.38.0-musl cat /p/example/.image)" "isno-cloud-plugin-example:e2e"
chk "a jour : aucune mise a jour proposee" "$(curl -s -b "$J" "$B/plugins" | grep -c 'Mettre à jour')" 0
docker tag isno-cloud-plugin-example:e2e isno-cloud-plugin-example:e2e2
sed 's/isno-cloud-plugin-example:e2e"/isno-cloud-plugin-example:e2e2"/' "$WORK/plugins.json" > "$WORK/plugins.next" && cat "$WORK/plugins.next" > "$WORK/plugins.json"
# le superviseur redemarre : on attend qu'il reponde de nouveau (la page affiche alors la mise a jour)
docker restart isno-supervisor >/dev/null; for _ in $(seq 1 40); do curl -s -b "$J" "$B/plugins" | grep -q 'Mettre à jour' && break; sleep 1; done
chk "version plus recente au catalogue : mise a jour proposee" "$(curl -s -b "$J" "$B/plugins" | grep -c 'Mettre à jour (e2e → e2e2)')" 1
chk "mise a jour lancee" "$(apiJ /api/plugins/install '{"id":"example"}')" 200
for _ in $(seq 1 60); do curl -s -b "$J" "$B/api/plugins/status?id=example" | grep -q '"busy":false' && break; sleep 1; done
chk "mise a jour : nouvelle etiquette" "$(docker run --rm -v isno-plugins:/p:ro busybox:1.38.0-musl cat /p/example/.image)" "isno-cloud-plugin-example:e2e2"
chk "mise a jour : le portail recharge (redemarrage)" "$(apiJ /api/plugins/enable '{"id":"example"}')" 200
wait_restart
chk "apres mise a jour : plus rien a mettre a jour" "$(curl -s -b "$J" "$B/plugins" | grep -c 'Mettre à jour')" 0
chk "apres mise a jour : toujours installe" "$(curl -s -b "$J" "$B/plugins" | grep -c 'href="/plugins/example"')" 1
chk "desinstallation (le portail redemarre)" "$(apiJ /api/plugins/disable '{"id":"example"}')" 200
wait_restart
chk "apres desinstallation : de nouveau propose" "$(curl -s -b "$J" "$B/plugins" | grep -c 'data-install="example"')" 1
for _ in $(seq 1 20); do docker run --rm -v isno-plugins:/p:ro busybox:1.38.0-musl test -e /p/example || break; sleep 1; done
chk "apres desinstallation : code retire du volume" "$(docker run --rm -v isno-plugins:/p:ro busybox:1.38.0-musl sh -c 'test -e /p/example && echo present || echo absent')" absent

echo "== connexion par un site externe (plugin integre, cookie signe partage)"
chk "activation (le portail redemarre)" "$(apiJ /api/plugins/enable '{"id":"external-auth"}')" 200
wait_restart
chk "reglages : adresse en http refusee (vide)" "$(apiJ /api/settings/plugin '{"id":"external-auth","values":{"loginUrl":"http://boutique.exemple.fr/compte"}}')" 200
chk "reglages : l'adresse http n'est pas gardee" "$(curl -s -b "$J" "$B/plugins/external-auth" | grep -c 'value="http://boutique')" 0
chk "reglages enregistres" "$(apiJ /api/settings/plugin '{"id":"external-auth","values":{"loginUrl":"https://boutique.exemple.fr/compte","logoutUrl":"https://boutique.exemple.fr/sortie","cookieName":"isno_account","cookieDomain":".exemple.fr"}}')" 200
# secret partage : cree par le plugin a sa premiere activation (pas de SSO_SECRET dans cet environnement)
SEC=$(docker exec isno-cloud-server node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync("/data/plugin-secrets.json","utf8"))["external-auth"]||"")')
chk "secret partage cree a la premiere activation" "$(echo -n "$SEC" | wc -c | awk '{print ($1>=40)}')" 1
chk "secret montre dans l'ecrou, masque" "$(curl -s -b "$J" "$B/plugins/external-auth" | grep -c "type=\"password\"[^>]*value=\"$SEC\"")" 1
chk "secret jamais ecrit dans la config" "$(docker exec isno-cloud-server grep -c "$SEC" /data/portal.config.json)" 0
SSOC="isno_account=$(docker exec -e S="$SEC" isno-cloud-server node -e '
const c=require("crypto");const p=Buffer.from("client-sso@exemple.fr").toString("base64url")+"."+(Date.now()+600000);
process.stdout.write(p+"."+c.createHmac("sha256",process.env.S).update(p).digest("base64url"))')"
FORGED="isno_account=$(echo "$SSOC" | cut -d= -f2 | sed 's/.$/x/')"
chk "visiteur sans session : renvoye vers l'adresse de connexion" "$(curl -s -o /dev/null -w '%{redirect_url}' "$B/connexion")" "https://boutique.exemple.fr/compte"
chk "cookie signe valide : connecte" "$(curl -s -o /dev/null -w '%{http_code}' -H "cookie: $SSOC" "$B/compte")" 200
chk "cookie signe valide : compte cree a la premiere visite" "$(curl -s -b "$J" "$B/utilisateurs" | grep -c 'client-sso@exemple.fr')" 1
chk "cookie altere : pas connecte" "$(curl -s -o /dev/null -w '%{http_code}' -H "cookie: $FORGED" "$B/compte")" 302
LOGOUT=$(curl -s -D - -X POST -H "cookie: $SSOC" "$B/api/logout")
chk "deconnexion : renvoie vers l'adresse de deconnexion" "$(echo "$LOGOUT" | grep -c '"redirect":"https://boutique.exemple.fr/sortie"')" 1
chk "deconnexion : cookie partage efface sur le domaine commun" "$(echo "$LOGOUT" | grep -ic '^set-cookie: isno_account=; Domain=.exemple.fr')" 1
chk "desactivation (le portail redemarre)" "$(apiJ /api/plugins/disable '{"id":"external-auth"}')" 200
wait_restart
chk "desactive : formulaire local de nouveau" "$(curl -s -o /dev/null -w '%{http_code}' "$B/connexion")" 200
chk "desactive : le secret partage est garde" "$(docker exec isno-cloud-server node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync("/data/plugin-secrets.json","utf8"))["external-auth"]||"")')" "$SEC"

echo "== Instance : adresse du portail modifiable apres verification"
chk "adresse qui mene a ce portail : enregistree" "$(apiJ /api/settings/portal-host "{\"host\":\"$APP\"}")" 200
chk "adresse qui ne se resout pas : refusee" "$(apiJ /api/settings/portal-host '{"host":"nexiste-pas.invalid"}')" 400
chk "adresse refusee : la config n'a pas change" "$(curl -s -b "$J" "$B/parametres" | grep -c "value=\"$APP\"")" 1

echo "== compte unique : sans le plugin de gestion des comptes, la connexion reste native"
chk "Parametres ne liste plus les plugins (page a part)" "$(curl -s -b "$J" "$B/parametres" | grep -c 'href="/plugins/local-accounts"')" 0
chk "ecran du plugin : ses reglages declares" "$(curl -s -b "$J" "$B/plugins/local-accounts" | grep -c 'data-key="lockoutMaxFailures"')" 1
chk "ecran du plugin : un seul bouton Enregistrer" "$(curl -s -b "$J" "$B/plugins/local-accounts" | grep -c '>Enregistrer</button>')" 1
chk "Parametres : un seul bouton Enregistrer" "$(curl -s -b "$J" "$B/parametres" | grep -c '>Enregistrer</button>')" 1
chk "plugin inconnu : reglages refuses" "$(apiJ /api/settings/plugin '{"id":"inconnu","values":{}}')" 404
chk "retrait de la gestion des comptes (le portail redemarre)" "$(apiJ /api/plugins/disable '{"id":"local-accounts"}')" 200
wait_restart
chk "sans plugin : l'operateur se connecte toujours (connexion native)" "$(curl -s -o /dev/null -w '%{redirect_url}' -c "$J" -X POST -d 'user=operateur@exemple.fr&pass=operateur-e2e' "$B/api/login")" "$B/"
chk "sans plugin : pas d'ecran Utilisateurs dans la barre" "$(curl -s -b "$J" "$B/" | grep -c 'href="/utilisateurs"')" 0
chk "sans plugin : l'API des comptes est fermee" "$(apiJ /api/user/new '{"email":"x@exemple.fr","name":"X","password":"mot-de-passe-long","cap":5}')" 403
chk "sans plugin : la page Plugins propose de l'activer" "$(curl -s -b "$J" "$B/plugins" | grep -c 'data-enable="local-accounts"')" 1

echo; echo "RESULTAT : $ok OK, $ko KO"; [ "$ko" = 0 ]
