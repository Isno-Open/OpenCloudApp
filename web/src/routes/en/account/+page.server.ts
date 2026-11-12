import type { PageServerLoad } from './$types';
import { accountScreen } from '#lib/server/screens.ts';
import { LANG } from '#lib/i18n.ts';

export const load: PageServerLoad = ({ request }) => accountScreen(LANG.en, request);
