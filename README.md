# OpenCloudApp

Stack cloud **auto-hébergeable** pour le pilotage à distance des firmwares ISNO (OpenProfalux,
OpenXtraflame…). Open-core : hébergez le vôtre, ou utilisez l'instance ISNO.

Les noms techniques (conteneurs `isno-cloud-*`, volumes `isno-*`, images) gardent leur ancien
préfixe : les renommer casserait les installations existantes et leurs données.

## Contenu
- **broker** (module) : Mosquitto en **mTLS**, isolation **par appareil** (ACL `openprofalux/{device_id}/#`).
- **server** : le cœur en TypeScript (`server/`, paquet `@opencloudapp/core`) et l'app web en
  **SvelteKit** rendue par le serveur (`web/`), dans un seul process : installation, comptes,
  enrôlement des appareils, **relais** authentifié (le navigateur ne parle jamais au broker), app de
  pilotage, **plugins**. Les écrans sont faits de composants communs (`web/src/lib/components/ui`) :
  seul leur contenu varie d'un écran à l'autre.
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

    scripts/e2e-ui.sh               # parcours au navigateur (Playwright)

Le premier vérifie l'API et le HTML sans cliquer. Le second, sur une pile neuve, fait l'installation
par l'écran `/setup` puis clique dans Paramètres, Utilisateurs, les réglages d'un plugin, Ajouter et
Compte, et échoue à la moindre erreur JavaScript.

## Plugins
Ce que le portail sait faire en plus de son cœur vient de **plugins**, page **Plugins** de
l'opérateur. **Écrire le sien : [docs/PLUGINS.md](docs/PLUGINS.md)**, avec le plugin d'exemple
`plugins/example`. Un plugin a un seul contrat, `register(api)` (`server/src/plugin-types.ts`), et peut :
- apporter un mode de **connexion** (`registerAuthProvider`) ;
- apporter un **type d'appareil** (`registerDeviceType`) : identifiant tel que le boîtier le publie,
  nom, icône (un caractère ou un tracé SVG), libellés FR/EN des trois commandes. Le cœur dessine la
  carte ; rien de ce qu'un plugin déclare n'est du HTML ;
- apporter un **thème** (`registerTheme`) : couleurs (sombre et clair) parmi les jetons de
  `plugin-contract.ts` (`THEME_TOKENS`), polices (familles Google Fonts), logo et icône de
  l'application (image PNG, WebP ou SVG en data: URL, 100 Ko au plus ; l'icône est carrée, un PNG de
  512 px conseillé). Tout est vérifié : jamais de CSS ni de balisage libres. Le thème se choisit dans
  Paramètres ; un plugin qui déclare `appliesTheme` le rend actif dès son activation. Un thème peut
  être une **fonction** : il se relit alors à chaque page, et un réglage enregistré s'applique sans
  redémarrer. **Le pied de page « powered by » n'est pas thématisable** ;
- **déclarer ses réglages** (`settings`) : interrupteur, nombre, choix, texte ou adresse, secret,
  couleur, image téléversée. Le cœur dessine l'écran (l'écrou du plugin), le plugin valide les valeurs.

Plugins **intégrés** (livrés avec le portail) :

| Plugin | Rôle | Par défaut |
|---|---|---|
| `local-accounts` | Gestion des comptes : écran Utilisateurs, invitations, sécurité (captcha, blocage, double authentification, longueur du mot de passe) | actif |
| `external-auth` | Connexion par un site externe (connexion unique, voir plus bas) | inactif |
| `device-volet`, `device-portail` | Types d'appareils volet et portail | actifs d'office, même sur une instance déjà configurée |
| `theme-isno` | Thème ISNO (sombre par défaut, clair au choix), le thème de base | toujours actif, ne se désactive pas |
| `theme-custom` | Thème personnalisé : nom, couleur d'accent (les nuances en sont tirées), logo et icône, réglés depuis l'écrou | inactif ; activé, il devient le thème du portail |
| `installable-app` | Application installable (PWA) : manifeste, icône, service worker | inactif |

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

