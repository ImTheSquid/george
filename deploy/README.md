# Deploying george

Hosts: app `george.jackhogan.me` (127.0.0.1:3031), PDS `pds.george.jackhogan.me` and handles `*.george.jackhogan.me` (127.0.0.1:3030). Host nginx terminates TLS.

## 1. DNS (Cloudflare, proxy OFF for all three)

| Type | Name | Content |
|---|---|---|
| A | `george` | server IP |
| A | `pds.george` | server IP |
| A | `*.george` | server IP |

Proxy must be off: Cloudflare's free edge cert does not cover `*.george.jackhogan.me`.

## 2. Certificate (once; renews via existing certbot timer)

```sh
sudo certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials /home/jack/.secrets/certbot/cloudflare.ini \
  -d george.jackhogan.me -d '*.george.jackhogan.me'
```

## 3. nginx

```sh
sudo cp nginx/connection_upgrade.conf /etc/nginx/conf.d/
sudo cp nginx/george.conf /etc/nginx/sites-available/george
sudo ln -s /etc/nginx/sites-available/george /etc/nginx/sites-enabled/george
sudo nginx -t && sudo systemctl reload nginx
```

## 4. Tranquil PDS

```sh
git clone https://tangled.org/bas.sh/tranquil-pds ~/tranquil-pds   # or the GitHub mirror Bogay/tranquil-pds
docker build -t tranquil-pds:local ~/tranquil-pds

cp tranquil/config.toml.example tranquil/config.toml
openssl rand -base64 48 > tranquil/pg_password        # then paste into config.toml database.url
# fill secrets.jwt_secret / dpop_secret / master_key with `openssl rand -base64 48`
docker compose up -d
docker compose logs tranquil-pds | grep -i invite       # first invite code
```

Then open https://pds.george.jackhogan.me, register with handle + passkey + invite code.
