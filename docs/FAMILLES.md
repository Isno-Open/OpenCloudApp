# Plugins de famille de boîtiers : proposition de contrat

**Statut : proposition, à valider par Olivier avant le code** (décision du 2026-11-13 : une famille de
boîtiers = un plugin, qui vit dans le dépôt de son firmware).

Une **famille** est un firmware et tout ce qu'il publie : OpenProfalux aujourd'hui, OpenXtraflame
demain. Son plugin apprend au portail à lire ses boîtiers, à les commander et à dessiner leurs cartes.
Le portail ne connaît plus aucune famille en dur.

## Ce que le cœur garde

- Le broker, les certificats, l'enrôlement, les comptes et l'appartenance des boîtiers.
- **L'isolation.** Un boîtier ne parle que sous `<racine>/<son id>/#`. Le cœur écrit une ligne d'ACL
  par racine de famille installée (`pattern readwrite <racine>/%u/#`), s'abonne à `<racine>/+/#` et
  n'envoie une commande **que** sous `<racine>/<boîtier>/`, quoi que rende le plugin.
- **La famille d'un boîtier** : celle qu'il déclare à l'enrôlement (champ `firmware`, déjà enregistré
  pour chaque boîtier). Un boîtier d'avant, sans indication, est `openprofalux`.
- Le dessin des cartes, à partir d'un vocabulaire de contrôles qu'il fixe (plus bas). Jamais de HTML
  venu d'un plugin.
- Ce qui vaut pour toutes les familles : présence et « vu il y a », notifications, journal, horaires
  et scènes, partage, et demain Google Home (feuille de route).

## Ce que le plugin déclare

```ts
api.registerDeviceFamily({
  id: "openprofalux",                     // = le champ firmware des boîtiers de la famille
  label: { fr: "OpenProfalux", en: "OpenProfalux" },
  icon: { path: "…" },                    // logo, vérifié comme les autres icônes
  contract: 1,                            // version du contrat suivie ; le portail refuse une autre
  topicRoot: "openprofalux",              // racine des topics (ACL et abonnement)
  kinds: [ /* types d'appareils et leurs cartes, plus bas */ ],
  read(msg) { /* ce que publie un boîtier -> des faits, plus bas */ },
  command(target, control, value) { /* une commande -> un message, plus bas */ },
});
```

Ses **réglages** passent par le mécanisme existant (écrou) : types proposés, libellés, etc.

### Lire : `read(msg)` rend des faits

Le cœur reçoit `{ box, path, payload, retained }` (`path` : le topic sans `<racine>/<boîtier>/`) et
le plugin rend une liste de faits, que le cœur vérifie avant de les appliquer :

| Fait | Contenu | Sert à |
|---|---|---|
| `presence` | en ligne ou non | pastille, commandes actives ou grisées, « vu il y a » |
| `device` | appareil vu : identifiant, type (`kinds`), nom, contrôles masqués ou renommés | la carte de l'appareil |
| `state` | valeurs de l'appareil, par contrôle | l'état sur la carte |
| `box` | version du firmware, dernière version disponible | page boîtier, bouton de mise à jour |
| `event` | niveau (info ou alerte), code, texte FR et EN, appareil éventuel | notifications, journal |

### Commander : `command(target, control, value)`

Le cœur appelle le plugin avec l'appareil, le contrôle actionné et sa valeur. Le plugin rend
`{ path, payload, retain? }`, et le cœur le publie sous `<racine>/<boîtier>/<path>` après
vérification : pas de joker `+` ou `#`, pas de `..`, charge bornée. La **mise à jour du firmware** est
une commande du boîtier entier (`target` sans appareil), par exemple `ota/pull` et l'adresse de
l'image.

### Les cartes : un vocabulaire fixé par le cœur

Chaque type d'appareil (`kinds`) décrit sa carte comme une liste de contrôles :

| Contrôle | Paramètres | Exemple |
|---|---|---|
| `action` | libellé, icône | Monter, Stop, Descendre ; Ouvrir, Fermer |
| `toggle` | libellé | marche/arrêt d'un poêle |
| `setpoint` | min, max, pas, unité | consigne de 15 à 25 °C par pas de 0,5 |
| `position` | réglable ou non | ouverture d'un volet, de 0 à 100 % |
| `reading` | unité, seuils d'alerte | température des fumées ; pile d'une télécommande |

Le jour où un boîtier a besoin d'un contrôle absent, on l'ajoute au vocabulaire, dans le cœur, pour
toutes les familles. C'est aussi ce vocabulaire que l'intégration Google Home traduira en « traits »
Google, sans rien de Google dans les plugins.

