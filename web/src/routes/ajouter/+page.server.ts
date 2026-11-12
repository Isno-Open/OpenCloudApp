import type { PageServerLoad } from './$types';
import { addScreen } from '#lib/server/screens.ts';
import { LANG } from '#lib/i18n.ts';

export const load: PageServerLoad = ({ request }) => addScreen(LANG.fr, request);
