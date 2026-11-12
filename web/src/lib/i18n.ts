// i18n de l'app cloud, meme schema que le site isno.fr : FR par defaut a la racine, EN sous /en/ avec
// slugs traduits. STRINGS typees `satisfies Record<Lang, S>` => le compilateur exige les memes cles en
// FR et EN (comme LAYOUT_STRINGS du site). Les libelles de commande sont localises PAR TYPE cote app :
// le boitier declare le type et l'action canonique (UP/STOP/DOWN), l'app ne traduit que l'etiquette.
import { DEVICE_TYPE, type DeviceType } from './types.ts';

export const LANG = { fr: 'fr', en: 'en' } as const;
export type Lang = (typeof LANG)[keyof typeof LANG];
export const otherLang = (l: Lang): Lang => (l === LANG.fr ? LANG.en : LANG.fr);

/** Forme des textes : chaque cle existe dans les deux langues (verifie par `satisfies`). */
interface S {
  // chrome
  brandAria: string; themeToggle: string; menu: string; langSwitch: string; langName: string;
  nav: { volets: string; boitiers: string; ajouter: string; compte: string };
  footNote: string;
  // vue volets
  voletsTitle: string; filterAll: string; voletsEmpty: string;
  leadVolets: (n: number, m: number) => string;
  // carte appareil
  details: string; rename: string; typeWord: string; positional: string; impulsional: string;
  posWord: string; radioState: (dbm: number) => string; offline: string; offlineSuffix: string; nameLabel: string;
  // vue boitiers
  boitiersTitle: string; leadBoitiers: (n: number, cap: number) => string;
  online: string; offlineShort: string; updAvail: string; configure: string; devicesWord: string;
  // page boitier
  backBoxes: string; leadBoitier: (id: string, count: number, uptime?: string) => string;
  tabConfig: string; tabManage: string;
  availability: string; readonly: string; editable: string; state: string; since: string;
  wifiSignal: string; radios: string; firmware: string; upToDate: string; updateAvailable: string;
  comingSoon: string; comingSoonNote: string;
  boxName: string; boxNameHint: string; deleteTitle: string; deleteNote: string; deleteBtn: string;
  confirmDelete: (name: string) => string; yesDelete: string; cancel: string; renameError: string; deleteError: string;
  // vue ajouter
  addTitle: string; addLead: string; getCodeTitle: string; getCodeNote: string; getCodeBtn: string;
  pairCode: (code: string) => string; errPrefix: (e: string) => string; netErr: string; howTitle: string; howText: string;
  // vue compte
  accountTitle: string; accountLead: string; identity: string; address: string; connection: string;
  subscription: string; boxesWord: string; formula: string; included: string; capNote: (cap: number) => string;
  logoutTitle: string; logoutNote: string; logoutBtn: string;
  // connexion
  signInTitle: string; signInUser: string; signInPass: string; signInBtn: string; signInError: string;
}

