# OpenCloudApp

Stack cloud **auto-hébergeable** pour le pilotage à distance des firmwares ISNO (OpenProfalux,
OpenXtraflame…). Open-core : hébergez le vôtre, ou utilisez l'instance ISNO.

Les noms techniques (conteneurs `isno-cloud-*`, volumes `isno-*`, images) gardent leur ancien
préfixe : les renommer casserait les installations existantes et leurs données.

## Contenu
- **broker** (module) : Mosquitto en **mTLS**, isolation **par appareil** (ACL `openprofalux/{device_id}/#`).
- **server** (TypeScript ; app web Astro rendue par le serveur, écrans interactifs en Svelte) :
  installation, comptes, enrôlement des appareils, **relais** authentifié (le navigateur ne parle
  jamais au broker), app de pilotage, **plugins**. L'app passe progressivement entièrement en Svelte
  (SvelteKit).
- **supervisor** : installe les modules **à la demande**, façon Supervisor de Home Assistant : le
  **broker** (obligatoire, installé pendant `/setup`) et **MongoDB** (si choisi). Catalogue déclaré dans
  `supervisor/modules.json`. Il installe aussi les **plugins** du catalogue (voir plus bas).
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
(appairage, mTLS, commande reçue, isolation, types d'appareils), teste la réconciliation, les comptes
et leur sécurité, la messagerie, les plugins (catalogues, installation, mise à jour, réglages,
connexion externe), puis démonte tout. `E2E_KEEP=1` laisse la pile en place pour l'explorer (supprimer
ensuite le `.env` de test qu'il a créé).

## Plugins
Ce que le portail sait faire en plus de son cœur vient de **plugins**, page **Plugins** de
l'opérateur. Un plugin a un seul contrat, `register(api)` (`server/src/plugin-types.ts`), et peut :
- apporter un mode de **connexion** (`registerAuthProvider`) ;
- apporter un **type d'appareil** (`registerDeviceType`) : identifiant tel que le boîtier le publie,
  nom, icône (un caractère ou un tracé SVG), libellés FR/EN des trois commandes. Le cœur dessine la
  carte ; rien de ce qu'un plugin déclare n'est du HTML ;
- **déclarer ses réglages** (`settings`) : interrupteur, nombre, choix, texte ou adresse, secret.
  Le cœur dessine l'écran (l'écrou du plugin), le plugin valide les valeurs.

Plugins **intégrés** (livrés avec le portail) :

| Plugin | Rôle | Par défaut |
|---|---|---|
| `local-accounts` | Gestion des comptes : écran Utilisateurs, invitations, sécurité (captcha, blocage, double authentification, longueur du mot de passe) | actif |
| `external-auth` | Connexion par un site externe (connexion unique, voir plus bas) | inactif |
| `device-volet`, `device-portail` | Types d'appareils volet et portail | actifs d'office, même sur une instance déjà configurée |

Un type publié par un boîtier qu'aucun plugin ne déclare s'affiche comme **appareil inconnu**, sans
commandes.

Plugins **ajoutés** : une image (version exacte) qui contient son code dans `/plugin`. Le superviseur
copie ce dossier dans le volume `isno-plugins`, que le portail lit en lecture seule, puis le portail
redémarre et le charge. Les catalogues, par ordre de priorité (un identifiant déjà pris n'est jamais
remplacé) :
1. le catalogue ISNO, livré avec le superviseur (`supervisor/plugins.json`) ;
2. le catalogue **local** de l'instance (`PLUGIN_LOCAL_CATALOG_PATH`), relu à chaque demande. Monter
   son **dossier** dans le superviseur, pas le fichier seul : un éditeur qui remplace le fichier
   laisserait le conteneur sur l'ancienne version ;
3. les sources https ajoutées par l'opérateur.

**Mises à jour** : l'installation laisse dans le dossier du plugin l'image copiée (`.image`). Le
superviseur la compare au catalogue ; une version différente affiche « Mettre à jour (a → b) ».
Exemple de plugin à copier : `plugins/example`.

## Comptes
La connexion par e-mail et mot de passe est **native** : le compte créé à l'installation peut toujours
entrer (`/connexion?local=1` quand une connexion externe est active), quels que soient les plugins.

**Connexion par un site externe** (plugin `external-auth`) : un site externe (une boutique, par
exemple) pose sur un domaine commun un cookie de session **signé** ; le portail le vérifie et ouvre la
session, en créant le compte à la première visite. Format du cookie (`server/src/signed-cookie.ts`) :

    base64url(e-mail) "." échéance en ms "." base64url(HMAC-SHA256(secret, "<b64>.<échéance>"))

Dans l'écrou du plugin : adresse de connexion, adresse de déconnexion (facultative), nom et domaine du
cookie. Le **secret partagé** est créé par le plugin à sa première activation (fichier
`plugin-secrets.json` à côté de la configuration, droits 600), gardé même si le plugin est désactivé,
et montré masqué dans l'écrou pour le donner au site externe. `SSO_SECRET` dans l'environnement, s'il
est posé, a priorité.

## Enrôler un appareil
Le boîtier lance l'appairage (onglet Cloud) et affiche un **code et un QR code**. L'utilisateur le scanne
ou le saisit sur `/lier`, confirme, et le boîtier récupère son certificat tout seul
(*device authorization grant*, RFC 8628 : `/api/device/start`, `/api/device/poll`). Firmware antérieur :
code obtenu dans « Ajouter » puis saisi dans le boîtier (`/api/enroll`).

> Les clés privées, `.env` et les fichiers de base ne sont **jamais** commités (`.gitignore`).
