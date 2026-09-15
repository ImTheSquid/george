# Deploying george

One container (SvelteKit + SQLite) on 127.0.0.1:3031 behind the host nginx at `george.jackhogan.me`.

## 1. DNS

Point the app hostname at the server.

## 2. Certificate (once; renews via the certbot timer)

```sh
sudo certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials /path/to/cloudflare.ini \
  -d george.jackhogan.me
```

## 3. nginx

```sh
sudo cp nginx/george.conf /etc/nginx/sites-available/george
sudo ln -sf /etc/nginx/sites-available/george /etc/nginx/sites-enabled/george
sudo nginx -t && sudo systemctl reload nginx
```

## 4. App

The compose file builds from `../src` (an rsync/checkout of this repo next to `deploy/`).

```sh
rsync -a --exclude node_modules --exclude .svelte-kit --exclude build --exclude .git ./ server:~/george/src/
docker compose build && docker compose up -d
docker compose logs george | grep "invite code"     # first signup needs it
```

Later invite codes come from `/admin/invites` (the first account is admin).
