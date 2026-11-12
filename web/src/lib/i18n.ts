// i18n de l'app cloud, meme schema que le site isno.fr : FR par defaut a la racine, EN sous /en/ avec
// slugs traduits. STRINGS typees `satisfies Record<Lang, S>` => le compilateur exige les memes cles en
// FR et EN (comme LAYOUT_STRINGS du site). Les libelles de commande sont localises PAR TYPE cote app :
// l'appareil declare le type et l'action canonique (UP/STOP/DOWN), l'app ne traduit que l'etiquette.
// Vocabulaire : « appareil » = le boitier OpenProfalux (ce qu'on ajoute, nomme, configure). Un appareil
// contient ses volets/portails.
import { DEVICE_TYPE, type DeviceType } from './types.ts';

export const LANG = { fr: 'fr', en: 'en' } as const;
export type Lang = (typeof LANG)[keyof typeof LANG];
export const otherLang = (l: Lang): Lang => (l === LANG.fr ? LANG.en : LANG.fr);

/** Forme des textes : chaque cle existe dans les deux langues (verifie par `satisfies`). */
interface S {
  // chrome
  brandAria: string; themeToggle: string; menu: string; langSwitch: string; langName: string;
  nav: { appareils: string; ajouter: string; compte: string };
  footNote: string;
  // vue appareils (accueil)
  appareilsTitle: string; voletsEmpty: string; noCovers: string;
  leadAppareils: (n: number) => string;
  // carte volet/portail
  details: string; rename: string; typeWord: string; positional: string; impulsional: string;
  posWord: string; radioState: (dbm: number) => string; offline: string; offlineSuffix: string; nameLabel: string;
  // etat appareil
  online: string; offlineShort: string; updAvail: string; configure: string; devicesWord: string;
  // page appareil (configuration)
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
  boxesWord: string;
  logoutTitle: string; logoutNote: string; logoutBtn: string;
  // connexion
  signInTitle: string; signInUser: string; signInPass: string; signInBtn: string; signInError: string;
  // nav admin (operateur)
  adminNav: { utilisateurs: string; parametres: string };
  // vue utilisateurs (admin)
  usersTitle: string; usersLead: string; userNewTitle: string; userLogin: string; userPassword: string; userCap: string;
  userMakeAdmin: string; createUserBtn: string; usersListTitle: string; colLogin: string; colRole: string; colCap: string; colDevices: string;
  roleAdmin: string; roleUser: string; youTag: string; removeUser: string; confirmRemoveUser: (id: string) => string;
  createUserError: string; removeUserError: string;
  // vue parametres (admin)
  settingsTitle: string; settingsLead: string; dbKindLabel: string; dbSqlite: string; dbMongoBundled: string; dbMongoExternal: string;
  publicUrlLabel: string; brokerUrlLabel: string; saveSettingsBtn: string; settingsSaved: string; settingsError: string;
}

