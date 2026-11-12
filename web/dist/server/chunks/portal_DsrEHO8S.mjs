import { o as loadConfig } from "./config_2VUiG471.mjs";
var portalName = () => loadConfig()?.appName?.trim() || "ISNO Cloud";
/** Le nom a-t-il ete personnalise ? (sinon la barre garde la marque d'origine) */
var portalNameIsCustom = () => !!loadConfig()?.appName?.trim();
export { portalNameIsCustom as n, portalName as t };
