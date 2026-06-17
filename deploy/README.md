# Deploy — PHEV Sweetspot Calculator (Docker + Nginx Proxy Manager)

Target domain: **phev.xolution.ch**

The app runs in one container, stores its SQLite DB in a named volume, and is reachable by
Nginx Proxy Manager (NPM) over a shared Docker network. Nothing is published to the host.

## 1. Set your edit password (locally, in the project venv)

```bash
python -m app.auth
```

It prints an `OWNER_PASSWORD_HASH` and a `SWEETSPOT_SECRET`. Keep them — your password
itself is never stored or transmitted.

## 2. Bundle and move to the server

```bash
deploy/bundle.sh                       # creates phev-sweetspot-deploy.tar.gz
scp phev-sweetspot-deploy.tar.gz user@server:~
```

On the server:

```bash
mkdir phev-sweetspot && tar xzf phev-sweetspot-deploy.tar.gz -C phev-sweetspot
cd phev-sweetspot/deploy
cp .env.example .env
# edit .env: paste OWNER_PASSWORD_HASH + SWEETSPOT_SECRET, set PROXY_NETWORK
```

Find NPM's network name and put it in `.env` as `PROXY_NETWORK`:

```bash
docker network ls          # e.g. npm_default
```

## 3. Start

```bash
docker compose up -d --build
```

Check it:  `docker compose logs -f`  (you should NOT see the default-password warning).

## 4. DNS + Nginx Proxy Manager

1. **DNS:** create an `A` record `phev.xolution.ch` → your server's public IP.
2. **NPM → Proxy Hosts → Add Proxy Host:**
   - Domain Names: `phev.xolution.ch`
   - Scheme: `http`
   - Forward Hostname: `phev-sweetspot`   (the container name)
   - Forward Port: `8000`
   - Block Common Exploits: on · Websockets: optional
   - **SSL tab:** request a Let's Encrypt cert, Force SSL + HTTP/2.

Because the cert/HTTPS terminates at NPM and `.env` has `COOKIE_SECURE=1`, the login
cookie is served `Secure`. (NPM and this container must share the network from step 2.)

## Updating

```bash
# replace the files (new tarball) on the server, then:
cd phev-sweetspot/deploy
docker compose up -d --build
```

The DB survives in the `phev-data` volume. To back it up:

```bash
docker run --rm -v phev-data:/data -v "$PWD":/backup alpine \
  sh -c 'cp /data/sweetspot.db /backup/sweetspot-backup.db'
```

## Notes

- **One worker on purpose** (login rate-limit state is in-process, single SQLite writer).
- Want NPM's own per-IP rate limiting / Cloudflare in front? Both stack cleanly on top.
- Alternative to the shared network: publish a port instead — replace `expose` with
  `ports: ["127.0.0.1:8001:8000"]` and point NPM at `host-ip:8001`.
