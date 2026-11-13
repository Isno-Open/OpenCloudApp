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
      - NODE_EXTRA_CA_CERTS=/e2e/ca.pem   # annuaire d'un site externe servi en https par l'AC de test
    volumes:
      - $WORK/e2e-ca.pem:/e2e/ca.pem:ro
  supervisor:
    environment:
      - PLUGIN_CATALOG_PATH=/e2e/plugins.json
      - NODE_EXTRA_CA_CERTS=/e2e/ca.pem
    volumes:
      - $WORK/plugins.json:/e2e/plugins.json:ro
      - $WORK/e2e-ca.pem:/e2e/ca.pem:ro
EOF
# source de catalogue tierce et annuaire, servis en https dans le reseau de la pile par une AC de test. Fichier
# e2e-ca.pem, PAS ca.pem : le boitier simule depose plus loin le ca.pem du broker dans $WORK (l'ancien nom
# etait ecrase, et un serveur redemarre perdait la confiance dans l'AC de test).
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj "/CN=e2e-ca" -keyout "$WORK/e2e-ca.key" -out "$WORK/e2e-ca.pem" 2>/dev/null
openssl req -newkey rsa:2048 -nodes -subj "/CN=isno-e2e-catalog" -keyout "$WORK/src.key" -out "$WORK/src.csr" 2>/dev/null
printf 'subjectAltName=DNS:isno-e2e-catalog\n' > "$WORK/san.ext"
openssl x509 -req -in "$WORK/src.csr" -CA "$WORK/e2e-ca.pem" -CAkey "$WORK/e2e-ca.key" -CAcreateserial -days 1 -extfile "$WORK/san.ext" -out "$WORK/src.pem" 2>/dev/null
# annuaire d'un site externe (plugin de connexion externe) : servi seulement avec un en-tete signe
cat > "$WORK/directory.json" <<'JSON'
{ "accounts": [ { "email": "annie@exemple.fr", "name": "Annie Annuaire" }, { "email": "pas-un-email" } ] }
JSON
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
# presence annoncee par le boitier (comme le firmware : online retenu a la connexion)
docker run --rm -v "$WORK:/d:ro" "${PUB[@]}" -t "openprofalux/$ID/status" -m 'online'
sleep 3; PAGE=$(curl -s -b "$J" "$B/")
# commandes du salon actives ou non : on lit les boutons de SA carte (data-slug="salon")
salon_disabled() { curl -s -b "$J" "$B/" | grep -o 'data-slug="salon">.\{0,40\}<button[^>]*>' | grep -c 'disabled'; }
chk "presence : boitier annonce en ligne, commandes actives" "$(salon_disabled)" 0
chk "type gere : une carte de commande" "$(echo "$PAGE" | grep -c 'data-slug="salon"')" 1
chk "type gere : libelles declares par son plugin" "$(echo "$PAGE" | grep -c 'aria-label="Montée"')" 1
chk "type non gere : pas de commandes" "$(echo "$PAGE" | grep -c 'data-slug="pergola"')" 0
chk "type non gere : nomme dans la carte inconnue" "$(echo "$PAGE" | grep -c 'Type « pergola » non géré par ce portail.')" 1
chk "aucun type declare : dit tel quel" "$(echo "$PAGE" | grep -c 'Le boîtier ne déclare aucun type pour cet appareil.')" 1
# le boitier disparait : son testament (offline, retenu) est publie par le broker a sa place
docker run --rm -v "$WORK:/d:ro" "${PUB[@]}" -t "openprofalux/$ID/status" -m 'offline'
sleep 3
chk "presence : boitier hors ligne (testament), commandes coupees" "$(salon_disabled)" 1
chk "presence : etat hors ligne affiche malgre les etats retenus de ses appareils" "$(curl -s -b "$J" "$B/" | grep -o 'class="grp-head"[^>]*>.\{0,40\}class="dot off"' | wc -l)" 1
chk "derniere activite : un boitier hors ligne dit quand il a ete vu" "$(curl -s -b "$J" "$B/" | grep -o 'class="grp-seen">vu [^<]*' | wc -l)" 1
docker run --rm -v "$WORK:/d:ro" "${PUB[@]}" -t "openprofalux/$ID/status" -m 'online'
sleep 2

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
chk "Plugins : « Connexion par mot de passe » active, avec son ecrou" "$(echo "$PL" | grep -c 'href="/plugins/local-accounts"')" 1
chk "Plugins : elle se retire (la connexion est native)" "$(echo "$PL" | grep -c 'data-disable="local-accounts"')" 1
chk "cartes : la connexion par mot de passe, active, dans Connexion" "$(echo "$PL" | grep -o 'data-plugin="local-accounts" data-state="active"' | wc -l)" 1
chk "Plugins : l'exemple du catalogue est propose" "$(echo "$PL" | grep -c 'data-install="example"')" 1
chk "source http refusee" "$(apiJ /api/plugins/sources '{"add":"http://exemple.fr/plugins.json"}')" 400
chk "source https injoignable refusee (rien n'est garde)" "$(apiJ /api/plugins/sources '{"add":"https://nexiste-pas.invalid/plugins.json"}')" 400
docker run -d --name isno-e2e-catalog --network isno-cloud-net -v "$WORK":/w:ro node:26.13.1-trixie-slim node -e "require('https').createServer({key:require('fs').readFileSync('/w/src.key'),cert:require('fs').readFileSync('/w/src.pem')},(q,r)=>{r.setHeader('content-type','application/json');if(q.url.startsWith('/directory')){if(!/^[0-9]+\\.[A-Za-z0-9_-]{43}$/.test(q.headers['x-isno-directory']||'')){r.statusCode=401;return r.end('{}')}return r.end(require('fs').readFileSync('/w/directory.json'))}r.end(require('fs').readFileSync('/w/third.json'))}).listen(443)" >/dev/null; sleep 2
chk "source https valide ajoutee" "$(apiJ /api/plugins/sources '{"add":"https://isno-e2e-catalog/plugins.json"}')" 200
PL=$(curl -s -b "$J" "$B/plugins")
chk "catalogue : le plugin de la source est propose, avec son origine" "$(echo "$PL" | grep -c 'isno-e2e-catalog</span>')" 1
chk "catalogue : la source ne remplace pas le plugin ISNO de meme identifiant" "$(echo "$PL" | grep -c 'Imposteur')" 0
# on compte dans le BALISAGE (la page porte aussi ses donnees serialisees pour le navigateur)
chk "sources : le conflit est signale sous la source" "$(echo "$PL" | grep -o 'class="formerr"[^>]*>[^<]*existe deja' | wc -l)" 1
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
echo "== themes : un plugin apporte couleurs et logo ; le pied « powered by » ne change pas"
chk "theme du plugin : en cours des son activation (page Plugins)" "$(curl -s -b "$J" "$B/plugins" | grep -o 'data-theme-in-use="example"' | wc -l)" 1
chk "theme inconnu refuse" "$(apiJ /api/settings/general '{"theme":"nexiste-pas"}')" 400
chk "theme choisi" "$(apiJ /api/settings/general '{"theme":"example"}')" 200
TP=$(curl -s -b "$J" "$B/")
chk "theme applique : couleur d'accent" "$(echo "$TP" | grep -cF '<style id="portal-theme">:root:not([data-theme="light"]){--accent:#ff7a1a;')" 1
chk "theme applique : logo dans la barre" "$(echo "$TP" | grep -o '<img class="brand-logo" src="data:image/png;base64,' | wc -l)" 1
chk "theme applique : le pied « powered by » est toujours la" "$(echo "$TP" | grep -o 'class="page-foot">.\{0,120\}href="https://www.isno.fr"' | wc -l)" 1
chk "theme applique aussi a la connexion" "$(curl -s "$B/connexion?local=1" | grep -c 'id="portal-theme"')" 1
chk "theme reglable : couleur enregistree dans l'ecrou du plugin" "$(apiJ /api/settings/plugin '{"id":"example","values":{"greet":true,"times":1,"accent":"#3366CC"}}')" 200
chk "theme reglable : la page suit, sans redemarrer" "$(curl -s -b "$J" "$B/" | grep -cF '<style id="portal-theme">:root:not([data-theme="light"]){--accent:#3366cc;')" 1
chk "desinstallation (le portail redemarre)" "$(apiJ /api/plugins/disable '{"id":"example"}')" 200
wait_restart
chk "apres desinstallation : de nouveau propose" "$(curl -s -b "$J" "$B/plugins" | grep -c 'data-install="example"')" 1
chk "plugin du theme retire : retour au theme ISNO (pas de feuille de theme)" "$(curl -s -b "$J" "$B/" | grep -c 'id="portal-theme"')" 0
for _ in $(seq 1 20); do docker run --rm -v isno-plugins:/p:ro busybox:1.38.0-musl test -e /p/example || break; sleep 1; done
chk "apres desinstallation : code retire du volume" "$(docker run --rm -v isno-plugins:/p:ro busybox:1.38.0-musl sh -c 'test -e /p/example && echo present || echo absent')" absent

