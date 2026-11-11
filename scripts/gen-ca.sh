#!/usr/bin/env bash
# Bootstrap des certificats du stack : CA + cert serveur du broker + cert du relais.
# Passez le nom DNS public de VOTRE broker. Les clés restent chez vous (jamais commitées).
set -euo pipefail
DOMAIN="${1:-mqtt.example.com}"
DIR="$(cd "$(dirname "$0")/.." && pwd)/certs"; mkdir -p "$DIR"; cd "$DIR"
[ -f ca.crt ] || { openssl genrsa -out ca.key 2048
  openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 -subj "/O=ISNO Cloud/CN=ISNO Cloud CA" -out ca.crt; }
# cert serveur (SAN = domaine public + nom interne compose "broker" + localhost)
openssl genrsa -out server.key 2048
openssl req -new -key server.key -subj "/O=ISNO Cloud/CN=$DOMAIN" -out server.csr
printf "subjectAltName=DNS:%s,DNS:broker,DNS:localhost,IP:127.0.0.1\n" "$DOMAIN" > san.cnf
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -sha256 -days 1825 -extfile san.cnf -out server.crt
# cert relais (CN=relay : accès complet via l'ACL)
openssl genrsa -out relay.key 2048
openssl req -new -key relay.key -subj "/O=ISNO Cloud/CN=relay" -out relay.csr
openssl x509 -req -in relay.csr -CA ca.crt -CAkey ca.key -CAcreateserial -sha256 -days 1825 -out relay.crt
rm -f server.csr relay.csr san.cnf
echo "Certs générés dans $DIR : ca, server (CN=$DOMAIN), relay."
