# isno-cloud

Stack cloud **auto-hébergeable** pour le pilotage à distance des firmwares ISNO (OpenProfalux,
OpenXtraflame…). Open-core : hébergez le vôtre, ou utilisez l'instance ISNO.

## Contenu
- **broker** : Mosquitto en **mTLS**, isolation **par appareil** (ACL `openprofalux/{device_id}/#`).
- **server** (TypeScript, Astro SSR) : installation, comptes, enrôlement des appareils, **relais**
  authentifié (le navigateur ne parle jamais au broker), app de pilotage.
- **supervisor** : installe **à la demande** les modules optionnels (aujourd'hui MongoDB), façon
  Supervisor de Home Assistant. Catalogue déclaré dans `supervisor/modules.json`.
- **socket-proxy** : seul composant qui voit le socket Docker, filtré (pas d'`exec`, de `build`, de
  `system`…), et joignable par le seul superviseur.

## Démarrer
    ./scripts/gen-ca.sh mqtt.mondomaine.fr   # CA + cert serveur + cert relais (clés chez vous)
    cp .env.example .env                     # puis remplir les secrets
    docker compose up -d --build

Puis ouvrir `https://<votre-domaine>/setup` **dans les 5 minutes** qui suivent le démarrage
(`PORTAL_SETUP_WINDOW_S`). Passé ce délai, l'installation se verrouille : `docker compose restart server`
la rouvre. Une fois l'instance configurée, `/setup` est fermé définitivement.

## Base de données
Choisie à l'installation, dans `/setup` :
- **SQLite** (défaut) : un fichier sur le volume, rien à administrer ;
- **MongoDB fourni** : téléchargé et démarré par le superviseur au moment où on le choisit ;
- **MongoDB externe** : votre propre serveur, URL saisie et testée.

Le serveur ne connaît qu'une interface de store (`server/src/store.ts`). La configuration de l'instance
vit dans **un seul fichier**, `/data/portal.config.json`. Déploiement automatisé sans écran :
`PORTAL_SEED=1` et les variables décrites dans `.env.example`.

## Modules et sécurité du superviseur
Le superviseur n'installe que les identifiants de son catalogue, avec des **volumes nommés** seulement
(jamais un dossier de l'hôte), **jamais en mode privilégié**, sur le réseau de la pile. Il étiquette ce
qu'il crée et refuse de toucher un conteneur sans son étiquette. L'app l'appelle avec un secret partagé,
généré au premier démarrage dans un volume qu'elle monte en lecture seule.

## Comptes
Comptes locaux gérés par l'opérateur (écran **Utilisateurs**), connexion opérateur sur
`/connexion?local=1`. Un fournisseur d'identité externe (SSO) se branche par le point d'extension
`AuthProvider` (`server/src/auth-provider.ts`), chargé depuis `HARNESS_MODULE`.

## Enrôler un appareil
Le boîtier lance l'appairage (onglet Cloud) et affiche un **code et un QR code**. L'utilisateur le scanne
ou le saisit sur `/lier`, confirme, et le boîtier récupère son certificat tout seul
(*device authorization grant*, RFC 8628 : `/api/device/start`, `/api/device/poll`). Firmware antérieur :
code obtenu dans « Ajouter » puis saisi dans le boîtier (`/api/enroll`).

> Les clés privées, `.env` et les fichiers de base ne sont **jamais** commités (`.gitignore`).
