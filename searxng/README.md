# Local SearXNG for Pi

Private localhost SearXNG instance for Pi's `web_search` extension.

```text
Pi web_search tool → http://127.0.0.1:8080/search?format=json → SearXNG container
```

This setup assumes macOS + OrbStack. OrbStack provides the Docker-compatible daemon;
SearXNG runs as a normal Compose service and only binds to localhost.

## First-time setup

```bash
brew install --cask orbstack
open -a OrbStack

mkdir -p ~/.config
ln -s ~/dotfiles/searxng ~/.config/searxng

cd ~/.config/searxng
./init.sh
docker compose up -d
```

`./init.sh` creates `.env` with a generated `SEARXNG_SECRET`. The file is ignored by
Git and should stay local to the machine.

## Daily use

OrbStack starts the Docker daemon. The container has `restart: unless-stopped`, so it
comes back automatically after OrbStack starts.

```bash
cd ~/.config/searxng

docker compose up -d      # start / ensure running
docker compose ps         # check status
docker compose down       # stop when you do not want local search running
```

Open the browser UI:

```bash
open http://127.0.0.1:8080
```

## Verify

```bash
curl -s -H 'X-Forwarded-For: 127.0.0.1' \
  'http://127.0.0.1:8080/search?q=searxng&format=json' \
  | jq '.results[0:3] | map({title, url, engines})'
```

In Pi, reload extensions and ask for a web lookup:

```text
/reload
search the web for the current SearXNG Docker docs
```

The Pi extension defaults to `http://127.0.0.1:8080`. If you change the port, start
Pi with:

```bash
SEARXNG_URL=http://127.0.0.1:8888 pi
```

## Management

```bash
cd ~/.config/searxng

docker compose ps                  # status
docker compose logs -f searxng     # follow logs
docker compose logs --tail=80 searxng
docker compose pull                # update image
docker compose up -d               # recreate after update
docker compose down                # stop service
```

## Pi integration

Pi auto-loads `~/dotfiles/pi/extensions/searxng-search.ts` through the symlinked
`~/.pi/agent/extensions` directory. After editing the extension, run this inside Pi:

```text
/reload
```

The tool is named `web_search`. It caps results and output size so raw SearXNG JSON
does not flood the model context.

## Files

- `compose.yaml` — one local SearXNG container, `restart: unless-stopped`
- `.env.example` — tracked example values
- `.env` — local secret, port, and container settings; ignored
- `core-config/settings.yml` — enables JSON output and removes noisy optional engines
- `core-config/limiter.toml` — local bot-detection config for direct localhost use

## Notes

- Keep `SEARXNG_HOST=127.0.0.1` unless you intentionally want LAN access.
- JSON output must stay enabled in `search.formats`; Pi's tool depends on it.
- The tracked settings remove `ahmia`, `torch`, and `radio browser` to avoid local startup noise.
- `limiter.toml` keeps direct localhost requests from being treated like proxied traffic.
- For raw `curl` tests, send `X-Forwarded-For: 127.0.0.1` to avoid bot-detection log noise.
- Bind-mounted config may still log an ownership warning on macOS/OrbStack.
  It is harmless for this localhost setup.
- This is intentionally not MCP. Pi calls SearXNG directly through a small local tool.