export const STRINGS = {
  [LANG.fr]: {
    brandAria: 'ISNO Cloud, accueil', themeToggle: 'Basculer le thème clair / sombre', menu: 'Menu',
    langSwitch: 'View this page in English', langName: 'EN',
    nav: { volets: 'Volets', boitiers: 'Boîtiers', ajouter: 'Ajouter', compte: 'Compte' },
    footNote: 'app.isno.fr · identité ISNO partagée (site + boîtier)',
    voletsTitle: 'Mes volets', filterAll: 'Tous', voletsEmpty: 'Aucun appareil. Appairez un boîtier depuis « Ajouter ».',
    leadVolets: (n, m) => `${n} appareils sur ${m} boîtiers`,
    details: 'Détails', rename: 'Renommer', typeWord: 'Type', positional: 'positionnel', impulsional: 'impulsionnel',
    posWord: 'Position', radioState: (d) => `reçu ${d} dBm`, offline: 'hors ligne', offlineSuffix: ' · hors ligne', nameLabel: 'Nom',
    boitiersTitle: 'Boîtiers', leadBoitiers: (n, cap) => `Nommez et configurez vos boîtiers OpenProfalux. ${n} sur ${cap}.`,
    online: 'en ligne', offlineShort: 'hors ligne', updAvail: 'maj dispo', configure: 'Configurer', devicesWord: 'appareils',
    backBoxes: 'Tous les boîtiers',
    leadBoitier: (id, c, up) => `${id} · ${c} appareils${up ? ` · actif depuis ${up}` : ''}`,
    tabConfig: 'Configuration', tabManage: 'Gérer',
    availability: 'Disponibilité', readonly: 'lecture seule', editable: 'modifiable', state: 'État', since: 'Depuis',
    wifiSignal: 'Signal Wi-Fi', radios: 'Radios', firmware: 'Firmware', upToDate: 'à jour', updateAvailable: 'mise à jour dispo',
    comingSoon: 'Bientôt',
    comingSoonNote: "Wi-Fi (lecture seule) et MQTT local (modifiable à distance) arriveront quand le boîtier publiera son état ; pour l'instant, cela se règle dans l'interface locale du boîtier.",
    boxName: 'Nom du boîtier', boxNameHint: 'Nom affiché (ex. Maison 1, Résidence…)',
    deleteTitle: 'Supprimer le boîtier',
    deleteNote: "Retire le boîtier et ses appareils de ce compte. Le matériel local et Home Assistant ne sont pas touchés. L'appairage cloud devra être refait.",
    deleteBtn: 'Supprimer de mon compte', confirmDelete: (n) => `Confirmer la suppression de « ${n} » ?`, yesDelete: 'Oui, supprimer', cancel: 'Annuler',
    renameError: 'Le renommage a échoué.', deleteError: 'La suppression a échoué.',
    addTitle: 'Ajouter un boîtier', addLead: 'Associez un boîtier OpenProfalux à votre compte.',
    getCodeTitle: "Obtenir un code d'appairage", getCodeNote: "À saisir dans l'onglet « Cloud » de l'interface du boîtier, sur votre réseau local.",
    getCodeBtn: 'Obtenir un code', pairCode: (c) => `Code d’appairage : ${c}`, errPrefix: (e) => `Erreur : ${e}`, netErr: 'Erreur réseau, réessayez.',
    howTitle: 'Comment ça marche',
    howText: "1. Générez un code ci-dessus. 2. Ouvrez l'interface du boîtier sur votre réseau, onglet Cloud. 3. Collez le code : le boîtier s'enrôle et apparaît dans « Boîtiers ». Vous pourrez alors le nommer. Le code expire après quelques minutes.",
    accountTitle: 'Compte', accountLead: 'Connecté via votre compte isno.fr', identity: 'Identité',
    address: 'Adresse', connection: 'Connexion', subscription: 'Abonnement', boxesWord: 'Boîtiers', formula: 'Formule', included: 'incluse',
    capNote: (cap) => `Au-delà de ${cap} boîtiers, une offre mensuelle débloque les suivants.`,
    logoutTitle: 'Se déconnecter', logoutNote: 'Ferme la session sur cet appareil.', logoutBtn: 'Déconnexion',
    signInTitle: 'Connexion', signInUser: 'Compte', signInPass: 'Mot de passe', signInBtn: 'Entrer', signInError: 'Identifiants invalides.',
  },
  [LANG.en]: {
    brandAria: 'ISNO Cloud, home', themeToggle: 'Toggle light / dark theme', menu: 'Menu',
    langSwitch: 'Voir cette page en français', langName: 'FR',
    nav: { volets: 'Shutters', boitiers: 'Hubs', ajouter: 'Add', compte: 'Account' },
    footNote: 'app.isno.fr · shared ISNO identity (site + hub)',
    voletsTitle: 'My shutters', filterAll: 'All', voletsEmpty: 'No device yet. Pair a hub from “Add”.',
    leadVolets: (n, m) => `${n} devices across ${m} hubs`,
    details: 'Details', rename: 'Rename', typeWord: 'Type', positional: 'positional', impulsional: 'pulsed',
    posWord: 'Position', radioState: (d) => `received ${d} dBm`, offline: 'offline', offlineSuffix: ' · offline', nameLabel: 'Name',
    boitiersTitle: 'Hubs', leadBoitiers: (n, cap) => `Name and configure your OpenProfalux hubs. ${n} of ${cap}.`,
    online: 'online', offlineShort: 'offline', updAvail: 'update', configure: 'Configure', devicesWord: 'devices',
    backBoxes: 'All hubs',
    leadBoitier: (id, c, up) => `${id} · ${c} devices${up ? ` · up for ${up}` : ''}`,
    tabConfig: 'Configuration', tabManage: 'Manage',
    availability: 'Availability', readonly: 'read only', editable: 'editable', state: 'State', since: 'Up for',
    wifiSignal: 'Wi-Fi signal', radios: 'Radios', firmware: 'Firmware', upToDate: 'up to date', updateAvailable: 'update available',
    comingSoon: 'Coming soon',
    comingSoonNote: 'Wi-Fi (read only) and local MQTT (remote editing) will appear once the hub reports its status; for now, set these in the hub’s local interface.',
    boxName: 'Hub name', boxNameHint: 'Display name (e.g. Home 1, Seaside…)',
    deleteTitle: 'Delete the hub',
    deleteNote: 'Removes the hub and its devices from this account. Local hardware and Home Assistant are untouched. Cloud pairing will need to be redone.',
    deleteBtn: 'Remove from my account', confirmDelete: (n) => `Confirm deletion of “${n}”?`, yesDelete: 'Yes, delete', cancel: 'Cancel',
    renameError: 'Rename failed.', deleteError: 'Delete failed.',
    addTitle: 'Add a hub', addLead: 'Link an OpenProfalux hub to your account.',
    getCodeTitle: 'Get a pairing code', getCodeNote: 'Enter it in the “Cloud” tab of the hub interface, on your local network.',
    getCodeBtn: 'Get a code', pairCode: (c) => `Pairing code: ${c}`, errPrefix: (e) => `Error: ${e}`, netErr: 'Network error, try again.',
    howTitle: 'How it works',
    howText: '1. Generate a code above. 2. Open the hub interface on your network, Cloud tab. 3. Paste the code: the hub enrolls and appears under “Hubs”. You can then name it. The code expires after a few minutes.',
    accountTitle: 'Account', accountLead: 'Signed in with your isno.fr account', identity: 'Identity',
    address: 'Address', connection: 'Sign-in', subscription: 'Plan', boxesWord: 'Hubs', formula: 'Plan', included: 'included',
    capNote: (cap) => `Beyond ${cap} hubs, a monthly plan unlocks more.`,
    logoutTitle: 'Sign out', logoutNote: 'Closes the session on this device.', logoutBtn: 'Sign out',
    signInTitle: 'Sign in', signInUser: 'Account', signInPass: 'Password', signInBtn: 'Enter', signInError: 'Invalid credentials.',
  },
} satisfies Record<Lang, S>;

