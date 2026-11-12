import type { PageServerLoad } from './$types';
import { pluginsScreen } from '#lib/server/screens.ts';
import { LANG } from '#lib/i18n.ts';

export const load: PageServerLoad = ({ request }) => pluginsScreen(LANG.fr, request);
