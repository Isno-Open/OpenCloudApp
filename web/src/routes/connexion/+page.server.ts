import type { PageServerLoad } from './$types';
import { loginScreen } from '#lib/server/screens.ts';
import { LANG } from '#lib/i18n.ts';

export const load: PageServerLoad = ({ request, url }) => loginScreen(LANG.fr, request, url);