echo "== connexion par un site externe (plugin integre, cookie signe partage)"
chk "activation (le portail redemarre)" "$(apiJ /api/plugins/enable '{"id":"external-auth"}')" 200
wait_restart
chk "reglages : adresse en http refusee (vide)" "$(apiJ /api/settings/plugin '{"id":"external-auth","values":{"loginUrl":"http://boutique.exemple.fr/compte"}}')" 200
chk "reglages : l'adresse http n'est pas gardee" "$(curl -s -b "$J" "$B/plugins/external-auth" | grep -c 'value="http://boutique')" 0
chk "reglages enregistres" "$(apiJ /api/settings/plugin '{"id":"external-auth","values":{"loginUrl":"https://boutique.exemple.fr/compte","logoutUrl":"https://boutique.exemple.fr/sortie","cookieName":"isno_account","cookieDomain":".exemple.fr","directoryUrl":"https://isno-e2e-catalog/directory"}}')" 200
chk "annuaire refuse sans signature (le site externe exige l'en-tete)" "$(docker exec isno-cloud-server node -e "fetch('https://isno-e2e-catalog/directory').then(r=>console.log(r.status)).catch(e=>console.log('erreur',e.cause?.code||e.message))")" 401
UL=$(curl -s -b "$J" "$B/utilisateurs")
chk "annuaire : compte du site externe cree d'avance, avec son nom" "$(echo "$UL" | grep -o '<b>Annie Annuaire</b>' | wc -l)" 1
chk "Utilisateurs : par ordre alphabetique" "$(echo "$UL" | grep -o '<b>[^<]*</b>' | sed 's/<[^>]*>//g' | python3 -c "import sys;l=[x.strip() for x in sys.stdin if x.strip()];print(len(l)>2 and l==sorted(l,key=str.casefold))")" True
chk "annuaire : entree sans e-mail valide ignoree" "$(echo "$UL" | grep -o 'class="mono">pas-un-email<' | wc -l)" 0
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
chk "cookie signe valide : compte cree a la premiere visite" "$(curl -s -b "$J" "$B/utilisateurs" | grep -o 'class="mono">client-sso@exemple.fr<' | wc -l)" 1
chk "cookie altere : pas connecte" "$(curl -s -o /dev/null -w '%{http_code}' -H "cookie: $FORGED" "$B/compte")" 302
LOGOUT=$(curl -s -D - -X POST -H "cookie: $SSOC" "$B/api/logout")
chk "deconnexion : renvoie vers l'adresse de deconnexion" "$(echo "$LOGOUT" | grep -c '"redirect":"https://boutique.exemple.fr/sortie"')" 1
chk "deconnexion : cookie partage efface sur le domaine commun" "$(echo "$LOGOUT" | grep -ic '^set-cookie: isno_account=; Domain=.exemple.fr')" 1
chk "connexion a choix unique : le mot de passe a ete desactive" "$(docker exec isno-cloud-server node -e 'const c=JSON.parse(require("fs").readFileSync("/data/portal.config.json","utf8"));process.stdout.write(String(c.plugins.includes("local-accounts"))+" "+String(c.plugins.includes("external-auth")))')" "false true"
chk "connexion par le site : pas d'onglet Nouvel utilisateur" "$(echo "$UL" | grep -c 'data-tab="new"')" 0
chk "connexion par le site : creation de compte fermee" "$(apiJ /api/user/new '{"email":"x@exemple.fr","name":"X","password":"mot-de-passe-long","cap":5}')" 403
UL2=$(curl -s -b "$J" "$B/utilisateurs")
chk "comptes du site : marques de leur source (annuaire et premiere visite), pas « invites »" "$(echo "$UL2" | grep -o 'data-source="boutique.exemple.fr"' | wc -l) $(echo "$UL2" | grep -c 'class="role pending"')" "2 0"
chk "retour au mot de passe : le site externe s'eteint (le portail redemarre)" "$(apiJ /api/plugins/enable '{"id":"local-accounts"}')" 200
wait_restart
chk "desactive : formulaire local de nouveau" "$(curl -s -o /dev/null -w '%{http_code}' "$B/connexion")" 200
chk "desactive : comptes du site gardes, avec leur source" "$(curl -s -b "$J" "$B/utilisateurs" | grep -o '<b>Annie Annuaire</b>' | wc -l)" 1
echo "== application installable (PWA) : un plugin, inactif par defaut"
chk "sans le plugin : pas de manifeste" "$(curl -s -o /dev/null -w '%{http_code}' "$B/manifest.webmanifest")" 404
chk "sans le plugin : la page ne declare pas de manifeste" "$(curl -s -b "$J" "$B/" | grep -c 'rel="manifest"')" 0
chk "activation (le portail redemarre)" "$(apiJ /api/plugins/enable '{"id":"installable-app"}')" 200
wait_restart
MF=$(curl -s "$B/manifest.webmanifest")
chk "manifeste : nom du portail, plein ecran" "$(echo "$MF" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['name'],d['display'],d['start_url'])")" "Maison Durand standalone /"
chk "manifeste : icones 192 et 512" "$(echo "$MF" | python3 -c "import sys,json;print(' '.join(i['sizes'] for i in json.load(sys.stdin)['icons']))")" "192x192 512x512"
chk "page : manifeste et icone iOS declares" "$(curl -s -b "$J" "$B/" | grep -o 'rel="manifest" href="/manifest.webmanifest"\|rel="apple-touch-icon"' | wc -l)" 2
chk "service worker servi" "$(curl -s -o /dev/null -w '%{http_code}' "$B/service-worker.js")" 200
chk "page hors ligne servie" "$(curl -s "$B/pwa/offline.html" | grep -c 'Portail injoignable')" 2
chk "icone 512 servie" "$(curl -s -o /dev/null -w '%{http_code} %{content_type}' "$B/pwa/icon-512.png")" "200 image/png"
chk "nom sous l'icone regle (12 caracteres au plus)" "$(apiJ /api/settings/plugin '{"id":"installable-app","values":{"shortName":"Maison Durand 2026"}}')" 200
chk "manifeste : nom court borne" "$(curl -s "$B/manifest.webmanifest" | python3 -c "import sys,json;print(json.load(sys.stdin)['short_name'])")" "Maison Duran"
echo "== theme de base toujours actif ; theme personnalise : couleur et icone reglees depuis l'ecrou"
PL=$(curl -s -b "$J" "$B/plugins")
chk "theme ISNO : au coeur, une carte sans activation ni retrait" "$(echo "$PL" | grep -o 'data-plugin="isno" data-state="core"' | wc -l) $(echo "$PL" | grep -c 'data-disable="isno"')" "1 0"
chk "theme ISNO : rien a desactiver" "$(apiJ /api/plugins/disable '{"id":"theme-isno"}')" 404
chk "icone d'onglet : celle d'ISNO par defaut" "$(curl -s -b "$J" "$B/" | grep -c 'rel="icon" href="/pwa/icon.svg"')" 1
chk "activation du theme personnalise (le portail redemarre)" "$(apiJ /api/plugins/enable '{"id":"theme-custom"}')" 200
wait_restart
chk "theme personnalise : applique des son activation" "$(docker exec isno-cloud-server node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync("/data/portal.config.json","utf8")).theme)')" custom
png_url() { python3 -c "
import base64,struct,zlib,sys
w,h=int(sys.argv[1]),int(sys.argv[2])
c=lambda t,d:struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d))
raw=b''.join(b'\0'+b'\xc0\x39\x2b'*w for _ in range(h))
print('data:image/png;base64,'+base64.b64encode(b'\x89PNG\r\n\x1a\n'+c(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+c(b'IDAT',zlib.compress(raw,9))+c(b'IEND',b'')).decode())" "$1" "$2"; }
ICON=$(png_url 512 512)
chk "theme personnalise : couleur et icone enregistrees" "$(apiJ /api/settings/plugin "{\"id\":\"theme-custom\",\"values\":{\"name\":\"Maison\",\"accent\":\"#C0392B\",\"logo\":\"\",\"icon\":\"$ICON\"}}")" 200
CP=$(curl -s -b "$J" "$B/")
chk "theme personnalise : couleur appliquee sans redemarrer" "$(echo "$CP" | grep -cF '<style id="portal-theme">:root:not([data-theme="light"]){--accent:#c0392b;')" 1
FAV=$(echo "$CP" | grep -o 'rel="icon" href="/pwa/theme-icon?v=[0-9a-f]*"' | head -1 | sed 's/.*href="//;s/"$//')
chk "icone d'onglet : celle du theme, adresse versionnee" "$(echo -n "$FAV" | grep -c '^/pwa/theme-icon?v=')" 1
chk "icone du theme servie" "$(curl -s -o /dev/null -w '%{http_code} %{content_type}' "$B$FAV")" "200 image/png"
chk "manifeste : l'icone du theme seule, a sa taille" "$(curl -s "$B/manifest.webmanifest" | python3 -c "import sys,json;print(' '.join(i['sizes']+' '+i['src'] for i in json.load(sys.stdin)['icons']))")" "512x512 $FAV"
chk "icone iOS : celle du theme (PNG)" "$(echo "$CP" | grep -cF "rel=\"apple-touch-icon\" href=\"$FAV\"")" 1
chk "theme personnalise : son nom sur sa carte, en cours" "$(curl -s -b "$J" "$B/plugins" | grep -c 'data-theme-in-use="custom">thème en cours : Maison<')" 1
chk "theme ISNO : se reprend depuis sa carte" "$(curl -s -b "$J" "$B/plugins" | grep -o 'data-use-theme="isno"' | wc -l)" 1
WIDE=$(png_url 300 100)
chk "icone non carree : refusee" "$(apiJ /api/settings/plugin "{\"id\":\"theme-custom\",\"values\":{\"accent\":\"#c0392b\",\"icon\":\"$WIDE\"}}")" 200
chk "icone refusee : retour a celle d'ISNO" "$(curl -s -b "$J" "$B/" | grep -c 'rel="icon" href="/pwa/icon.svg"')" 1
chk "desactivation du theme personnalise (le portail redemarre)" "$(apiJ /api/plugins/disable '{"id":"theme-custom"}')" 200
wait_restart
chk "theme personnalise retire : retour au theme ISNO" "$(curl -s -b "$J" "$B/" | grep -c 'id="portal-theme"')" 0
chk "desactivation (le portail redemarre)" "$(apiJ /api/plugins/disable '{"id":"installable-app"}')" 200
wait_restart
chk "desactive : plus de manifeste" "$(curl -s -o /dev/null -w '%{http_code}' "$B/manifest.webmanifest")" 404

