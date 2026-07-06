# last30days first-run wizard

Use this file only when `~/.config/last30days/.env` is missing or does not contain
`SETUP_COMPLETE=true`.

Goal: get the user to a working first research run quickly. Reddit, Hacker News,
Polymarket, and GitHub work without paid keys. Optional setup unlocks browser-cookie
sources and ScrapeCreators-backed TikTok, Instagram, Threads, Pinterest, and Reddit
backup search.

## First message to the user

Ask one short setup question:

> First-time `/last30days` setup: quick setup or skip for now? Quick setup can
> auto-detect browser cookies for X/Twitter and may install `yt-dlp` with Homebrew
> for YouTube. Skip still works with the free built-in sources.
>
> Reply `quick` or `skip`.

Do not run setup before the user chooses. Quick setup may install `yt-dlp` via
Homebrew.

If the user also asks for TikTok, Instagram, Threads, Pinterest, or stronger Reddit
backup coverage, ask one follow-up after quick/skip:

> Want to connect ScrapeCreators too? It has 100 free credits, then PAYG. Reply
> `connect` or `not now`.

Only run the ScrapeCreators flow when the user explicitly replies `connect`.

## If the user chooses `skip`

Run this Bash command, then continue to the requested research topic:

```bash
mkdir -p "$HOME/.config/last30days"
ENV_FILE="$HOME/.config/last30days/.env"
touch "$ENV_FILE"
grep -q '^SETUP_COMPLETE=' "$ENV_FILE" || printf 'SETUP_COMPLETE=true\n' >> "$ENV_FILE"
grep -q '^FROM_BROWSER=' "$ENV_FILE" || printf 'FROM_BROWSER=off\n' >> "$ENV_FILE"
echo "last30days setup marked complete. Free sources are ready."
```

Then tell the user:

> Setup skipped. Free sources are ready. Browser cookie extraction is off. You can
> add keys later in `~/.config/last30days/.env` or run
> `skills/last30days/scripts/setup-keychain.sh` on macOS.

## If the user chooses `quick`

Set `SKILL_DIR` to the absolute path of `skills/last30days`, then run:

```bash
SKILL_DIR="<absolute path to skills/last30days>"
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH="$SKILL_DIR/scripts" \
  python3 "$SKILL_DIR/scripts/last30days.py" setup
```

Then continue to the requested research topic. If no topic was provided, ask:

> What should I research from the last 30 days?

## If the user chooses `connect` for ScrapeCreators

Run this Bash command. It may open a browser for GitHub device auth. It writes the
returned ScrapeCreators key to `~/.config/last30days/.env` without printing it.

```bash
SKILL_DIR="<absolute path to skills/last30days>"
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH="$SKILL_DIR/scripts" python3 - <<'PY'
from pathlib import Path
from lib.setup_wizard import run_github_auth, write_setup_config

config_path = Path.home() / ".config" / "last30days" / ".env"
result = run_github_auth()
status = result.get("status")
if status != "success" or not result.get("api_key"):
    raise SystemExit(f"ScrapeCreators setup did not complete: {result}")

config_path.parent.mkdir(parents=True, exist_ok=True)
existing = config_path.read_text(encoding="utf-8") if config_path.exists() else ""
if existing and not existing.endswith("\n"):
    existing += "\n"
if "SCRAPECREATORS_API_KEY=" not in existing:
    existing += f"SCRAPECREATORS_API_KEY={result['api_key']}\n"
config_path.write_text(existing, encoding="utf-8")
write_setup_config(config_path)
print(f"ScrapeCreators connected via {result.get('method', 'github')}.")
PY
```

Then tell the user:

> ScrapeCreators is connected. TikTok, Instagram, Threads, Pinterest, and Reddit
> backup search can be used when relevant.

## OpenClaw or server-side platforms

If browser cookie extraction is unavailable, skip cookie setup. To inspect available
server-side tools and keys without exposing secrets, run:

```bash
SKILL_DIR="<absolute path to skills/last30days>"
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH="$SKILL_DIR/scripts" \
  python3 "$SKILL_DIR/scripts/last30days.py" setup --openclaw
```

Use the JSON booleans to explain which optional sources are available. Then mark setup
complete with `FROM_BROWSER=off` using the `skip` command above.

## Optional keys later

Tell the user only if they ask about unlocking more sources:

- Config file: `~/.config/last30days/.env`
- macOS Keychain helper: `skills/last30days/scripts/setup-keychain.sh`
- Common optional env vars: `SCRAPECREATORS_API_KEY`, `OPENROUTER_API_KEY`,
  `BRAVE_API_KEY`, `AUTH_TOKEN`, `CT0`, `BSKY_HANDLE`, `BSKY_APP_PASSWORD`
- Output directory: `LAST30DAYS_MEMORY_DIR`, defaulting to `~/Documents/Last30Days/`
