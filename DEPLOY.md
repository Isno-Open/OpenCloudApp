# Déploiement (instance ISNO)

Comment l'instance hébergée est câblée sur le VPS. Le dépôt reste auto-hébergeable (voir
`README.md`) ; ceci décrit l'instance ISNO, pas une procédure imposée au public.

## Vue d'ensemble
- **VPS** : 146.59.45.179 (ubuntu@).
- **Broker** : conteneur `isno-mqtt` (Mosquitto mTLS), port 8883, `mqtt.isno.fr`. CA + certs dans
  `/home/ubuntu/isno-mqtt/certs` (ca, server, relay, + certs device). ACL : chaque device limité à
  `openprofalux/<CN>/#` ; l'identité `relay` a l'accès complet.
- **Serveur** : conteneur `isno-cloud-server` (ce dépôt, build sur place). Monte la CA du broker sur
  `/certs`, donc les certs device qu'il émet sont signés par la même CA. Store SQLite (volume
  `isno-cloud-data`). Relais vers `mqtts://mqtt.isno.fr:8883` (via `--add-host mqtt.isno.fr:172.17.0.1`).
- **app.isno.fr** : TLS par le Caddy `winnza-proxy` (`/root/winnza-proxy/Caddyfile`, bloc
  `app.isno.fr { reverse_proxy isno-cloud-server:8080 }`) ; le serveur est joint sur le réseau `coolify`.
- **DNS** : `app.isno.fr` et `mqtt.isno.fr` -> 146.59.45.179 (zone BIND master sur le Synology, ns2 = VPS).
- **Secrets** (ADMIN_TOKEN, ADMIN_PASS, SESSION_SECRET) : coffre Vaultwarden « isno-cloud (app.isno.fr) »
  et `/home/ubuntu/isno-cloud/.env`. Jamais dans le dépôt.

## Mettre à jour le serveur
    ssh ubuntu@146.59.45.179
    cd ~/isno-cloud && git pull
    sudo docker build -t isno-cloud-server:prod ./server
    sudo docker rm -f isno-cloud-server
    sudo docker run -d --name isno-cloud-server --restart unless-stopped \
      --add-host mqtt.isno.fr:172.17.0.1 -p 127.0.0.1:8090:8080 \
      -v /home/ubuntu/isno-mqtt/certs:/certs -v isno-cloud-data:/data --env-file .env \
      -e CERTS_DIR=/certs -e DB_PATH=/data/isno-cloud.db -e BROKER_URL=mqtts://mqtt.isno.fr:8883 \
      isno-cloud-server:prod
    sudo docker network connect coolify isno-cloud-server

## À durcir plus tard
- Cookie de session `Secure` (le serveur est en HTTP derrière le TLS de Caddy).
- Store MongoDB (greffon) si besoin de montée en charge.
- Auth SSO sur les comptes du site au lieu du seul compte admin.
