import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { a as isConfigured } from "./config_2VUiG471.mjs";
import { s as suggestBrokerHost, t as BROKER_PUBLIC_PORT } from "./hosts__VU0BI7P.mjs";
import { t as json } from "./http_GIg9YBvo.mjs";
// src/pages/api/setup/defaults.ts
var defaults_exports = /* @__PURE__ */ __exportAll({ GET: () => GET });
var GET = ({ request }) => {
	if (isConfigured()) return json(409, { error: "instance déjà configurée" });
	const appHost = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(",")[0].trim();
	return json(200, {
		appHost,
		brokerHost: suggestBrokerHost(appHost),
		brokerPort: BROKER_PUBLIC_PORT
	});
};
// \0virtual:astro:page:src/pages/api/setup/defaults@_@ts
var page = () => defaults_exports;
export { page };
