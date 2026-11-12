import type { PageServerLoad } from './$types';
import { setupScreen } from '#lib/server/screens.ts';

export const load: PageServerLoad = () => setupScreen();
