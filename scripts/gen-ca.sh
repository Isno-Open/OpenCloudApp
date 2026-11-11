#!/usr/bin/env bash
# Génère la CA + le certificat serveur du broker, pour VOTRE domaine (auto-hébergement).
# Les clés restent chez vous (jamais commitées : voir .gitignore).
set -euo pipefail
DOMAIN="${1:-mqtt.example.com}"
DIR="$(cd "$(dirname "$0")/.." && pwd)/certs"; mkdir -p "$DIR"; cd "$DIR"
[ -f ca.crt ] || { openssl genrsa -out ca.key 2048
  openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 -subj "/O=ISNO Cloud/CN=ISNO Cloud CA" -out ca.crt; }
openssl genrsa -out server.key 2048
openssl req -new -key server.key -subj "/O=ISNO Cloud/CN=$DOMAIN" -out server.csr
printf "subjectAltName=DNS:%s\n" "$DOMAIN" > san.cnf
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -sha256 -days 1825 -extfile san.cnf -out server.crt
rm -f server.csr san.cnf
echo "CA + cert serveur générés dans $DIR (CN=$DOMAIN)."
