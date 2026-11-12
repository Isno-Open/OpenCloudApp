import type { PageServerLoad } from './$types';
import { settingsScreen } from '#lib/server/screens.ts';
import { LANG } from '#lib/i18n.ts';

export const load: PageServerLoad = ({ request }) => settingsScreen(LANG.en, request);
