// Types des donnees de chaque ecran : ce que rendent les fonctions de lib/server/screens.ts, plus ce
// que le gabarit racine ajoute (langue, gabarit). Import de TYPE seulement : rien du serveur ne part
// dans le navigateur.
import type * as S from '#lib/server/screens.ts';
import type { Lang } from './i18n.ts';
import type { Shell } from './shell.ts';

type Base = { lang: Lang; shell: Shell };
type Of<F extends (...a: never[]) => unknown> = Base & Awaited<ReturnType<F>>;
export type DevicesData = Of<typeof S.devicesScreen>;
export type AddData = Of<typeof S.addScreen>;
export type AccountData = Of<typeof S.accountScreen>;
export type LoginData = Of<typeof S.loginScreen>;
export type UsersData = Of<typeof S.usersScreen>;
export type SettingsData = Of<typeof S.settingsScreen>;
export type PluginsData = Of<typeof S.pluginsScreen>;
export type PluginSettingsData = Of<typeof S.pluginSettingsScreen>;
export type LinkData = Of<typeof S.linkScreen>;
export type PasswordData = Of<typeof S.passwordScreen>;
export type BoxData = Of<typeof S.boxScreen>;
export type SetupData = Of<typeof S.setupScreen>;
