import type { PageServerLoad } from './$types';
import { boxScreen } from '#lib/server/screens.ts';
import { LANG } from '#lib/i18n.ts';

export const load: PageServerLoad = ({ request, params }) => boxScreen(LANG.fr, request, params.id);
