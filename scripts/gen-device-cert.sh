#!/usr/bin/env bash
# Cert device (CN = device_id = segment d'isolation ACL). En prod c'est le serveur d'enrôlement
# qui le fait au pairing ; ce script est l'équivalent manuel pour un test.
set -euo pipefail
ID="${1:?usage: gen-device-cert.sh <device_id>}"
DIR="$(cd "$(dirname "$0")/.." && pwd)/certs"; cd "$DIR"
openssl genrsa -out "dev-$ID.key" 2048
openssl req -new -key "dev-$ID.key" -subj "/O=ISNO Cloud/CN=$ID" -out "dev-$ID.csr"
openssl x509 -req -in "dev-$ID.csr" -CA ca.crt -CAkey ca.key -CAcreateserial -sha256 -days 1825 -out "dev-$ID.crt"
rm -f "dev-$ID.csr"
echo "Cert device : dev-$ID.crt / dev-$ID.key (CN=$ID)."