## Le plugin OpenProfalux : inventaire du firmware (branche feat/cloud, 8b0c8f1, relevé le 2026-11-13)

**Ce qui part vers le cloud.** Le firmware relaie au cloud TOUT ce qu'il publie sous `openprofalux/`,
préfixé par l'identifiant du boîtier (`cloud_topic.c`). Il en reçoit `cover/+/set`,
`cover/+/set_position`, `listen/#`, `ota/pull` et `update/install`.

**Les types d'appareils sont déjà déclarés par le firmware**, dans `firmware/main/web/profiles.json` :
`volet` (Montée, Stop, Descente ; positionnel) et `portail` (Ouvrir, Stop, Fermer), avec icône et
profils de marques (Profalux, Eveno, NeoSol, Somfy RTS, CAME). Le plugin les **lit dans ce fichier** à
sa construction : une seule déclaration, celle du firmware.

| Ce que publie le boîtier (sous `openprofalux/<boîtier>/`) | Dans le plugin |
|---|---|
| `status` : `online`, testament `offline` (retenu) | présence |
| `cover/<slug>/attrs` : `{type, positional, up, stop, down}` (retenu) | appareil et sa carte |
| `cover/<slug>/state`, `cover/<slug>/position` (retenus) | état, position |
| `remote/<télécommande>/battery` : `ON` si pile faible (retenu) | relevé « pile faible », événement |
| `system/status` : `{fw, target, free_heap}` (retenu) | version du boîtier |
| `update/state` : `{installed_version, latest_version}` (retenu) | mise à jour disponible |
| `<boîtier>/state` : `{last_cmd, rssi, free_heap}` (battement, ~60 s) | signal Wi-Fi du boîtier |
| `listen/state` : écoute radio permanente | interrupteur du boîtier (à décider) |

| Commande (sous `openprofalux/<boîtier>/`) | Dans le plugin |
|---|---|
| `cover/<slug>/set` : `OPEN`, `STOP`, `CLOSE` | contrôles `action` |
| `cover/<slug>/set_position` : 0 à 100 | `position` réglable |
| `update/install`, ou `ota/pull` avec l'adresse de l'image | mise à jour du firmware |
| `listen/set` | interrupteur d'écoute (à décider) |

**Ce qui reste dans l'interface locale du boîtier**, faute de sens à distance : apprentissage et
clonage de télécommandes (il faut être à côté, la télécommande en main), étalonnage des temps de
course, paramètres radio, captures et rejeux, sauvegarde et restauration, diagnostics.

**Défauts relevés, à corriger dans le firmware avant le plugin :**
1. **Des trames radio partent vers le cloud.** `frames/last` et `frames/log/<n>` (numéro de série,
   code tournant, RSSI de TOUTE télécommande entendue, voisins compris) sont relayées au broker ISNO,
   et retenues. Elles doivent rester locales. De même `counter/` et `busy/` (synchronisation entre
   cartes, sans objet dans le cloud).
2. **Pile et mise à jour muettes sans broker local.** `remote/<id>/battery` et `update/state` ne
   partent que si le MQTT local est connecté (`if (!s_mqtt_ready) return;`) : un boîtier relié au seul
   cloud ne les publie jamais. Même défaut que celui déjà corrigé pour `attrs`.
3. Ceux de la carte firmware : 0.2.16-cloudattrs non validée au démarrage, interrupteur cloud qui
   coupe sans corps et fige le serveur web, version gravée seulement au configure.

## Où il vit, comment il arrive

- Dans le dépôt du firmware : `OpenProfalux/cloud-plugin/`. Le format et son lecteur changent dans
  le même commit ; les tests du plugin rejouent de vrais messages du boîtier.
- La CI du firmware publie l'image du plugin, à version exacte ; le catalogue ISNO la référence.
- Le contrat (types et vocabulaire) appartient à OpenCloudApp, que le plugin consomme comme paquet
  versionné, jamais en copie.
- Les tests d'OpenCloudApp passent sur une petite famille de test, livrée avec eux.

## Choisi à l'installation

Décidé le 2026-11-13 : **les plugins se choisissent à l'installation**. L'assistant (`/setup`) gagne une
étape « Plugins » : familles de boîtiers (OpenProfalux, OpenXtraflame…), mode de connexion (mot de
passe ou site externe), thème, application installable. Une instance neuve n'a donc aucune famille
d'office ; tout reste modifiable ensuite depuis la page Plugins.

## Question ouverte

1. La position réglable (`set_position`) apparaît-elle sur la carte dès maintenant, ou plus tard ?
