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
  footSponsor: string;
  // vue appareils (accueil)
  appareilsTitle: string; noCovers: string;
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
  accountTitle: string; accountLead: string; identity: string;
  boxesWord: string;
  logoutTitle: string; logoutNote: string; logoutBtn: string;
  // connexion
  signInTitle: string; signInUser: string; signInPass: string; signInBtn: string; signInError: string;
  // nav admin (operateur)
  adminNav: { utilisateurs: string; parametres: string };
  // vue utilisateurs (admin)
  usersTitle: string; usersLead: string; userNewTitle: string; userLogin: string; userName: string; userPassword: string; userCap: string;
  userMakeAdmin: string; createUserBtn: string; usersListTitle: string; colLogin: string; colRole: string; colCap: string; colDevices: string;
  roleAdmin: string; roleUser: string; youTag: string; removeUser: string; confirmRemoveUser: (id: string) => string;
  createUserError: string; removeUserError: string; makeOperator: string; unmakeOperator: string; roleError: string;
  // liaison d'un appareil (device grant) + onboarding utilisateur
  linkTitle: string; linkLead: string; linkCodeLabel: string; linkCodePh: string; linkContinue: string;
  linkConfirmTitle: string; linkIdWord: string; linkNameLabel: string; linkNamePh: string; linkConfirmBtn: string;
  linkDoneTitle: string; linkDoneNote: string; linkGoDevices: string; linkInvalid: string; linkCapError: (cap: number) => string;
  welcomeTitle: string; welcomeLead: string; welcomeStep1: string; welcomeStep2: string; welcomeStep3: string;
  legacyHint: string; legacyLink: string;
  // vue parametres (admin)
  settingsTitle: string; settingsLead: string; dbKindLabel: string; dbSqlite: string; dbMongoBundled: string; dbMongoExternal: string;
  publicUrlLabel: string; brokerUrlLabel: string;
  pluginsTitle: string; pluginBuiltin: string; pluginExternal: string; noLoginMethod: string;
  // connexion securisee (greffon Comptes locaux)
  loginCaptchaLabel: string;
  forgotLink: string; forgotTitle: string; forgotIntro: string; forgotBtn: string; forgotSent: string; backToLogin: string;
  setPasswordTitle: string; newPassword: string; confirmPassword: string; setPasswordBtn: string; passwordMismatch: string;
  linkExpired: string; askNewLink: string; passwordSetOk: string;
  userPassInviteHint: string; invitedTag: string; resendInviteBtn: string;
  smtpTitle: string; smtpOff: string; smtpIntro: string; smtpHost: string; smtpPort: string; smtpSecurity: string; smtpSecNone: string;
  smtpUser: string; smtpPass: string; smtpPassKept: string; smtpFrom: string; smtpFromName: string; smtpDisable: string; smtpTest: string; smtpTestOk: string; loginCaptchaError: string; loginLocked: string; loginTotpPrompt: string; loginTotpError: string; loginExpired: string; totpCodeLabel: string;
  // double authentification (Compte)
  totpTitle: string; totpIntro: string; totpEnable: string; totpManual: string; totpConfirm: string; totpOnNote: string; totpDisable: string; totpRequiredNotice: string;
  // utilisateurs : etat de securite
  lockedTag: string; unlockBtn: string; totpResetBtn: string;
  // parametres
  generalTitle: string; appNameLabel: string; appNameHint: string; saveBtn: string; savedMsg: string; saveError: string;
  securityTitle: string; securityByPlugin: string; secCaptcha: string; secLockout: string; secMaxFailures: string; secLockMinutes: string;
  secTotp: string; secPasswordMin: string; totpPolicyOff: string; totpPolicyOptional: string; totpPolicyOperators: string; totpPolicyAll: string;
}

