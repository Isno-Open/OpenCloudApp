import type { PageServerLoad } from './$types';
import { pluginSettingsScreen } from '#lib/server/screens.ts';
import { LANG } from '#lib/i18n.ts';

export const load: PageServerLoad = ({ request, params }) => pluginSettingsScreen(LANG.en, request, params.id);