export const t = (lang: Lang): S => STRINGS[lang];

/** Libelles des 3 commandes, localises PAR TYPE. Le device declare le type ; l'app traduit l'etiquette. */
const ACTIONS = {
  [DEVICE_TYPE.volet]: {
    [LANG.fr]: { up: 'Montée', stop: 'Stop', down: 'Descente' },
    [LANG.en]: { up: 'Up', stop: 'Stop', down: 'Down' },
  },
  [DEVICE_TYPE.portail]: {
    [LANG.fr]: { up: 'Ouvrir', stop: 'Stop', down: 'Fermer' },
    [LANG.en]: { up: 'Open', stop: 'Stop', down: 'Close' },
  },
} satisfies Record<DeviceType, Record<Lang, { up: string; stop: string; down: string }>>;
export const actionLabels = (type: DeviceType, lang: Lang) => ACTIONS[type][lang];

/** Table des routes par langue (FR racine, EN sous /en/ avec slugs traduits). */
export const ROUTES = {
  volets: { [LANG.fr]: '/', [LANG.en]: '/en' },
  boitiers: { [LANG.fr]: '/boitiers', [LANG.en]: '/en/boxes' },
  ajouter: { [LANG.fr]: '/ajouter', [LANG.en]: '/en/add' },
  compte: { [LANG.fr]: '/compte', [LANG.en]: '/en/account' },
  connexion: { [LANG.fr]: '/connexion', [LANG.en]: '/en/sign-in' },
} satisfies Record<string, Record<Lang, string>>;
export const boitierHref = (id: string, lang: Lang): string => (lang === LANG.en ? `/en/box/${id}` : `/boitier/${id}`);

/** Items de nav pour une langue, avec test d'activite sur le chemin courant. */
export function navItems(lang: Lang) {
  const s = t(lang);
  return [
    { href: ROUTES.volets[lang], label: s.nav.volets, active: (p: string) => p === ROUTES.volets[lang] },
    { href: ROUTES.boitiers[lang], label: s.nav.boitiers, active: (p: string) => p.startsWith(lang === LANG.en ? '/en/box' : '/boitier') },
    { href: ROUTES.ajouter[lang], label: s.nav.ajouter, active: (p: string) => p === ROUTES.ajouter[lang] },
    { href: ROUTES.compte[lang], label: s.nav.compte, active: (p: string) => p === ROUTES.compte[lang] },
  ];
}
