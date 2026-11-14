# Écrire un plugin

Ce guide explique comment écrire, essayer, empaqueter et publier un plugin du portail. Le plugin de
référence est `plugins/example` : il déclare des réglages et apporte un thème, et le test complet
(`scripts/e2e-stack.sh`) l'installe, le règle, le met à jour et le retire à chaque passage. Partez de
lui.

## Ce qu'est un plugin

Un plugin est un **module ES** dont l'export par défaut suit le contrat `Plugin`
(`server/src/plugin-types.ts`) :

| Champ | Rôle |
|---|---|
| `id` | identifiant, **égal au nom de son dossier** : `^[a-z0-9][a-z0-9-]{1,40}$` |
| `title` | nom affiché sur sa carte, `{ fr, en }` |
| `icon` | facultatif : le logo de sa carte, un caractère (`{ glyph: "★" }`), un tracé SVG 24×24 dessiné au trait (`{ path: "M4 4h16…" }`) ou une petite image (`{ src: "data:image/png;base64,…" }`). Vérifié par le cœur ; sans lui, l'initiale du nom |
| `category` | facultatif : sa catégorie sur la page Plugins (`PLUGIN_CATEGORY` : `login`, `appearance`, `devices`, `app`, `other` par défaut). `login` est **à choix unique** : activer un plugin de connexion désactive les autres |
| `accountSource` | facultatif, pour un plugin de connexion : nom court de l'origine des comptes qu'il crée (ex. « www.isno.fr »), montré dans Utilisateurs |
| `description` | une phrase, `{ fr, en }` |
| `settings` | facultatif : ses réglages, **déclarés** (voir plus bas) ; le portail dessine l'écran de l'écrou |
| `appliesTheme` | facultatif : identifiant d'un thème qu'il apporte et qui devient celui du portail à son activation |
| `register(api)` | appelée une fois au démarrage du portail ; c'est là que le plugin apporte ce qu'il fait |

Le portail charge les plugins actifs au démarrage. Activer, retirer ou mettre à jour un plugin
**redémarre le portail** (quelques secondes). Un plugin qui échoue au chargement est écarté et
journalisé ; il ne bloque jamais le portail, et la connexion de l'admin reste toujours possible.

