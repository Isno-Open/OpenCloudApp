// Contrat des plugins de FAMILLE de boitiers (docs/FAMILLES.md). Une famille = un firmware et tout ce
// qu'il publie (OpenProfalux, OpenXtraflame...) ; son plugin apprend au portail a lire ses boitiers, a
// les commander et a dessiner leurs cartes. Le portail ne connait aucune famille en dur.
//
// Fichier SANS dependance a l'execution : un plugin du catalogue l'importe (livre a cote de son
// index.js, comme plugin-contract.js). Les types du moteur ne sont importes qu'en type.
import type { Icon, LocalizedText, SettingField, SettingValue } from "@isno-open/plugin-host/contract";

/** Version du contrat que suit une famille. Le portail refuse une famille d'une autre version. */
export const FAMILY_CONTRACT = 1;

/** Le vocabulaire des cartes, fixe par le coeur : une famille decrit chaque type d'appareil comme une
 *  liste de controles pris ici. Un controle absent s'ajoute ICI, pour toutes les familles. */
export const CONTROL = {
  action: "action",       // bouton : Monter, Stop, Descendre ; Ouvrir, Fermer
  toggle: "toggle",       // marche/arret
  setpoint: "setpoint",   // consigne bornee (min, max, pas, unite)
  position: "position",   // FERMETURE de 0 a 100 % (0 = ouvert, 100 = ferme, comme l'interface des boitiers), reglable ou non
  reading: "reading",     // releve affiche (nombre ou texte), seuils d'alerte eventuels
} as const;
export type ControlKind = (typeof CONTROL)[keyof typeof CONTROL];

type ControlBase = { id: string; label: LocalizedText };
export type ControlDecl =
  // confirm : question posee avant d'envoyer (action qu'on ne defait pas, ex. supprimer)
  | (ControlBase & { kind: typeof CONTROL.action; icon?: Icon; confirm?: LocalizedText })
  | (ControlBase & { kind: typeof CONTROL.toggle })
  | (ControlBase & { kind: typeof CONTROL.setpoint; min: number; max: number; step: number; unit: string })
  | (ControlBase & { kind: typeof CONTROL.position; settable: boolean })
  | (ControlBase & { kind: typeof CONTROL.reading; unit?: string; alertBelow?: number; alertAbove?: number });

/** Reglage propre aux familles : choisir PLUSIEURS AUTRES appareils du meme boitier (membres d'une
 *  centrale, suiveurs d'une zone). `kinds` : les types qu'on peut choisir. Valeur = la liste de leurs
 *  identifiants (`device` des faits). Le portail le dessine en choix multiple, une case par appareil,
 *  et verifie a l'enregistrement que chacun existe sur ce boitier et a un type permis. */
export const DEVICE_SETTING = { devices: "devices" } as const;
export type DevicesField = { kind: typeof DEVICE_SETTING.devices; key: string; label: LocalizedText; hint?: LocalizedText; kinds: readonly string[] };
export type DeviceSettingField = SettingField | DevicesField;

/** Un type d'appareil d'une famille, sa carte, et ses REGLAGES : des champs du moteur de plugins
 *  (nombre, case, choix, texte) ou un choix d'appareils du boitier, que le portail dessine avec l'ecran
 *  de reglages partage et que la famille traduit pour le boitier (configure). Ex. les temps de course
 *  d'un volet, les membres d'une centrale. */
export type KindDecl = { id: string; label: LocalizedText; icon: Icon; controls: readonly ControlDecl[]; settings?: readonly DeviceSettingField[];
  /** Ou vivent ses cartes : sur l'accueil (par defaut), ou sur la page du boitier, dans un onglet nomme
   *  `group` (ex. les telecommandes connues d'un boitier, qu'on gere sans les piloter). */
  place?: KindPlace; group?: LocalizedText };
export const KIND_PLACE = { home: "home", box: "box" } as const;
export type KindPlace = (typeof KIND_PLACE)[keyof typeof KIND_PLACE];
// natures permises : nombre, case, choix, texte (le coeur refuse le reste, device-families.ts)

/** Ce que le coeur passe a read() : un message d'un boitier, sans `<racine>/<boitier>/`. */
export type FamilyMessage = { box: string; path: string; payload: string; retained: boolean };

/** Ce que read() rend : des FAITS, que le coeur verifie avant de les appliquer. */
export const FACT = { presence: "presence", device: "device", state: "state", box: "box", event: "event", gone: "gone", file: "file" } as const;
export type FactKind = (typeof FACT)[keyof typeof FACT];
export const EVENT_LEVEL = { info: "info", alert: "alert" } as const;
export type EventLevel = (typeof EVENT_LEVEL)[keyof typeof EVENT_LEVEL];

