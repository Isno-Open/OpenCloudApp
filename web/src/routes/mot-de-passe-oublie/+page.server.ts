import type { PageServerLoad } from './$types';
import { forgotScreen } from '#lib/server/screens.ts';
import { LANG } from '#lib/i18n.ts';

export const load: PageServerLoad = () => forgotScreen(LANG.fr);
