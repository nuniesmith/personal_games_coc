# Dev HTTPS with self-signed cert

This repo includes an Nginx reverse proxy configured for dev on <https://feastorfamine.test> using a self-signed certificate.

## Generate self-signed cert

```bash
./scripts/generate-dev-cert.sh
```

This creates:

- ssl/server.crt
- ssl/server.key
- ssl/dhparam.pem

## Hosts entry

Map the dev domain to localhost:

```bash
# /etc/hosts
127.0.0.1 feastorfamine.test
```

## Run stack

```bash
# from repo root
export DOMAIN_NAME=feastorfamine.test
docker compose up -d --build nginx coc-api coc-web
```

Then open: <https://feastorfamine.test>

Your browser will warn about the self-signed cert; accept it for dev.

## Production

- Set DNS A/AAAA records for feastorfamine.xyz.
- Swap Nginx config to `config/nginx.prod.conf` and mount Let’s Encrypt certs at `/etc/letsencrypt/`.
- Use certbot or your preferred ACME client to provision real certificates.
