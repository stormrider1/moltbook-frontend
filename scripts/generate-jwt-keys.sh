#!/usr/bin/env bash
# Generates RSA 2048-bit key pair and outputs base64-encoded env vars.
# Paste the output into .env.local — private key never touches disk beyond /tmp.
set -euo pipefail

openssl genrsa -out /tmp/jwt_private.pem 2048
openssl rsa -in /tmp/jwt_private.pem -pubout -out /tmp/jwt_public.pem

echo "JWT_PRIVATE_KEY=$(base64 < /tmp/jwt_private.pem)"
echo "JWT_PUBLIC_KEY=$(base64 < /tmp/jwt_public.pem)"

rm /tmp/jwt_private.pem /tmp/jwt_public.pem
