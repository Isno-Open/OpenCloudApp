import type { RequestHandler } from './$types';
import { isConfigured } from '@opencloudapp/core/config.js';
import { json } from '#lib/server/http.ts';

export const GET: RequestHandler = () => json(200, { configured: isConfigured() });