**Un plugin n'importe pas le cœur.** Il reçoit ce dont il a besoin par `api`, et n'importe à
l'exécution qu'un seul fichier, `plugin-contract.js` : le vocabulaire des réglages et ce qui est propre
au portail. Le vocabulaire commun (textes, icônes, réglages déclarés) appartient au moteur partagé
[OpenPluginHost](https://github.com/Isno-Open/OpenPluginHost), dont `plugin-contract.js` le réexporte :
les deux fichiers, sans autre dépendance, sont livrés à côté de son `index.js`. Tout le reste du contrat
est importé **en type** seulement, donc effacé à la compilation.

## Le plus petit plugin

```ts
import type { Plugin } from "../../server/src/plugin-types.js";

const plugin: Plugin = {
  id: "bonjour",
  title: { fr: "Bonjour", en: "Hello" },
  description: { fr: "Dit bonjour au démarrage.", en: "Says hello at startup." },
  register() {
    console.log("[plugin bonjour] chargé");
  },
};
export default plugin;
```

## Ce que `api` permet

| Appel | Ce qu'il apporte |
|---|---|
| `registerTheme(decl)` | un **thème** : couleurs, polices, logo, icône (voir plus bas) |
| `registerDeviceType(decl)` | un **type d'appareil** : nom, icône, libellés des trois commandes. Provisoire : ce rôle passe aux plugins de famille de boîtiers (voir « À venir ») |
| `registerAuthProvider(p)` | un **mode de connexion** (`server/src/auth-provider.ts`) : reconnaître un compte depuis un cookie, adresse de connexion et de déconnexion, cookies à effacer |
| `provideCapability(c)` | une **capacité** que l'app consulte (`CAPABILITY` : `accountCreation` pour créer des comptes dans le portail, `installableApp`) |
| `ensureAccount(id, cap, name?)` | **crée un compte** s'il n'existe pas (première visite, annuaire) sans jamais écraser un nom déjà choisi ; le plugin en devient l'origine |
| `reconcileAccounts(ids)` | ses comptes **absents** de cette liste sont marqués, ceux qui y reviennent démarqués ; rien n'est jamais supprimé |
| `defaultCap` | nombre d'appareils par défaut d'un compte |
| `settings()` | **ses propres réglages**, tels que rangés, relus à chaque appel : à repasser par sa fonction de lecture |

Ce qu'un plugin ne peut **pas** faire, par construction : écrire du HTML ou du CSS libres dans la
page, ou retirer le pied « Sponsorisé par www.isno.fr ». Tout ce qu'il déclare est vérifié pièce par
pièce par le cœur, et un plugin tiers ne peut donc pas casser ni détourner l'interface.

## Réglages déclarés

Un plugin ne livre pas d'écran. Il **déclare** ses champs ; le cœur dessine l'écran de l'écrou, le même
pour tous, avec un seul bouton Enregistrer, et range la valeur sous l'identifiant du plugin dans la
configuration de l'instance.

```ts
settings: {
  fields: [ /* les champs, dans l'ordre de l'écran */ ],
  toForm: (stored) => read(stored),     // valeurs affichées, depuis ce qui est rangé
  fromForm: (input) => read(input),     // valeur à ranger, BORNÉE par le plugin
},
```

Natures de champ (`SETTING_KIND`, dans `plugin-contract.ts`) :

| Nature | Contrôle dessiné | Précisions |
|---|---|---|
| `toggle` | case à cocher | |
| `number` | nombre | `min`, `max` |
| `choice` | liste | `options : [{ value, label }]` |
| `text` | texte ou adresse | `format` (`TEXT_FORMAT.plain` ou `url`), `maxLength`, `placeholder` |
| `color` | sélecteur de couleur | valeur `#rrggbb`, vide si non réglée |
| `image` | téléversement avec aperçu | data: URL PNG, WebP ou SVG, 100 Ko au plus ; `square: true` pour une icône (carrée, 48 px au moins) |
| `secret` | valeur masquée, à copier | créée et gardée par le plugin, montrée mais jamais saisie ; pour les plugins intégrés aujourd'hui |

Tout champ accepte `hint` (une aide sous le champ) et `under` (la clef d'une case à cocher dont il
dépend : il n'est actif que si elle est cochée).

**Le plugin valide.** `fromForm` reçoit ce que le navigateur envoie, donc n'importe quoi : il rend
une valeur bornée, et ce qui n'est pas valable retombe sur sa valeur par défaut. Lisez la valeur
sans assertion de type (`as`), propriété par propriété :

```ts
const own = (raw: unknown, k: string): unknown =>
  raw !== null && typeof raw === "object" ? Object.getOwnPropertyDescriptor(raw, k)?.value : undefined;

const read = (raw: unknown): { greet: boolean; times: number } => {
  const greet = own(raw, "greet"), times = Math.round(Number(own(raw, "times")));
  return { greet: typeof greet === "boolean" ? greet : true, times: Number.isFinite(times) ? Math.min(5, Math.max(1, times)) : 1 };
};
```

Pour lire ses réglages en marche, un plugin appelle `api.settings()` et repasse la valeur par la même
fonction `read` : `const { greet, times } = read(api.settings());`. La valeur est relue à chaque appel,
donc un réglage enregistré compte dès l'appel suivant, sans redémarrer.

## Thèmes

```ts
api.registerTheme({
  id: "maison",
  label: { fr: "Maison", en: "Home" },
  dark: { accent: "#ff7a1a", "accent-hover": "#ff9a4d" },   // jetons de THEME_TOKENS
  light: { accent: "#c2560a" },
  fonts: { sans: "Source Sans 3" },                          // famille Google Fonts
  logo: { src: "data:image/png;base64,…", srcLight: "data:image/png;base64,…", alt: { fr: "Maison", en: "Home" } },
  icon: { src: "data:image/png;base64,…" },                  // carrée, PNG de 512 px conseillé
  mode: THEME_MODE.system,                                   // mode par défaut : dark, light ou system
  shape: THEME_SHAPE.medium,                                 // coins : round (ISNO), medium, square
});
```

- **Couleurs** : seulement les jetons de `THEME_TOKENS`, en `#hex`, `rgb()` ou `hsl()`. Ce que le
  thème ne redéfinit pas reste celui du thème ISNO. La palette sombre est celle par défaut ; la claire
  vaut quand le visiteur choisit le mode clair.
- **Logo** : en haut à gauche. **Icône** : onglet du navigateur, icône iOS, et icône de l'application
  installable. Images en data: URL, 100 Ko au plus.
- **Un thème réglable** se déclare par une **fonction** : `api.registerTheme(() => monTheme(reglages()))`.
  Il est relu (et revérifié) à chaque page, donc un réglage enregistré s'applique sans redémarrer.
  C'est ainsi qu'est fait le thème personnalisé intégré (`server/src/plugins/theme-custom.ts`).
- **Mode** : ce que voit un visiteur qui n'a pas encore choisi ; le bouton jour/nuit garde la main.
  **Logo du mode clair** (`srcLight`) : pour un logo clair, qui disparaîtrait sur fond blanc.
- **Aperçu en direct** : un plugin de thème réglable ajoute `preview(input)` à ses réglages, qui rend le
  thème tel que les valeurs saisies le donneraient. L'écran de l'écrou l'applique à la page pendant la
  saisie, sans rien enregistrer.
- `appliesTheme: "maison"` rend le thème actif dès l'activation du plugin. Sans lui, l'admin le
  choisit depuis la carte du plugin (page Plugins, catégorie Apparence).
- Le thème ISNO n'est pas un plugin : c'est le thème de base, au cœur. Si le thème choisi disparaît
  (plugin retiré), le portail y revient ; l'admin le reprend aussi depuis sa carte.

## Essayer en local

Compilez le plugin, puis lancez le portail de développement en lui donnant le module à charger par
`HARNESS_MODULE` (chemins absolus, séparés par des virgules) :

    cd plugins/example && ../../server/node_modules/.bin/tsc -p tsconfig.json
    cd ../../web && HARNESS_MODULE="$PWD/../plugins/example/dist/plugins/example/index.js" npm run dev

Le plugin apparaît sur la page Plugins, avec son écrou s'il a des réglages. Après une modification,
recompilez et relancez le serveur de développement : un plugin n'est chargé qu'au démarrage.

## Empaqueter

Un plugin se livre dans une **image** qui contient :
- `/plugin/index.js` (le module ES compilé) et, à côté de lui, `/plugin/plugin-contract.js` et
  `/plugin/contract.js` (le contrat du moteur, que le premier réexporte) ;
- un shell (busybox suffit) : le superviseur en a besoin pour copier le dossier. Rien ne s'y exécute.

Le `Dockerfile` de l'exemple fait exactement cela : il compile contre les types du cœur (le contrat est
vérifié à la compilation), récrit les imports du contrat vers les fichiers voisins, et refuse l'image
si un autre import du cœur, ou un import de paquet, subsiste.

    docker build -f plugins/example/Dockerfile -t <registre>/isno-cloud-plugin-example:1.0.0 .

L'étiquette est une **version exacte**. `latest` est refusé, car c'est la version qui permet de proposer
une mise à jour.

## Publier dans un catalogue

Un catalogue est un JSON, une entrée par plugin, la clef étant son identifiant :

```json
{
  "example": {
    "title": "Exemple",
    "description": { "fr": "Plugin de référence.", "en": "Reference plugin." },
    "image": "ghcr.io/isno-open/isno-cloud-plugin-example:1.0.0"
  }
}
```

Trois catalogues, par ordre de priorité (un identifiant déjà pris n'est jamais remplacé par un catalogue
suivant) :
1. le catalogue ISNO, livré avec le superviseur (`supervisor/plugins.json`) ;
2. le catalogue local de l'instance (`PLUGIN_LOCAL_CATALOG_PATH`), relu à chaque demande ;
3. les sources https que l'admin ajoute, onglet **Sources** de la page Plugins. Une source
   injoignable ou mal formée est refusée à l'ajout.

## Installation, mise à jour, retrait

- **Installer** : le superviseur tire l'image, copie son `/plugin` dans le volume des plugins (que le
  portail lit en lecture seule) et y laisse l'image copiée (`.image`). Le portail active le plugin et
  redémarre.
