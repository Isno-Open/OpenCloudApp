# Déploiement (instance ISNO)

Comment l'instance hébergée app.isno.fr est câblée sur le VPS. Le dépôt reste auto-hébergeable (voir
`README.md`) ; ceci décrit l'instance ISNO, pas une procédure imposée au public.

## Vue d'ensemble
- **VPS** : 146.59.45.179 (ubuntu@), dépôt cloné dans `~/isno-cloud` (branche `feat/cloud-app`).
- **Pile** : `docker compose` du dépôt (serveur, superviseur, socket-proxy), plus
  `docker-compose.override.yml` propre au VPS (non versionné) :
  - le serveur rejoint aussi le réseau `coolify`, pour que le Caddy le joigne par son nom ;
  - le superviseur monte le dossier `~/isno-cloud-local` en `/local` (catalogue local de plugins,
    `PLUGIN_LOCAL_CATALOG_PATH=/local/plugins.json`, vide aujourd'hui).
- **Modules installés par le superviseur** : broker `isno-mqtt` (Mosquitto mTLS, port 8883,
  `mqtt.isno.fr`) et MongoDB `isno-mongo` (base de l'instance).
- **app.isno.fr** : TLS par le Caddy `winnza-proxy` (`/root/winnza-proxy/Caddyfile`), qui renvoie vers
  `isno-cloud-server:8080`.
- **DNS** : `app.isno.fr` et `mqtt.isno.fr` -> 146.59.45.179 (zone BIND maître sur le Synology, ns2 = VPS).
- **Configuration de l'instance** : `/data/portal.config.json` dans le serveur (installation, base,
  plugins actifs et leurs réglages). Secrets créés par les plugins : `/data/plugin-secrets.json`.
- **Environnement** (`~/isno-cloud/.env`, jamais dans le dépôt ; secrets aussi au coffre Vaultwarden
  « isno-cloud (app.isno.fr) ») : `SESSION_SECRET`, `ADMIN_TOKEN`, `ADMIN_PASS`, `BROKER_URL_PUBLIC`,
  `MONGO_CACHE_GB`, `SSO_SECRET`.

## Mettre à jour
    ssh ubuntu@146.59.45.179
    cd ~/isno-cloud && git pull
    sudo docker compose up -d --build server supervisor

Le serveur redémarre en quelques secondes ; la configuration et les données (volumes) sont gardées.

## Connexion par le compte www.isno.fr
Plugin intégré `external-auth` (« Connexion par un site externe »), réglé dans son écrou :
- adresse de connexion : `https://www.isno.fr/compte?next=https://app.isno.fr/` ;
- cookie `isno_account`, domaine `.isno.fr` ;
- pas d'adresse de déconnexion : le cookie est commun à la boutique et au portail, l'effacer à la
  déconnexion du portail déconnecte aussi la boutique.

Le cookie est posé par le connecteur de la boutique (dépôt isno-compta, `shop-api-main.ts`), signé par
`SSO_SECRET`, le **même** des deux côtés (sur le VPS, celui de l'environnement a priorité sur celui que
le plugin créerait). Le connecteur n'accepte de renvoyer vers `next` que sur le domaine déclaré dans sa
configuration (`shop.account_domain`, `isno.fr`) et ses sous-domaines.

Ce plugin remplace depuis le 2026-11-12 le plugin privé `isno-sso` (dépôt Isno-Open/isno-cloud-hosted,
gardé pour mémoire).

## À durcir plus tard
- Une déconnexion faite sur la boutique n'est connue que d'elle : sur un autre navigateur, le portail
  accepte le cookie jusqu'à son échéance (30 jours au plus).
- Registre d'images ISNO pour publier des plugins dans le catalogue officiel.