echo "== types d'appareils : chacun est un plugin, active d'office, desactivable"
chk "plugin du type volet : actif d'office" "$(curl -s -b "$J" "$B/plugins" | grep -c 'data-disable="device-volet"')" 1
chk "type volet desactive (le portail redemarre)" "$(apiJ /api/plugins/disable '{"id":"device-volet"}')" 200
wait_restart
for _ in $(seq 1 20); do curl -s -b "$J" "$B/" | grep -q 'Type « volet » non géré' && break; sleep 1; done
chk "type desactive : le volet devient un appareil inconnu" "$(curl -s -b "$J" "$B/" | grep -c 'Type « volet » non géré par ce portail.')" 1
chk "type desactive : plus de commandes pour lui" "$(curl -s -b "$J" "$B/" | grep -c 'data-slug="salon"')" 0
chk "type desactive : reste eteint (config)" "$(docker exec isno-cloud-server grep -c '"device-volet"' /data/portal.config.json)" 1
chk "type volet reactive (le portail redemarre)" "$(apiJ /api/plugins/enable '{"id":"device-volet"}')" 200
wait_restart
# apres redemarrage, l'etat des appareils revient du broker (messages retenus) en quelques secondes
for _ in $(seq 1 20); do curl -s -b "$J" "$B/" | grep -q 'data-slug="salon"' && break; sleep 1; done
chk "type reactive : la carte de commande revient" "$(curl -s -b "$J" "$B/" | grep -c 'data-slug="salon"')" 1
chk "desactive : le secret partage est garde" "$(docker exec isno-cloud-server node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync("/data/plugin-secrets.json","utf8"))["external-auth"]||"")')" "$SEC"

