import type { PageServerLoad } from './$types';
import { devicesScreen } from '#lib/server/screens.ts';
import { LANG } from '#lib/i18n.ts';

export const load: PageServerLoad = ({ request, cookies }) => devicesScreen(LANG.fr, request, cookies);
