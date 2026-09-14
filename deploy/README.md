# Deploying george

Hosts: app `george.jackhogan.me` (127.0.0.1:3031); PDS `pds.jackhogan.me` and handles `*.george.jackhogan.me` (127.0.0.1:3030). The PDS is a general atproto host, not tied to george — hence its own name. Host nginx terminates TLS.

## 1. DNS (Cloudflare, proxy OFF for all)

| Type | Name | Content |
|---|---|---|
| CNAME | `george` | `home.jackhogan.me` |
| CNAME | `*.george` | `home.jackhogan.me` |
| CNAME | `pds` | `home.jackhogan.me` |

Proxy must be off: Cloudflare's free edge cert does not cover `*.george.jackhogan.me`, and proxying the PDS would cap blob uploads and websocket lifetimes.

## 2. Certificate (once; renews via existing certbot timer)

```sh
sudo certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials /home/jack/.secrets/certbot/cloudflare.ini \
  --cert-name george.jackhogan.me \
  -d george.jackhogan.me -d '*.george.jackhogan.me' -d pds.jackhogan.me
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

Then open https://pds.jackhogan.me/app/register and register with handle + passkey + invite code.
Admin panel (invite codes): https://pds.jackhogan.me/app/admin
