# isno-cloud

Stack cloud **auto-hébergeable** pour le pilotage à distance des firmwares ISNO (OpenProfalux,
OpenXtraflame…). Open-core : hébergez le vôtre, ou utilisez l'instance ISNO.

## Contenu
- **broker** — Mosquitto en **mTLS**, isolation **par device** (ACL `openprofalux/{device_id}/#`).
- **server** (TS/Node) — **enrôlement** (code de pairing → cert device), **auth** (session), **app**
  de pilotage SSR, **relais** authentifié (le navigateur ne parle jamais au broker).

## Démarrer
    ./scripts/gen-ca.sh mqtt.mondomaine.fr   # CA + cert serveur + cert relais (clés chez vous)
    cp .env.example .env                     # puis remplir les secrets
    docker compose up -d --build

Le firmware se configure avec `cloud_uri = mqtts://mqtt.mondomaine.fr:8883`, et récupère son cert
**au pairing** (il reçoit un code depuis l'app).

### Enrôler un device (via l'API)
    # crée un code de pairing (admin)
    curl -X POST http://IP:8080/api/device/new -H "authorization: Bearer $ADMIN_TOKEN" -d '{"name":"Volet salon"}'
    # le boîtier (ou un test) l'échange contre son bundle
    curl -X POST http://IP:8080/api/enroll -d '{"code":"XXXXXX"}'

> Les clés privées et `.env` ne sont **jamais** commités (`.gitignore`).
