# isno-cloud

Stack cloud **auto-hébergeable** pour le pilotage à distance des firmwares ISNO (OpenProfalux,
OpenXtraflame…). Open-core : hébergez le vôtre, ou utilisez l'instance ISNO.

## Contenu
- **Broker MQTT** (Mosquitto) en **mTLS**, isolation **par device** (ACL `openprofalux/{device_id}/#`).
- À venir : endpoint d'enrôlement / pairing, relais authentifié, app de pilotage, auth locale.

## Démarrer le broker
    ./scripts/gen-ca.sh mqtt.mondomaine.fr   # CA + cert serveur (les clés restent chez vous)
    docker compose up -d

Le firmware se configure avec `cloud_uri = mqtts://mqtt.mondomaine.fr:8883` et la **CA** générée.
Les certs device sont émis par le serveur d'enrôlement au pairing (`scripts/gen-device-cert.sh`
pour un test manuel).

> Les clés privées ne sont **jamais** commitées (`.gitignore`).