export const STRINGS = {
  [LANG.fr]: {
    brandAria: 'ISNO Cloud, accueil', themeToggle: 'Basculer le thème clair / sombre', menu: 'Menu',
    langSwitch: 'View this page in English', langName: 'EN',
    nav: { appareils: 'appareils', ajouter: 'ajouter', compte: 'compte' },
    footNote: 'app.isno.fr',
    appareilsTitle: 'Mes appareils', voletsEmpty: 'Aucun appareil. Ajoutez-en un.', noCovers: 'Aucun volet pour cet appareil.',
    leadAppareils: (n) => `${n} appareil${n > 1 ? 's' : ''}`,
    details: 'Détails', rename: 'Renommer', typeWord: 'Type', positional: 'positionnel', impulsional: 'impulsionnel',
    posWord: 'Position', radioState: (d) => `reçu ${d} dBm`, offline: 'hors ligne', offlineSuffix: ' · hors ligne', nameLabel: 'Nom',
    online: 'en ligne', offlineShort: 'hors ligne', updAvail: 'maj dispo', configure: 'Configurer', devicesWord: 'volets',
    backBoxes: 'Mes appareils',
    leadBoitier: (id, c, up) => `${id} · ${c} volets${up ? ` · actif depuis ${up}` : ''}`,
    tabConfig: 'Configuration', tabManage: 'Gérer',
    availability: 'Disponibilité', readonly: 'lecture seule', editable: 'modifiable', state: 'État', since: 'Depuis',
    wifiSignal: 'Signal Wi-Fi', radios: 'Radios', firmware: 'Firmware', upToDate: 'à jour', updateAvailable: 'mise à jour dispo',
    comingSoon: 'Bientôt',
    comingSoonNote: "Wi-Fi (lecture seule) et MQTT local (modifiable à distance) arriveront quand l'appareil publiera son état ; pour l'instant, cela se règle dans l'interface locale de l'appareil.",
    boxName: "Nom de l'appareil", boxNameHint: 'Nom affiché (ex. Maison 1, Résidence…)',
    deleteTitle: "Supprimer l'appareil",
    deleteNote: "Retire l'appareil et ses volets de ce compte. Le matériel local et Home Assistant ne sont pas touchés. L'appairage cloud devra être refait.",
    deleteBtn: 'Supprimer de mon compte', confirmDelete: (n) => `Confirmer la suppression de « ${n} » ?`, yesDelete: 'Oui, supprimer', cancel: 'Annuler',
    renameError: 'Le renommage a échoué.', deleteError: 'La suppression a échoué.',
    addTitle: 'Ajouter un appareil', addLead: 'Associez un appareil OpenProfalux à votre compte.',
    getCodeTitle: "Obtenir un code d'appairage", getCodeNote: "À saisir dans l'onglet « Cloud » de l'interface de l'appareil, sur votre réseau local.",
    getCodeBtn: 'Obtenir un code', pairCode: (c) => `Code d’appairage : ${c}`, errPrefix: (e) => `Erreur : ${e}`, netErr: 'Erreur réseau, réessayez.',
    howTitle: 'Comment ça marche',
    howText: "1. Générez un code ci-dessus. 2. Ouvrez l'interface de l'appareil sur votre réseau, onglet Cloud. 3. Collez le code : l'appareil s'enrôle et apparaît dans « Appareils ». Vous pourrez alors le nommer. Le code expire après quelques minutes.",
    accountTitle: 'Compte', accountLead: 'Connecté via votre compte isno.fr', identity: 'Identité',
    address: 'Adresse', connection: 'Connexion', boxesWord: 'Appareils',
    logoutTitle: 'Se déconnecter', logoutNote: 'Ferme la session sur cet appareil.', logoutBtn: 'Déconnexion',
    signInTitle: 'Connexion', signInUser: 'Compte', signInPass: 'Mot de passe', signInBtn: 'Entrer', signInError: 'Identifiants invalides.',
    adminNav: { utilisateurs: 'utilisateurs', parametres: 'paramètres' },
    usersTitle: 'Utilisateurs', usersLead: 'Créez et gérez les comptes qui pilotent des appareils sur ce portail.',
    userNewTitle: 'Nouvel utilisateur', userLogin: 'Identifiant', userPassword: 'Mot de passe', userCap: "Plafond d'appareils",
    userMakeAdmin: 'Opérateur (accès Paramètres et Utilisateurs)', createUserBtn: 'Créer', usersListTitle: 'Comptes',
    colLogin: 'Identifiant', colRole: 'Rôle', colCap: 'Plafond', colDevices: 'Appareils',
    roleAdmin: 'opérateur', roleUser: 'utilisateur', youTag: 'vous', removeUser: 'Supprimer',
    confirmRemoveUser: (id) => `Supprimer le compte « ${id} » et ses appareils ?`,
    createUserError: 'Création impossible (identifiant déjà pris ou champ invalide).', removeUserError: 'Suppression impossible.',
    settingsTitle: 'Paramètres', settingsLead: "Configuration de l'instance, définie à l'installation.",
    dbKindLabel: 'Base de données', dbSqlite: 'SQLite (embarqué)', dbMongoBundled: 'MongoDB (fourni)', dbMongoExternal: 'MongoDB (externe)',
    publicUrlLabel: 'URL publique du portail', brokerUrlLabel: 'URL publique du broker MQTT',
    saveSettingsBtn: 'Enregistrer', settingsSaved: 'Enregistré.', settingsError: 'Enregistrement impossible.',
  },
  [LANG.en]: {
    brandAria: 'ISNO Cloud, home', themeToggle: 'Toggle light / dark theme', menu: 'Menu',
    langSwitch: 'Voir cette page en français', langName: 'FR',
    nav: { appareils: 'devices', ajouter: 'add', compte: 'account' },
    footNote: 'app.isno.fr',
    appareilsTitle: 'My devices', voletsEmpty: 'No device yet. Add one.', noCovers: 'No shutter on this device.',
    leadAppareils: (n) => `${n} device${n === 1 ? '' : 's'}`,
    details: 'Details', rename: 'Rename', typeWord: 'Type', positional: 'positional', impulsional: 'pulsed',
    posWord: 'Position', radioState: (d) => `received ${d} dBm`, offline: 'offline', offlineSuffix: ' · offline', nameLabel: 'Name',
    online: 'online', offlineShort: 'offline', updAvail: 'update', configure: 'Configure', devicesWord: 'shutters',
    backBoxes: 'My devices',
    leadBoitier: (id, c, up) => `${id} · ${c} shutters${up ? ` · up for ${up}` : ''}`,
    tabConfig: 'Configuration', tabManage: 'Manage',
    availability: 'Availability', readonly: 'read only', editable: 'editable', state: 'State', since: 'Up for',
    wifiSignal: 'Wi-Fi signal', radios: 'Radios', firmware: 'Firmware', upToDate: 'up to date', updateAvailable: 'update available',
    comingSoon: 'Coming soon',
    comingSoonNote: 'Wi-Fi (read only) and local MQTT (remote editing) will appear once the device reports its status; for now, set these in the device’s local interface.',
    boxName: 'Device name', boxNameHint: 'Display name (e.g. Home 1, Seaside…)',
    deleteTitle: 'Delete the device',
    deleteNote: 'Removes the device and its shutters from this account. Local hardware and Home Assistant are untouched. Cloud pairing will need to be redone.',
    deleteBtn: 'Remove from my account', confirmDelete: (n) => `Confirm deletion of “${n}”?`, yesDelete: 'Yes, delete', cancel: 'Cancel',
    renameError: 'Rename failed.', deleteError: 'Delete failed.',
    addTitle: 'Add a device', addLead: 'Link an OpenProfalux device to your account.',
    getCodeTitle: 'Get a pairing code', getCodeNote: 'Enter it in the “Cloud” tab of the device interface, on your local network.',
    getCodeBtn: 'Get a code', pairCode: (c) => `Pairing code: ${c}`, errPrefix: (e) => `Error: ${e}`, netErr: 'Network error, try again.',
    howTitle: 'How it works',
    howText: '1. Generate a code above. 2. Open the device interface on your network, Cloud tab. 3. Paste the code: the device enrolls and appears under “Devices”. You can then name it. The code expires after a few minutes.',
    accountTitle: 'Account', accountLead: 'Signed in with your isno.fr account', identity: 'Identity',
    address: 'Address', connection: 'Sign-in', boxesWord: 'Devices',
    logoutTitle: 'Sign out', logoutNote: 'Closes the session on this device.', logoutBtn: 'Sign out',
    signInTitle: 'Sign in', signInUser: 'Account', signInPass: 'Password', signInBtn: 'Enter', signInError: 'Invalid credentials.',
    adminNav: { utilisateurs: 'users', parametres: 'settings' },
    usersTitle: 'Users', usersLead: 'Create and manage the accounts that control devices on this portal.',
    userNewTitle: 'New user', userLogin: 'Login', userPassword: 'Password', userCap: 'Device limit',
    userMakeAdmin: 'Operator (access to Settings and Users)', createUserBtn: 'Create', usersListTitle: 'Accounts',
    colLogin: 'Login', colRole: 'Role', colCap: 'Limit', colDevices: 'Devices',
    roleAdmin: 'operator', roleUser: 'user', youTag: 'you', removeUser: 'Remove',
    confirmRemoveUser: (id) => `Delete account “${id}” and its devices?`,
    createUserError: 'Could not create (login already taken or invalid field).', removeUserError: 'Could not remove.',
    settingsTitle: 'Settings', settingsLead: 'Instance configuration, set at install time.',
    dbKindLabel: 'Database', dbSqlite: 'SQLite (embedded)', dbMongoBundled: 'MongoDB (bundled)', dbMongoExternal: 'MongoDB (external)',
    publicUrlLabel: 'Public portal URL', brokerUrlLabel: 'Public MQTT broker URL',
    saveSettingsBtn: 'Save', settingsSaved: 'Saved.', settingsError: 'Could not save.',
  },
} satisfies Record<Lang, S>;

