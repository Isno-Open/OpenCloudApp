// src/server/http.ts
async function readBody(request) {
	if ((request.headers.get("content-type") ?? "").includes("application/json")) try {
		return await request.json();
	} catch {
		return {};
	}
	const f = await request.formData().catch(() => null);
	if (!f) return {};
	const o = {};
	for (const [k, v] of f.entries()) o[k] = typeof v === "string" ? v : "";
	return o;
}
var json = (status, body) => new Response(JSON.stringify(body), {
	status,
	headers: { "content-type": "application/json" }
});
export { readBody as n, json as t };
