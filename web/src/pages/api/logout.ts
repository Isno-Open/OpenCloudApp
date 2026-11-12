import type { APIRoute } from 'astro';
export const POST: APIRoute = async () =>
  new Response(JSON.stringify({ ok: true }), { status: 200, headers: {
    'content-type': 'application/json',
    'Set-Cookie': 'sid=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax',
  } });