export const STRINGS = {
  [LANG.fr]: {
    brandAria: 'ISNO Cloud, accueil', themeToggle: 'Basculer le thème clair / sombre', menu: 'Menu',
    langSwitch: 'View this page in English', langName: 'EN',
    nav: { appareils: 'appareils', ajouter: 'ajouter', compte: 'compte' },
    footSponsor: 'Sponsorisé par',
    appareilsTitle: 'Mes appareils', noCovers: 'Aucun volet pour cet appareil.',
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
    getCodeTitle: 'Votre boîtier vous demande un code ?', getCodeNote: "Firmware antérieur : obtenez un code ici, puis saisissez-le dans l'onglet « Cloud » de l'interface du boîtier.",
    getCodeBtn: 'Obtenir un code', pairCode: (c) => `Code d’appairage : ${c}`, errPrefix: (e) => `Erreur : ${e}`, netErr: 'Erreur réseau, réessayez.',
    howTitle: 'Comment ça marche',
    howText: "Sur le boîtier (interface locale, onglet Cloud), lancez l'appairage : il affiche un QR code et un code court. Scannez le QR avec votre téléphone, ou saisissez le code ci-dessus, puis confirmez. Le boîtier récupère son certificat tout seul et apparaît dans « Appareils ». Le code expire après dix minutes.",
    accountTitle: 'Compte', accountLead: 'Votre compte sur ce portail.', identity: 'Identité',
    boxesWord: 'Appareils',
    logoutTitle: 'Se déconnecter', logoutNote: 'Ferme la session sur cet appareil.', logoutBtn: 'Déconnexion',
    signInTitle: 'Connexion', signInUser: 'E-mail', signInPass: 'Mot de passe', signInBtn: 'Se connecter', signInError: 'Identifiants invalides.',
    adminNav: { utilisateurs: 'utilisateurs', parametres: 'paramètres' },
    usersTitle: 'Utilisateurs', usersLead: 'Créez et gérez les comptes qui pilotent des appareils sur ce portail.',
    userNewTitle: 'Nouvel utilisateur', userLogin: 'E-mail', userName: 'Nom', userPassword: 'Mot de passe', userCap: "Plafond d'appareils",
    userMakeAdmin: 'Opérateur (accès Paramètres et Utilisateurs)', createUserBtn: 'Créer', usersListTitle: 'Comptes',
    colLogin: 'Compte', colRole: 'Rôle', colCap: 'Plafond', colDevices: 'Appareils',
    roleAdmin: 'opérateur', roleUser: 'utilisateur', youTag: 'vous', removeUser: 'Supprimer',
    confirmRemoveUser: (id) => `Supprimer le compte « ${id} » et ses appareils ?`,
    createUserError: 'Création impossible (e-mail déjà utilisé ou champ invalide).', removeUserError: 'Suppression impossible.',
    makeOperator: 'Rendre opérateur', unmakeOperator: 'Retirer opérateur', roleError: 'Changement de rôle impossible.',
    linkTitle: 'Lier un appareil', linkLead: 'Saisissez le code affiché par votre boîtier, ou scannez son QR code.',
    linkCodeLabel: 'Code affiché par le boîtier', linkCodePh: 'XXXX-XXXX', linkContinue: 'Continuer',
    linkConfirmTitle: 'Ajouter cet appareil à votre compte ?', linkIdWord: 'Identifiant',
    linkNameLabel: 'Nom (facultatif)', linkNamePh: 'Maison, Résidence…', linkConfirmBtn: 'Confirmer',
    linkDoneTitle: 'Appareil lié', linkDoneNote: 'Votre boîtier récupère son certificat et se connecte dans quelques secondes.',
    linkGoDevices: 'Voir mes appareils',
    linkInvalid: "Code inconnu ou expiré. Relancez l'appairage sur le boîtier pour obtenir un nouveau code.",
    linkCapError: (cap) => `Plafond atteint (${cap} appareils). Supprimez un appareil pour en ajouter un autre.`,
    welcomeTitle: 'Bienvenue', welcomeLead: 'Ajoutez votre premier appareil en trois étapes.',
    welcomeStep1: 'Branchez votre boîtier OpenProfalux et connectez-le à votre Wi-Fi.',
    welcomeStep2: "Ouvrez son interface sur votre réseau, onglet Cloud, et lancez l'appairage : il affiche un QR code.",
    welcomeStep3: 'Scannez ce QR code avec votre téléphone, ou saisissez le code ci-dessous.',
    legacyHint: 'Votre boîtier vous demande un code ?', legacyLink: 'Obtenez-en un ici',
    settingsTitle: 'Paramètres', settingsLead: "Configuration de l'instance, définie à l'installation.",
    dbKindLabel: 'Base de données', dbSqlite: 'SQLite (embarqué)', dbMongoBundled: 'MongoDB (fourni)', dbMongoExternal: 'MongoDB (externe)',
    publicUrlLabel: 'URL publique du portail', brokerUrlLabel: 'URL publique du broker MQTT',
    pluginsTitle: 'Greffons installés', pluginBuiltin: 'intégré', pluginExternal: 'externe',
    noLoginMethod: "Aucun mode de connexion n'est installé sur ce portail (greffon manquant).",
    loginCaptchaLabel: 'Recopiez le code',
    forgotLink: 'Mot de passe oublié ?', forgotTitle: 'Mot de passe oublié', forgotIntro: 'Indiquez votre e-mail : si un compte y est rattaché, vous recevrez un lien pour choisir un nouveau mot de passe.',
    forgotBtn: 'Envoyer le lien', forgotSent: 'Si un compte existe pour cette adresse, un e-mail vient de partir. Pensez à regarder les indésirables.', backToLogin: 'Retour à la connexion',
    setPasswordTitle: 'Choisir un mot de passe', newPassword: 'Nouveau mot de passe', confirmPassword: 'Confirmez le mot de passe', setPasswordBtn: 'Enregistrer',
    passwordMismatch: 'Les deux mots de passe ne correspondent pas.', linkExpired: 'Ce lien a expiré ou a déjà servi.', askNewLink: 'Demander un nouveau lien',
    passwordSetOk: 'Mot de passe enregistré. Vous pouvez vous connecter.',
    userPassInviteHint: "Laissez vide pour envoyer une invitation par e-mail : l'utilisateur choisira son mot de passe.", invitedTag: 'invité', resendInviteBtn: "Renvoyer l'invitation",
    smtpTitle: 'Messagerie (SMTP)', smtpOff: 'non configurée', smtpIntro: 'Sert aux invitations et au mot de passe oublié. Sans messagerie, ces fonctions restent masquées.',
    smtpHost: 'Serveur', smtpPort: 'Port', smtpSecurity: 'Sécurité', smtpSecNone: 'Aucune', smtpUser: 'Identifiant', smtpPass: 'Mot de passe', smtpPassKept: 'inchangé',
    smtpFrom: 'Adresse d’expédition', smtpFromName: 'Nom d’expéditeur', smtpDisable: 'Désactiver', smtpTest: "Envoyer un test", smtpTestOk: 'E-mail de test envoyé à', loginCaptchaError: 'Code de vérification incorrect.',
    loginLocked: 'Compte temporairement bloqué après trop de tentatives. Réessayez plus tard, ou demandez à un opérateur de le débloquer.',
    loginTotpPrompt: "Saisissez le code à 6 chiffres de votre appli d'authentification.", loginTotpError: 'Code incorrect.',
    loginExpired: 'Délai dépassé : reconnectez-vous.', totpCodeLabel: 'Code',
    totpTitle: 'Double authentification', totpIntro: "Protégez votre compte avec un code à 6 chiffres d'une appli d'authentification (Aegis, Google Authenticator, 2FAS…).",
    totpEnable: 'Activer', totpManual: 'Scannez le QR code avec votre appli, ou saisissez cette clé :', totpConfirm: 'Confirmer',
    totpOnNote: 'Double authentification activée.', totpDisable: 'Désactiver (code requis)',
    totpRequiredNotice: 'Ce portail exige la double authentification pour votre compte : activez-la pour continuer.',
    lockedTag: 'bloqué', unlockBtn: 'Débloquer', totpResetBtn: 'Réinitialiser la 2FA',
    generalTitle: 'Général', appNameLabel: 'Nom du portail', appNameHint: 'Affiché dans la barre et le titre des onglets. Vide : la marque par défaut.',
    saveBtn: 'Enregistrer', savedMsg: 'Enregistré.', saveError: 'Enregistrement impossible.',
    securityTitle: 'Sécurité des comptes locaux', securityByPlugin: 'greffon Comptes locaux',
    secCaptcha: 'Captcha à la connexion', secLockout: 'Bloquer un compte après plusieurs échecs',
    secMaxFailures: "Nombre d'échecs", secLockMinutes: 'Durée du blocage (minutes)',
    secTotp: 'Double authentification', secPasswordMin: 'Longueur minimale du mot de passe',
    totpPolicyOff: 'Désactivée', totpPolicyOptional: 'Facultative', totpPolicyOperators: 'Exigée pour les opérateurs', totpPolicyAll: 'Exigée pour tous',
  },
  [LANG.en]: {
    brandAria: 'ISNO Cloud, home', themeToggle: 'Toggle light / dark theme', menu: 'Menu',
    langSwitch: 'Voir cette page en français', langName: 'FR',
    nav: { appareils: 'devices', ajouter: 'add', compte: 'account' },
    footSponsor: 'Sponsored by',
    appareilsTitle: 'My devices', noCovers: 'No shutter on this device.',
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
    getCodeTitle: 'Your device asks you for a code?', getCodeNote: 'Older firmware: get a code here, then enter it in the “Cloud” tab of the device interface.',
    getCodeBtn: 'Get a code', pairCode: (c) => `Pairing code: ${c}`, errPrefix: (e) => `Error: ${e}`, netErr: 'Network error, try again.',
    howTitle: 'How it works',
    howText: 'On the device (local interface, Cloud tab), start pairing: it shows a QR code and a short code. Scan the QR with your phone, or enter the code above, then confirm. The device fetches its certificate on its own and appears under “Devices”. The code expires after ten minutes.',
    accountTitle: 'Account', accountLead: 'Your account on this portal.', identity: 'Identity',
    boxesWord: 'Devices',
    logoutTitle: 'Sign out', logoutNote: 'Closes the session on this device.', logoutBtn: 'Sign out',
    signInTitle: 'Sign in', signInUser: 'Email', signInPass: 'Password', signInBtn: 'Sign in', signInError: 'Invalid credentials.',
    adminNav: { utilisateurs: 'users', parametres: 'settings' },
    usersTitle: 'Users', usersLead: 'Create and manage the accounts that control devices on this portal.',
    userNewTitle: 'New user', userLogin: 'Email', userName: 'Name', userPassword: 'Password', userCap: 'Device limit',
    userMakeAdmin: 'Operator (access to Settings and Users)', createUserBtn: 'Create', usersListTitle: 'Accounts',
    colLogin: 'Account', colRole: 'Role', colCap: 'Limit', colDevices: 'Devices',
    roleAdmin: 'operator', roleUser: 'user', youTag: 'you', removeUser: 'Remove',
    confirmRemoveUser: (id) => `Delete account “${id}” and its devices?`,
    createUserError: 'Could not create (email already used or invalid field).', removeUserError: 'Could not remove.',
    makeOperator: 'Make operator', unmakeOperator: 'Remove operator', roleError: 'Could not change role.',
    linkTitle: 'Link a device', linkLead: 'Enter the code shown by your device, or scan its QR code.',
    linkCodeLabel: 'Code shown by the device', linkCodePh: 'XXXX-XXXX', linkContinue: 'Continue',
    linkConfirmTitle: 'Add this device to your account?', linkIdWord: 'ID',
    linkNameLabel: 'Name (optional)', linkNamePh: 'Home, Seaside…', linkConfirmBtn: 'Confirm',
    linkDoneTitle: 'Device linked', linkDoneNote: 'Your device is fetching its certificate and will connect in a few seconds.',
    linkGoDevices: 'See my devices',
    linkInvalid: 'Unknown or expired code. Restart pairing on the device to get a new code.',
    linkCapError: (cap) => `Limit reached (${cap} devices). Remove a device to add another one.`,
    welcomeTitle: 'Welcome', welcomeLead: 'Add your first device in three steps.',
    welcomeStep1: 'Plug in your OpenProfalux device and connect it to your Wi-Fi.',
    welcomeStep2: 'Open its interface on your network, Cloud tab, and start pairing: it shows a QR code.',
    welcomeStep3: 'Scan that QR code with your phone, or enter the code below.',
    legacyHint: 'Your device asks you for a code?', legacyLink: 'Get one here',
    settingsTitle: 'Settings', settingsLead: 'Instance configuration, set at install time.',
    dbKindLabel: 'Database', dbSqlite: 'SQLite (embedded)', dbMongoBundled: 'MongoDB (bundled)', dbMongoExternal: 'MongoDB (external)',
    publicUrlLabel: 'Public portal URL', brokerUrlLabel: 'Public MQTT broker URL',
    pluginsTitle: 'Installed plugins', pluginBuiltin: 'built-in', pluginExternal: 'external',
    noLoginMethod: 'No sign-in method is installed on this portal (missing plugin).',
    loginCaptchaLabel: 'Type the code',
    forgotLink: 'Forgot password?', forgotTitle: 'Forgot password', forgotIntro: "Enter your email: if an account uses it, you'll receive a link to choose a new password.",
    forgotBtn: 'Send the link', forgotSent: 'If an account exists for this address, an email is on its way. Check your spam folder.', backToLogin: 'Back to sign in',
    setPasswordTitle: 'Choose a password', newPassword: 'New password', confirmPassword: 'Confirm password', setPasswordBtn: 'Save',
    passwordMismatch: "The two passwords don't match.", linkExpired: 'This link has expired or was already used.', askNewLink: 'Request a new link',
    passwordSetOk: 'Password saved. You can sign in.',
    userPassInviteHint: 'Leave empty to send an email invitation: the user will choose their password.', invitedTag: 'invited', resendInviteBtn: 'Resend invitation',
    smtpTitle: 'Mail (SMTP)', smtpOff: 'not configured', smtpIntro: 'Used for invitations and password resets. Without mail, these features stay hidden.',
    smtpHost: 'Server', smtpPort: 'Port', smtpSecurity: 'Security', smtpSecNone: 'None', smtpUser: 'Username', smtpPass: 'Password', smtpPassKept: 'unchanged',
    smtpFrom: 'Sender address', smtpFromName: 'Sender name', smtpDisable: 'Disable', smtpTest: 'Send a test', smtpTestOk: 'Test email sent to', loginCaptchaError: 'Wrong verification code.',
    loginLocked: 'Account temporarily locked after too many attempts. Try again later, or ask an operator to unlock it.',
    loginTotpPrompt: 'Enter the 6-digit code from your authenticator app.', loginTotpError: 'Wrong code.',
    loginExpired: 'Timed out: please sign in again.', totpCodeLabel: 'Code',
    totpTitle: 'Two-factor authentication', totpIntro: 'Protect your account with a 6-digit code from an authenticator app (Aegis, Google Authenticator, 2FAS…).',
    totpEnable: 'Enable', totpManual: 'Scan the QR code with your app, or enter this key:', totpConfirm: 'Confirm',
    totpOnNote: 'Two-factor authentication is on.', totpDisable: 'Disable (code required)',
    totpRequiredNotice: 'This portal requires two-factor authentication for your account: enable it to continue.',
    lockedTag: 'locked', unlockBtn: 'Unlock', totpResetBtn: 'Reset 2FA',
    generalTitle: 'General', appNameLabel: 'Portal name', appNameHint: 'Shown in the top bar and tab titles. Empty: default branding.',
    saveBtn: 'Save', savedMsg: 'Saved.', saveError: 'Could not save.',
    securityTitle: 'Local accounts security', securityByPlugin: 'Local accounts plugin',
    secCaptcha: 'Captcha at sign-in', secLockout: 'Lock an account after repeated failures',
    secMaxFailures: 'Failed attempts', secLockMinutes: 'Lock duration (minutes)',
    secTotp: 'Two-factor authentication', secPasswordMin: 'Minimum password length',
    totpPolicyOff: 'Off', totpPolicyOptional: 'Optional', totpPolicyOperators: 'Required for operators', totpPolicyAll: 'Required for everyone',
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
  lier: { [LANG.fr]: '/lier', [LANG.en]: '/en/link' },
  motDePasse: { [LANG.fr]: '/mot-de-passe', [LANG.en]: '/en/password' },
  oubli: { [LANG.fr]: '/mot-de-passe-oublie', [LANG.en]: '/en/forgot-password' },
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

/** Items de nav reserves a l'operateur. Utilisateurs n'apparait que si un greffon gere les comptes. */
export function adminNavItems(lang: Lang, opts: { userAdmin: boolean }) {
  const s = t(lang);
  return [
    ...(opts.userAdmin ? [{ href: ROUTES.utilisateurs[lang], label: s.adminNav.utilisateurs, active: (p: string) => p === ROUTES.utilisateurs[lang] }] : []),
    { href: ROUTES.parametres[lang], label: s.adminNav.parametres, active: (p: string) => p === ROUTES.parametres[lang] },
  ];
}
