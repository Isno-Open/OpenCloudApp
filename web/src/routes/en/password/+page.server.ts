import type { PageServerLoad } from './$types';
import { passwordScreen } from '#lib/server/screens.ts';

export const load: PageServerLoad = ({ url }) => passwordScreen(url);
