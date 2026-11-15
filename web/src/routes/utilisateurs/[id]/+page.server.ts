import type { PageServerLoad } from './$types';
import { userDetailScreen } from '#lib/server/screens.ts';
import { LANG } from '#lib/i18n.ts';

export const load: PageServerLoad = ({ request, params }) => userDetailScreen(LANG.fr, request, params.id);