echo "== Instance : adresse du portail modifiable apres verification"
chk "adresse qui mene a ce portail : enregistree" "$(apiJ /api/settings/portal-host "{\"host\":\"$APP\"}")" 200
chk "adresse qui ne se resout pas : refusee" "$(apiJ /api/settings/portal-host '{"host":"nexiste-pas.invalid"}')" 400
chk "adresse refusee : la config n'a pas change" "$(curl -s -b "$J" "$B/parametres" | grep -c "value=\"$APP\"")" 1

echo "== sans mode de connexion par mot de passe : la connexion de l'admin reste native, Utilisateurs reste"
chk "Parametres ne liste plus les plugins (page a part)" "$(curl -s -b "$J" "$B/parametres" | grep -c 'href="/plugins/local-accounts"')" 0
chk "ecran du plugin : ses reglages declares" "$(curl -s -b "$J" "$B/plugins/local-accounts" | grep -c 'data-key="lockoutMaxFailures"')" 1
chk "ecran du plugin : un seul bouton Enregistrer" "$(curl -s -b "$J" "$B/plugins/local-accounts" | grep -oE '<button[^>]*>(<!--[^>]*-->)*Enregistrer(<!--[^>]*-->)*</button>' | wc -l)" 1
chk "Parametres : un seul bouton Enregistrer" "$(curl -s -b "$J" "$B/parametres" | grep -oE '<button[^>]*>(<!--[^>]*-->)*Enregistrer(<!--[^>]*-->)*</button>' | wc -l)" 1
chk "plugin inconnu : reglages refuses" "$(apiJ /api/settings/plugin '{"id":"inconnu","values":{}}')" 404
chk "retrait de la connexion par mot de passe (le portail redemarre)" "$(apiJ /api/plugins/disable '{"id":"local-accounts"}')" 200
wait_restart
chk "sans plugin : l'operateur se connecte toujours (connexion native)" "$(curl -s -o /dev/null -w '%{redirect_url}' -c "$J" -X POST -d 'user=operateur@exemple.fr&pass=operateur-e2e' "$B/api/login")" "$B/"
chk "sans plugin : Utilisateurs reste (au coeur)" "$(curl -s -b "$J" "$B/" | grep -o 'href="/utilisateurs"' | wc -l)" 1
chk "sans plugin : pas d'onglet Nouvel utilisateur" "$(curl -s -b "$J" "$B/utilisateurs" | grep -c 'data-tab="new"')" 0
chk "sans plugin : la creation de comptes est fermee" "$(apiJ /api/user/new '{"email":"x@exemple.fr","name":"X","password":"mot-de-passe-long","cap":5}')" 403
chk "sans plugin : la page Plugins propose de l'activer" "$(curl -s -b "$J" "$B/plugins" | grep -c 'data-enable="local-accounts"')" 1

echo; echo "RESULTAT : $ok OK, $ko KO"; [ "$ko" = 0 ]
