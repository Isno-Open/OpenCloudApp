// Ancienne adresse, fusionnee dans l'accueil « Mes appareils » : on redirige les anciens liens.
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { LANG, ROUTES } from '#lib/i18n.ts';

export const GET: RequestHandler = () => redirect(302, ROUTES.appareils[LANG.fr]);