export type ControlValue = number | boolean | string;
export type Fact =
  // disabled : hors ligne PARCE QUE le boitier a coupe lui-meme sa liaison au portail (et l'a annonce
  // avant de partir) ; le portail dit « cloud desactive sur le boitier », pas une panne
  | { fact: typeof FACT.presence; online: boolean; disabled?: boolean }
  // appareil vu : son type (un `kinds`), son nom, et les controles masques sur CET appareil (ex. la
  // position d'un volet qui ne la donne pas)
  | { fact: typeof FACT.device; device: string; kind: string; name?: string; hidden?: readonly string[];
      // valeurs actuelles de ses reglages (par cle de champ), telles que le boitier les publie
      settings?: Readonly<Record<string, SettingValue>>;
      // rang d'affichage parmi les appareils du boitier (1 = premier) : le portail classe les cartes ainsi ;
      // sans rang, a la suite, dans l'ordre des types de la famille (`kinds`), puis par nom
      rank?: number }
  | { fact: typeof FACT.state; device: string; control: string; value: ControlValue }
  | { fact: typeof FACT.box; firmware?: string; latest?: string; health?: BoxHealth; network?: BoxNetwork;
      // version installee encore en essai (pas validee) ; version precedente gardee par le boitier
      trial?: boolean; previous?: string;
      // actions du boitier entier (boxControls) possibles maintenant, par identifiant ; un fait partiel
      // ne touche que celles qu'il nomme
      actions?: Readonly<Record<string, boolean>> }
  | { fact: typeof FACT.event; level: EventLevel; code: string; text: LocalizedText; device?: string }
  // appareil retire du boitier (supprime, ignore) : sa carte disparait
  | { fact: typeof FACT.gone; device: string }
  // reponse du boitier a une demande de fichier (boxFiles, requestFile) : remise a la requete qui
  // l'attend, JAMAIS gardee par le portail ; refusee si elle arrive en message retenu (elle resterait
  // sur le broker)
  | { fact: typeof FACT.file; file: string; content: string };

/** Sante d'un boitier, en lecture : ce qu'il publie de lui-meme (battement, etat systeme). Chaque champ
 *  est facultatif ; un fait n'en porte que ceux qu'il connait, les autres gardent leur valeur. */
export type BoxHealth = { rssiDbm?: number; uptimeS?: number; freeHeap?: number; minFreeHeap?: number; lastReset?: LocalizedText };
/** Reseau d'un boitier, pour information seulement (on ne coupe pas a distance le lien qui le relie) :
 *  le Wi-Fi rejoint, son adresse, le broker local (sans identifiants). */
export type BoxNetwork = { ssid?: string; ip?: string; broker?: string };

/** Action sur le boitier ENTIER (installer une mise a jour, revenir a la version precedente...). Le
 *  portail la montre seulement quand le boitier la dit possible (fait boitier, actions), et demande
 *  confirmation quand `confirm` est donne. */
export type BoxControlDecl = { id: string; label: LocalizedText; confirm?: LocalizedText };

/** Fichier qu'un boitier peut rendre a la demande (ex. sa sauvegarde) : le portail le demande quand
 *  l'utilisateur clique, attend la reponse du boitier et la remet au navigateur, sans en garder de
 *  copie. `type` fixe l'extension et le type du fichier telecharge. */
export const BOX_FILE_TYPE = { json: "json" } as const;
export type BoxFileType = (typeof BOX_FILE_TYPE)[keyof typeof BOX_FILE_TYPE];
export type BoxFileDecl = { id: string; label: LocalizedText; type: BoxFileType };

/** Cible d'une commande : un appareil d'un boitier, ou le boitier entier (mise a jour du firmware). */
export type CommandTarget = { box: string; device?: string };
/** Ce que command() rend : le coeur le publie sous `<racine>/<boitier>/<path>`, apres verification. */
export type FamilyCommand = { path: string; payload: string; retain?: boolean };

/** Une famille, telle que son plugin la declare (api.registerDeviceFamily). */
export type FamilyDecl = {
  id: string;            // = le champ `firmware` des boitiers de la famille, declare a l'enrolement
  label: LocalizedText;
  icon: Icon;
  contract: typeof FAMILY_CONTRACT;
  topicRoot: string;     // racine de ses topics : abonnement `<racine>/+/#`, ACL `<racine>/%u/#`
  kinds: readonly KindDecl[];
  boxControls?: readonly BoxControlDecl[];
  /** Fichiers que ses boitiers rendent a la demande ; requestFile() dit comment les demander. */
  boxFiles?: readonly BoxFileDecl[];
  read(msg: FamilyMessage): readonly Fact[];
  command(target: CommandTarget, control: string, value: ControlValue | null): FamilyCommand | null;
  /** Deplacer un appareil au rang donne (1 = premier) parmi ceux de son boitier, qui decale les autres.
   *  Present = les cartes du boitier se reorganisent en les glissant. */
  reorder?(target: Required<CommandTarget>, rank: number): FamilyCommand | null;
  /** Reglages d'un appareil (deja verifies contre les champs de son type) -> message au boitier. */
  configure?(target: Required<CommandTarget>, values: Readonly<Record<string, SettingValue>>): FamilyCommand | null;
  /** Demande d'un fichier (un `boxFiles`) au boitier -> message ; sa reponse revient par read(), fait `file`. */
  requestFile?(target: { box: string }, file: string): FamilyCommand | null;
};
