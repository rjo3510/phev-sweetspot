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
   - Block Common Exploits: on · Websockets: off · Cache Assets: off
   - Forward target — pick **one**:
     - **By container name** (shared network): Hostname `phev-sweetspot`, Port `8000`.
     - **By published host port**: Hostname = the Docker host IP, Port `8082` (`APP_PORT`).
   - **SSL tab:** request a Let's Encrypt cert, Force SSL + HTTP/2.

The app is published on the host as **`http://<host>:8082`** (set `APP_PORT` in `.env`) and is
also reachable by name on the proxy network. Because HTTPS terminates at NPM and `.env` has
`COOKIE_SECURE=1`, the login cookie is served `Secure` — always use `https://phev.xolution.ch`.

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
- **Change the host port:** set `APP_PORT` in `.env` (default `8082`).
- To restrict the published port to localhost only, use `APP_PORT=127.0.0.1:8082` style by
  editing the `ports:` mapping to `"127.0.0.1:8082:8000"`.
