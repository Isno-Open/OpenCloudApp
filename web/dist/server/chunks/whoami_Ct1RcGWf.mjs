import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { n as INSTANCE_NONCE } from "./hosts__VU0BI7P.mjs";
import { t as json } from "./http_GIg9YBvo.mjs";
// src/pages/api/setup/whoami.ts
var whoami_exports = /* @__PURE__ */ __exportAll({ GET: () => GET });
var GET = () => json(200, { nonce: INSTANCE_NONCE });
// \0virtual:astro:page:src/pages/api/setup/whoami@_@ts
var page = () => whoami_exports;
export { page };
