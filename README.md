# DiscoPanel Discord Bot

A self-hosted Discord bot for managing and monitoring your [DiscoPanel](https://discopanel.app) Minecraft servers directly from Discord.

## Features

- 📊 **Live Status Embeds** — Auto-updating server status in a channel of your choice (online/offline, players, CPU, RAM, TPS, storage, uptime)
- 🎮 **Server Control** — Start, stop, and restart servers with slash commands
- ⚡ **Quick Actions** — Optional buttons on status embeds for instant server control
- 📌 **Pin Servers** — Choose which servers to monitor per Discord guild
- ⚙️ **Configurable Fields** — Toggle which info appears in status embeds
- 🔒 **Admin Only** — All commands restricted to admins or a configurable role
- 🏠 **Flexible Deployment** — Single-guild mode (simple) or multi-guild mode (one bot for multiple Discord servers)

## Prerequisites

- A running [DiscoPanel](https://github.com/nickheyer/discopanel) instance
- A Discord bot token ([create one here](https://discord.com/developers/applications))
- Docker (recommended) or Node.js 20+

## Deployment Modes

The bot supports two deployment modes:

| Mode | Use Case | Panel Setup |
|---|---|---|
| **Single-Guild** (default) | One Discord server, one DiscoPanel | Configure panel in environment variables |
| **Multi-Guild** | Multiple Discord servers, each with their own DiscoPanel | Users run `/setup` to connect their panel |

## Quick Start with Docker

### 1. Create a Discord Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**, give it a name
3. Go to **Bot** → click **Reset Token** → copy the token
4. Go to **OAuth2** → **URL Generator** → select scopes: `bot`, `applications.commands`
5. Select permissions: `Send Messages`, `Embed Links`, `Read Message History`, `Use Slash Commands`
6. Open the generated URL to invite the bot to your server

### 2. Run with Docker Compose (Recommended)

#### Single-Guild Mode (Simple)

Best for personal use — panel credentials are configured via environment variables.

```yaml
services:
  discopanel-bot:
    image: ghcr.io/muckmuck96/discopanel-bot:latest
    container_name: discopanel-bot
    restart: unless-stopped
    environment:
      - DISCORD_TOKEN=your_discord_bot_token
      - DISCORD_CLIENT_ID=your_application_client_id
      - PANEL_URL=http://your-panel:8080
      - PANEL_USERNAME=your_panel_username
      - PANEL_PASSWORD=your_panel_password
      # Optional:
      # - STATUS_INTERVAL=30
      # - LOG_LEVEL=info
    volumes:
      - discopanel-bot-data:/app/data

volumes:
  discopanel-bot-data:
```

#### Multi-Guild Mode

Best for public bots — each Discord server connects to their own panel via `/setup`.

First, generate an encryption key:

```bash
openssl rand -hex 32
```

```yaml
services:
  discopanel-bot:
    image: ghcr.io/muckmuck96/discopanel-bot:latest
    container_name: discopanel-bot
    restart: unless-stopped
    environment:
      - DISCORD_TOKEN=your_discord_bot_token
      - DISCORD_CLIENT_ID=your_application_client_id
      - MULTI_GUILD=true
      - ENCRYPTION_KEY=your_64_char_hex_key
      # Optional:
      # - STATUS_INTERVAL=30
      # - LOG_LEVEL=info
    volumes:
      - discopanel-bot-data:/app/data

volumes:
  discopanel-bot-data:
```

```bash
docker compose up -d
```

### 3. Or Run with Docker Run

#### Single-Guild Mode

```bash
docker run -d \
  --name discopanel-bot \
  --restart unless-stopped \
  -e DISCORD_TOKEN=your_discord_bot_token \
  -e DISCORD_CLIENT_ID=your_application_client_id \
  -e PANEL_URL=http://your-panel:8080 \
  -e PANEL_USERNAME=your_panel_username \
  -e PANEL_PASSWORD=your_panel_password \
  -v discopanel-bot-data:/app/data \
  ghcr.io/muckmuck96/discopanel-bot:latest
```

#### Multi-Guild Mode

```bash
docker run -d \
  --name discopanel-bot \
  --restart unless-stopped \
  -e DISCORD_TOKEN=your_discord_bot_token \
  -e DISCORD_CLIENT_ID=your_application_client_id \
  -e MULTI_GUILD=true \
  -e ENCRYPTION_KEY=your_64_char_hex_key \
  -v discopanel-bot-data:/app/data \
  ghcr.io/muckmuck96/discopanel-bot:latest
```

### 4. Build from Source (Optional)

```bash
git clone https://github.com/muckmuck96/discopanel-bot.git
cd discopanel-bot
docker build -t discopanel-bot .
docker run -d \
  --name discopanel-bot \
  --restart unless-stopped \
  -e DISCORD_TOKEN=your_discord_bot_token \
  -e DISCORD_CLIENT_ID=your_application_client_id \
  -e PANEL_URL=http://your-panel:8080 \
  -e PANEL_USERNAME=your_panel_username \
  -e PANEL_PASSWORD=your_panel_password \
  -v discopanel-bot-data:/app/data \
  discopanel-bot
```

## Bot Setup (in Discord)

Once the bot is running and invited to your server:

### Single-Guild Mode

1. **`/pin`** — Select which servers to monitor (panel connection is automatic)
2. **`/status-channel`** — Pick a channel for live status embeds
3. Done! The bot will start posting and updating server status automatically.

### Multi-Guild Mode

1. **`/setup`** — Connect to your DiscoPanel instance (enter URL + credentials via a secure popup)
2. **`/pin`** — Select which servers to monitor
3. **`/status-channel`** — Pick a channel for live status embeds
4. Done! The bot will start posting and updating server status automatically.

## Commands

| Command | Description | Permission |
|---|---|---|
| `/setup` | Connect to a DiscoPanel instance (multi-guild mode only) | Admin |
| `/pin` | Pin/unpin servers to monitor | Admin |
| `/status-channel` | Set the status embed channel | Admin |
| `/server start <server>` | Start a server | Admin |
| `/server stop <server>` | Stop a server | Admin |
| `/server restart <server>` | Restart a server | Admin |
| `/server list` | List all pinned servers | Admin |
| `/server info <server>` | Detailed server info | Admin |
| `/settings admin-role <role>` | Set which role can use commands | Manage Guild |
| `/settings status-config` | Toggle status embed fields | Admin |
| `/settings quick-actions <on/off>` | Enable/disable quick action buttons | Admin |
| `/settings disconnect` | Remove panel connection | Manage Guild |

## Status Embed Fields

The status embed can display the following information (configurable via `/settings status-config`):

| Field | Description |
|---|---|
| Online Status | Server state with colored indicator |
| Player Count | Current/max players online |
| Version | Minecraft version and mod loader |
| CPU Usage | Current CPU percentage |
| RAM Usage | Memory consumption |
| Uptime | Time since last server start |
| TPS | Server ticks per second (20 = optimal) |
| Storage | Disk usage |

## Quick Actions

Enable quick action buttons on status embeds with `/settings quick-actions enabled:true`.

The buttons shown depend on the current server state:
- **Server Stopped** → Start button
- **Server Running** → Stop and Restart buttons
- **Starting/Stopping** → No buttons (prevents spam)

Buttons are disabled immediately when clicked to prevent duplicate requests.

## Environment Variables

### Required (Always)

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Discord bot token |
| `DISCORD_CLIENT_ID` | Discord application client ID |

### Single-Guild Mode (default)

| Variable | Required | Description |
|---|---|---|
| `PANEL_URL` | ✅ | DiscoPanel URL (e.g., `http://localhost:8080`) |
| `PANEL_USERNAME` | ✅ | DiscoPanel username |
| `PANEL_PASSWORD` | ✅ | DiscoPanel password |

### Multi-Guild Mode

| Variable | Required | Description |
|---|---|---|
| `MULTI_GUILD` | ✅ | Set to `true` to enable multi-guild mode |
| `ENCRYPTION_KEY` | ✅ | 32-byte hex string for encrypting stored tokens |

### Optional

| Variable | Default | Description |
|---|---|---|
| `STATUS_INTERVAL` | `30` | Status embed update interval in seconds |
| `LOG_LEVEL` | `info` | Log level: `debug`, `info`, `warn`, `error` |

## Data Storage

The bot stores its SQLite database in `/app/data` inside the container. Use a named volume to persist data across container restarts:

```bash
-v discopanel-bot-data:/app/data
```

## Running without Docker

```bash
git clone https://github.com/muckmuck96/discopanel-bot.git
cd discopanel-bot
npm install
npm run build

# Set environment variables (or create a .env file)
# Single-Guild Mode:
export DISCORD_TOKEN=...
export DISCORD_CLIENT_ID=...
export PANEL_URL=http://your-panel:8080
export PANEL_USERNAME=...
export PANEL_PASSWORD=...

# Or Multi-Guild Mode:
# export DISCORD_TOKEN=...
# export DISCORD_CLIENT_ID=...
# export MULTI_GUILD=true
# export ENCRYPTION_KEY=...

npm start
```

## Contributing

Contributions are welcome! Please open an issue or PR.

## License

MIT