## Application installable
Plugin `installable-app` (inactif par défaut). Actif, le portail s'installe comme une application :
manifeste (`/manifest.webmanifest` : nom du portail, nom court réglable, plein écran), icônes, et
service worker minimal qui affiche une page « portail injoignable » hors connexion **sans garder la
moindre donnée en cache**. L'icône est celle du thème s'il en déclare une (elle sert aussi d'icône
d'onglet, plugin actif ou non, à une adresse qui change avec l'image), sinon l'icône ISNO, dessinée une
fois dans `web/static/pwa/icon.svg` (PNG produits par `scripts/make-pwa-icons.py`). Un service worker
ne s'enregistre que sur une origine sûre (https, ou `localhost`).

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
Aujourd'hui (firmware OpenProfalux 0.2.15) : l'utilisateur obtient un **code** dans « Ajouter », puis le
saisit dans l'onglet Cloud du boîtier ; le boîtier l'échange contre son certificat (`/api/enroll`).

Le portail sait aussi le parcours inverse, prévu pour les prochains firmwares : le boîtier affiche un
**code et un QR code**, l'utilisateur le scanne ou le saisit sur `/lier`, confirme, et le boîtier
récupère son certificat tout seul (*device authorization grant*, RFC 8628 : `/api/device/start`,
`/api/device/poll`).

## Ce qu'un boîtier publie
Pour que ses appareils s'affichent, un boîtier publie, sur sa connexion cloud et en messages **retenus**,
pour chaque appareil `<slug>` :

| Topic | Contenu |
|---|---|
| `openprofalux/<device_id>/cover/<slug>/attrs` | JSON : `type` (identifiant déclaré par un plugin, ex. `volet`, `portail`), `positional` (booléen) |
| `openprofalux/<device_id>/cover/<slug>/state` | état : `open`, `closed`, `opening`, `closing`, `stopped` |
| `openprofalux/<device_id>/cover/<slug>/position` | position en % d'ouverture (100 = ouvert), si l'appareil est positionnel |

Il annonce sa **présence** sur `openprofalux/<device_id>/status` : `online` (retenu) à sa connexion, et
`offline` en testament (LWT), que le broker publie s'il disparaît. Le portail s'y fie, et date la
dernière activité réelle d'un boîtier (gardée dans la base) pour afficher « vu il y a … » quand il
est hors ligne.

Il reçoit les commandes sur `openprofalux/<device_id>/cover/<slug>/set` (`OPEN`, `STOP`, `CLOSE`). Un
appareil sans `attrs`, ou d'un type qu'aucun plugin ne déclare, s'affiche comme **appareil inconnu**.
Le broker n'autorise un boîtier que sous son propre `openprofalux/<device_id>/`.

## Développer
Node 26 (comme l'image). Le cœur se compile avant l'app, qui en dépend (`file:../server`) :

    cd server && npm install && npm run build && npm test
    cd ../web && npm install
    npm run check       # svelte-check, échoue au moindre avertissement
    npm run types       # TypeScript 7 sur les modules .ts
    npm run dev         # serveur de développement (port 4321)

L'app suit les conventions de SvelteKit 3 : configuration dans `vite.config.ts`, imports `#lib/…`
(sous-chemins du `package.json`), modules serveur sous `src/lib/server` (jamais envoyés au navigateur).
Chaque écran a sa fonction de chargement dans `src/lib/server/screens.ts`, partagée par son adresse
française et son adresse anglaise.

Le parcours au navigateur (`scripts/e2e-ui.sh`) demande `python3` et Playwright avec Chromium
(`pip install playwright && playwright install chromium`).

> Les clés privées, `.env` et les fichiers de base ne sont **jamais** commités (`.gitignore`).