- **Mettre à jour** : quand le catalogue porte une autre version que `.image`, la carte du plugin propose
  « Mettre à jour (a → b) ». Les réglages sont gardés.
- **Retirer** : le plugin est désactivé et son dossier effacé du volume. Ses réglages restent dans la
  configuration : le réinstaller les retrouve.

## Tester

- La fonction qui lit et borne les réglages est **pure** : éprouvez-la seule (valeur hors bornes,
  type faux, propriété absente).
- Le parcours complet (installation, réglages, mise à jour, retrait) est celui que
  `scripts/e2e-stack.sh` fait subir au plugin d'exemple ; prenez-le comme modèle.
- Vérifiez qu'un contrôle sait échouer : cassez volontairement la borne, constatez l'échec, remettez.

## À venir : les plugins de famille de boîtiers

Une famille de boîtiers (OpenProfalux, demain OpenXtraflame) deviendra **un** plugin, qui vivra dans le
dépôt de son firmware et apportera tout ce qui lui est propre : son espace de topics MQTT, la lecture de
ce que publie le boîtier (présence, état, attributs), ses types d'appareils, ses commandes, et ses
cartes, déclarées dans un vocabulaire de contrôles fixé par le cœur. `registerDeviceType` sera remplacé
par ce contrat, qui sera décrit ici quand il sera arrêté.
