import type { APIRoute } from 'astro';
import { isConfigured } from '@core/config.js';
import { json } from '../../../server/http.ts';

export const GET: APIRoute = () => json(200, { configured: isConfigured() });
