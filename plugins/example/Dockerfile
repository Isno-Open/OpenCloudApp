# Image du plugin d'exemple, a construire depuis la RACINE du depot (le contrat vient du coeur) :
#   docker build -f plugins/example/Dockerfile -t <registre>/isno-cloud-plugin-example:<version> .
# Contrat de l'image : /plugin/index.js (module ES) et un shell pour la copie. Rien ne s'y execute.
FROM node:26.13.1-trixie-slim AS build
# git : le moteur de plugins partage s'installe depuis GitHub ; outils de compilation : l'installation
# construit le moteur (script prepare d'une dependance git) et les dependances natives du coeur.
# Ils ne servent qu'a cette etape : l'image du plugin (busybox, plus bas) n'en contient rien.
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /src
# types du coeur (le contrat est verifie a la compilation) et moteur de plugins construit
COPY server/package.json ./server/
RUN cd server && npm install --no-audit --no-fund \
  && test -f node_modules/@isno-open/plugin-host/dist/contract.js
COPY server/src ./server/src
COPY plugins/example ./plugins/example
RUN cd plugins/example && ../../server/node_modules/.bin/tsc -p tsconfig.json \
  && mkdir -p /out && cp dist/plugins/example/index.js /out/index.js && cp package.json /out/package.json \
  && cp dist/server/src/plugin-contract.js /out/plugin-contract.js \
  && cp ../../server/node_modules/@isno-open/plugin-host/dist/contract.js /out/contract.js \
  && sed -i 's#"../../server/src/plugin-contract.js"#"./plugin-contract.js"#' /out/index.js \
  && sed -i 's#"@isno-open/plugin-host/contract"#"./contract.js"#' /out/plugin-contract.js \
  && ! grep -n "server/src" /out/index.js \
  && ! grep -nE "from \"[^.]" /out/index.js /out/plugin-contract.js /out/contract.js

FROM busybox:1.38.0-musl
COPY --from=build /out /plugin
