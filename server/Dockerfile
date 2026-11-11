FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install
COPY src ./src
RUN npm run build
EXPOSE 8080
CMD ["node", "dist/server.js"]
