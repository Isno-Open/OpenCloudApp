# OpenCloudApp

Stack cloud **auto-hébergeable** pour le pilotage à distance des firmwares ISNO (OpenProfalux,
OpenXtraflame…). Open-core : hébergez le vôtre, ou utilisez l'instance ISNO.

Les noms techniques (conteneurs `isno-cloud-*`, volumes `isno-*`, images) gardent leur ancien
préfixe : les renommer casserait les installations existantes et leurs données.

## Contenu
- **broker** (module) : Mosquitto en **mTLS**, isolation **par appareil** (ACL `openprofalux/{device_id}/#`).
- **server** (TypeScript, Astro SSR) : installation, comptes, enrôlement des appareils, **relais**
  authentifié (le navigateur ne parle jamais au broker), app de pilotage.
- **supervisor** : installe les modules **à la demande**, façon Supervisor de Home Assistant : le
  **broker** (obligatoire, installé pendant `/setup`) et **MongoDB** (si choisi). Catalogue déclaré dans
  `supervisor/modules.json`.
- **socket-proxy** : seul composant qui voit le socket Docker, filtré (pas d'`exec`, de `build`, de
  `system`…), et joignable par le seul superviseur.

## Démarrer
    cp .env.example .env                     # puis remplir les secrets
    docker compose up -d --build

Puis ouvrir `https://<votre-domaine>/setup` **dans les 5 minutes** qui suivent le démarrage
(`PORTAL_SETUP_WINDOW_S`). Passé ce délai, l'installation se verrouille : `docker compose restart server`
la rouvre. Une fois l'instance configurée, `/setup` est fermé définitivement.

Aucun certificat à préparer avant : la **CA est créée au premier démarrage**. Dans `/setup`, on choisit
le **nom du broker** (public, ou de réseau local) ; la pile émet son certificat avec ce nom, écrit sa
configuration, et le superviseur l'installe. On vérifie ensuite que chaque nom mène bien à **cette**
instance (portail : identifiant de l'instance ; broker : certificat présenté). Au démarrage, le
certificat du broker est réémis si le nom de la config ou la CA a changé.

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

## Tester la pile complète
    scripts/e2e-stack.sh            # MongoDB fourni
    scripts/e2e-stack.sh sqlite     # SQLite

Monte la vraie pile sur la machine (ports 18080 / 18883), rejoue l'installation, simule un boîtier
(appairage, mTLS, commande reçue, isolation), teste la réconciliation, puis démonte tout.

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
