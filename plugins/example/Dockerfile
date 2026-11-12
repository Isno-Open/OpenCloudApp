# Image du plugin d'exemple, a construire depuis la RACINE du depot (le contrat vient du coeur) :
#   docker build -f plugins/example/Dockerfile -t <registre>/isno-cloud-plugin-example:<version> .
# Contrat de l'image : /plugin/index.js (module ES) et un shell pour la copie. Rien ne s'y execute.
FROM node:26.13.1-trixie-slim AS build
WORKDIR /src
# types du coeur (le contrat est verifie a la compilation), sans compiler les dependances natives
COPY server/package.json ./server/
RUN cd server && npm install --ignore-scripts --no-audit --no-fund
COPY server/src ./server/src
COPY plugins/example ./plugins/example
RUN cd plugins/example && ../../server/node_modules/.bin/tsc -p tsconfig.json \
  && mkdir -p /out && cp dist/plugins/example/index.js /out/index.js && cp package.json /out/package.json \
  && cp dist/server/src/plugin-contract.js /out/plugin-contract.js \
  && sed -i 's#"../../server/src/plugin-contract.js"#"./plugin-contract.js"#' /out/index.js \
  && ! grep -n "server/src" /out/index.js

FROM busybox:1.38.0-musl
COPY --from=build /out /plugin
