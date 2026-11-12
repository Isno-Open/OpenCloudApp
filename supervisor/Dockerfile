# Superviseur isno-cloud : installe a la demande les modules du catalogue (modules.json).
# Tourne en utilisateur non root ; ne voit Docker qu'a travers le filtre socket-proxy.
FROM node:26.13.1-trixie-slim
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install --no-audit --no-fund
COPY src ./src
COPY modules.json plugins.json ./
RUN npm run build && npm prune --omit=dev \
  && mkdir -p /control && chown node:node /control   # le volume de controle herite de ce proprietaire
USER node
EXPOSE 8090
CMD ["node", "dist/main.js"]
