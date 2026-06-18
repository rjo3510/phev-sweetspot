# Deploy — PHEV Sweetspot Calculator (GHCR image + Nginx Proxy Manager)

Target domain: **phev.example.com**

The image is **built by GitHub Actions** and pushed to GHCR
(`ghcr.io/rjo3510/phev-sweetspot`). The server **pulls** that image — it never builds and
never receives the source. The SQLite DB lives in `./data` next to the compose file; NPM forwards to the
container over a shared Docker network.

```
dev VM ──git push──▶ GitHub ──Actions build──▶ GHCR (private image)
                                                   │
                          ./ship.sh (from a        │  docker compose pull
                          machine that can SSH) ───▶ server ──────────────▶ restart
```

## One-time server setup

1. **Log in to GHCR** (the image is private — needs a token with `read:packages`):

   ```bash
   # Create a GitHub Personal Access Token (classic) with scope: read:packages
   echo <TOKEN> | docker login ghcr.io -u rjo3510 --password-stdin
   ```

2. **Place the deploy files and fill in `.env`:**

   ```bash
   mkdir -p ~/phev-sweetspot
   # copy docker-compose.yml and .env.example into ~/phev-sweetspot
   cd ~/phev-sweetspot
   cp .env.example .env
   ```

   Generate the secrets locally in the project venv (your password is never transmitted):

   ```bash
   python -m app.auth          # prints OWNER_PASSWORD_HASH and SWEETSPOT_SECRET
   ```

   Edit `.env`: paste `OWNER_PASSWORD_HASH` + `SWEETSPOT_SECRET`, set `PROXY_NETWORK`
   (find it with `docker network ls`, e.g. `npm_default`). `COOKIE_SECURE=1` stays on
   behind HTTPS.

3. **Create the data directory** (the SQLite DB is bind-mounted from `./data`):

   ```bash
   mkdir -p data
   # If the container can't write (permission denied), match the in-image user:
   #   sudo chown -R 1000:1000 data
   ```

4. **Start it:**

   ```bash
   docker compose pull && docker compose up -d
   docker compose logs -f      # you should NOT see the default-password warning
   ```

## Day-to-day: deploy a new version

1. **Push to `main`** on the dev VM — GitHub Actions builds and pushes the image to GHCR.
2. **Deploy** from any machine that can SSH to the server (the dev VM cannot reach it):

   ```bash
   PHEV_SERVER=user@phev-host ./ship.sh
   ```

   That runs `docker compose pull && docker compose up -d` on the server and prunes the old
   image. Or do it by hand on the server:

   ```bash
   cd ~/phev-sweetspot && docker compose pull && docker compose up -d
   ```

The DB survives in `./data` across every update.

### Roll back

Each build is also tagged with its commit SHA. To pin a previous version, set `IMAGE_TAG`
in `.env` (e.g. `IMAGE_TAG=sha-<commit>`) and run `docker compose up -d` — find available
tags under the repo's **Packages** on GitHub.

## DNS + Nginx Proxy Manager

1. **DNS:** create an `A` record `phev.example.com` → your server's public IP.
2. **NPM → Proxy Hosts → Add Proxy Host:**
   - Domain Names: `phev.example.com`
   - Scheme: `http`
   - Block Common Exploits: on · Websockets: off · Cache Assets: off
   - Forward target — pick **one**:
     - **By container name** (shared network): Hostname `phev-sweetspot`, Port `8000`.
     - **By published host port**: Hostname = the Docker host IP, Port `8082` (`APP_PORT`).
   - **SSL tab:** request a Let's Encrypt cert, Force SSL + HTTP/2.

The app is published on the host as **`http://<host>:8082`** (set `APP_PORT` in `.env`) and is
also reachable by name on the proxy network. Because HTTPS terminates at NPM and `.env` has
`COOKIE_SECURE=1`, the login cookie is served `Secure` — always use `https://phev.example.com`.

## Back up the database

```bash
cp data/sweetspot.db data/sweetspot-backup.db    # it's just a file in ./data now
```

## Notes

- **One worker on purpose** (login rate-limit state is in-process, single SQLite writer).
- Want NPM's own per-IP rate limiting / Cloudflare in front? Both stack cleanly on top.
- **Change the host port:** set `APP_PORT` in `.env` (default `8082`).
- To restrict the published port to localhost only, edit the `ports:` mapping to
  `"127.0.0.1:8082:8000"`.
- **Offline / air-gapped server?** If the server can't reach GHCR, `./bundle.sh` still
  produces a source tarball you can carry over and build on the host (`docker compose build`).
