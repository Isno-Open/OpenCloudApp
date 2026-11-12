import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { a as isConfigured } from "./config_2VUiG471.mjs";
import { t as json } from "./http_GIg9YBvo.mjs";
// src/pages/api/setup/status.ts
var status_exports = /* @__PURE__ */ __exportAll({ GET: () => GET });
var GET = () => json(200, { configured: isConfigured() });
// \0virtual:astro:page:src/pages/api/setup/status@_@ts
var page = () => status_exports;
export { page };
