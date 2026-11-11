# isno-cloud

Stack cloud **auto-hébergeable** pour le pilotage à distance des firmwares ISNO (OpenProfalux,
OpenXtraflame…). Open-core : hébergez le vôtre, ou utilisez l'instance ISNO.

## Contenu
- **broker** - Mosquitto en **mTLS**, isolation **par device** (ACL `openprofalux/{device_id}/#`).
- **server** (TS/Node) - **enrôlement** (code de pairing -> cert device), **auth** (session), **app**
  de pilotage SSR, **relais** authentifié (le navigateur ne parle jamais au broker).

## Base de données : SQLite par défaut, MongoDB en greffon
Le serveur ne connaît qu'une **interface de store** (`server/src/store.ts`) ; l'implémentation est
choisie **au démarrage** :
- **sans configuration** -> **SQLite** embarqué (un fichier, aucune base à administrer). C'est le
  défaut self-host.
- **si `MONGO_URL` est défini** -> **MongoDB** (instance ISNO, ou toute base existante).

Changer de base ne touche que `store.ts` : un seul fichier, pas de JSON en guise de base.

## Démarrer
    ./scripts/gen-ca.sh mqtt.mondomaine.fr   # CA + cert serveur + cert relais (clés chez vous)
    cp .env.example .env                     # puis remplir les secrets
    docker compose up -d --build             # défaut : SQLite

### Avec MongoDB (greffon)
    docker compose -f docker-compose.yml -f docker-compose.mongo.yml up -d --build

Le firmware se configure avec `cloud_uri = mqtts://mqtt.mondomaine.fr:8883`, et récupère son cert
**au pairing** (il reçoit un code depuis l'app).

### Enrôler un device
    # crée un code de pairing (admin)
    curl -X POST http://IP:8080/api/device/new -H "authorization: Bearer $ADMIN_TOKEN" \
         -H "content-type: application/json" -d '{"name":"Volet salon"}'
    # le boîtier (ou un test) l'échange contre son bundle
    curl -X POST http://IP:8080/api/enroll -H "content-type: application/json" -d '{"code":"XXXXXX"}'

> Les clés privées, `.env` et les fichiers de base ne sont **jamais** commités (`.gitignore`).