export const t = (lang: Lang): S => STRINGS[lang];

/** Libelles des 3 commandes, localises PAR TYPE. L'appareil declare le type ; l'app traduit l'etiquette. */
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
  appareils: { [LANG.fr]: '/', [LANG.en]: '/en' },
  ajouter: { [LANG.fr]: '/ajouter', [LANG.en]: '/en/add' },
  compte: { [LANG.fr]: '/compte', [LANG.en]: '/en/account' },
  connexion: { [LANG.fr]: '/connexion', [LANG.en]: '/en/sign-in' },
  utilisateurs: { [LANG.fr]: '/utilisateurs', [LANG.en]: '/en/users' },
  parametres: { [LANG.fr]: '/parametres', [LANG.en]: '/en/settings' },
} satisfies Record<string, Record<Lang, string>>;
/** URL de configuration d'un appareil (le chemin reste /boitier pour l'historique des liens). */
export const appareilHref = (id: string, lang: Lang): string => (lang === LANG.en ? `/en/box/${id}` : `/boitier/${id}`);

/** Items de nav pour une langue, avec test d'activite sur le chemin courant. */
export function navItems(lang: Lang) {
  const s = t(lang);
  return [
    { href: ROUTES.appareils[lang], label: s.nav.appareils, active: (p: string) => p === ROUTES.appareils[lang] || p.startsWith(lang === LANG.en ? '/en/box' : '/boitier') },
    { href: ROUTES.ajouter[lang], label: s.nav.ajouter, active: (p: string) => p === ROUTES.ajouter[lang] },
    { href: ROUTES.compte[lang], label: s.nav.compte, active: (p: string) => p === ROUTES.compte[lang] },
  ];
}

/** Items de nav reserves a l'operateur (admin) : ajoutes au menu quand le compte courant est admin. */
export function adminNavItems(lang: Lang) {
  const s = t(lang);
  return [
    { href: ROUTES.utilisateurs[lang], label: s.adminNav.utilisateurs, active: (p: string) => p === ROUTES.utilisateurs[lang] },
    { href: ROUTES.parametres[lang], label: s.adminNav.parametres, active: (p: string) => p === ROUTES.parametres[lang] },
  ];
}
