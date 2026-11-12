import type { PageServerLoad } from './$types';
import { linkScreen } from '#lib/server/screens.ts';
import { LANG } from '#lib/i18n.ts';

export const load: PageServerLoad = ({ request, cookies, url }) => linkScreen(LANG.fr, request, url, cookies);
