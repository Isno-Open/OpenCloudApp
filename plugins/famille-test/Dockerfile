# Famille de test, construite depuis la RACINE du depot pour les tests de bout en bout :
#   docker build -f plugins/famille-test/Dockerfile -t opencloudapp-famille-test:e2e .
# Contrat de l'image : /plugin/index.js et, a cote, les contrats de famille et de plugin (sans dependance).
FROM node:26.13.1-trixie-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY server/package.json ./server/
RUN cd server && npm install --no-audit --no-fund
COPY server/src ./server/src
COPY plugins/famille-test ./plugins/famille-test
RUN cd plugins/famille-test && ../../server/node_modules/.bin/tsc -p tsconfig.json \
  && mkdir -p /out && cp dist/plugins/famille-test/index.js /out/index.js && cp package.json /out/package.json \
  && cp dist/server/src/family-contract.js /out/family-contract.js \
  && cp dist/server/src/plugin-contract.js /out/plugin-contract.js \
  && cp ../../server/node_modules/@isno-open/plugin-host/dist/contract.js /out/contract.js \
  && sed -i 's#"../../server/src/family-contract.js"#"./family-contract.js"#; s#"../../server/src/plugin-contract.js"#"./plugin-contract.js"#' /out/index.js \
  && sed -i 's#"@isno-open/plugin-host/contract"#"./contract.js"#' /out/plugin-contract.js \
  && ! grep -nE "from \"[^.]" /out/index.js /out/family-contract.js /out/plugin-contract.js /out/contract.js

FROM busybox:1.38.0-musl
COPY --from=build /out /plugin
