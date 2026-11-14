# Image unique de l'app cloud : le coeur backend (TS -> server/dist, paquet @opencloudapp/core) + l'app
# SvelteKit rendue par le serveur (web/), qui en depend. Un seul process : pages + API + relais MQTT. Sert sur :8080 (derriere Caddy).
FROM node:26.13.1-trixie-slim
# git : le moteur de plugins partage (@isno-open/plugin-host) s'installe depuis GitHub, version figee.
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates openssl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# 1) Coeur backend : compilation tsc -> server/dist (consomme par l'app via l'alias @core).
COPY server/package.json server/tsconfig.json ./server/
# sans --ignore-scripts : npm doit construire le moteur de plugins (script prepare d'une dependance git)
RUN cd server && npm install --no-audit --no-fund
COPY server/src ./server/src
RUN cd server && npm run build

# 2) App SvelteKit (depend du coeur par file:../server ; better-sqlite3 compile en natif ici pour le runtime).
COPY web/package.json ./web/
RUN cd web && npm install --no-audit --no-fund
COPY web/ ./web/
RUN cd web && npm run build

# Modeles de configuration du broker (un seul exemplaire, config/ du depot), copies a l'installation.
COPY config /app/broker-config-template

ENV HOST=0.0.0.0 PORT=8080
EXPOSE 8080
WORKDIR /app/web
CMD ["node", "build/index.js"]
