import type { PageServerLoad } from './$types';
import { usersScreen } from '#lib/server/screens.ts';
import { LANG } from '#lib/i18n.ts';

export const load: PageServerLoad = ({ request }) => usersScreen(LANG.en, request);
