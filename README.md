# DiscoPanel Discord Bot

A self-hosted Discord bot for managing and monitoring your [DiscoPanel](https://discopanel.app) Minecraft servers directly from Discord.

## Features

- 📊 **Live Status Embeds** — Auto-updating server status in a channel of your choice (online/offline, players, CPU, RAM, TPS, storage, uptime)
- 🎮 **Server Control** — Start, stop, and restart servers with slash commands
- ⚡ **Quick Actions** — Optional buttons on status embeds for instant server control
- 📌 **Pin Servers** — Choose which servers to monitor per Discord guild
- ⚙️ **Configurable Fields** — Toggle which info appears in status embeds
- 🔒 **Admin Only** — All commands restricted to admins or a configurable role
- 🏠 **Multi-Guild** — One bot instance can serve multiple Discord servers, each connected to their own DiscoPanel

## Prerequisites

- A running [DiscoPanel](https://github.com/nickheyer/discopanel) instance
- A Discord bot token ([create one here](https://discord.com/developers/applications))
- Docker (recommended) or Node.js 20+

## Quick Start with Docker

### 1. Create a Discord Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**, give it a name
3. Go to **Bot** → click **Reset Token** → copy the token
4. Go to **OAuth2** → **URL Generator** → select scopes: `bot`, `applications.commands`
5. Select permissions: `Send Messages`, `Embed Links`, `Read Message History`, `Use Slash Commands`
6. Open the generated URL to invite the bot to your server

### 2. Generate an Encryption Key

```bash
openssl rand -hex 32
```

Save this key — you'll need it for the config.

### 3. Run with Docker Compose (Recommended)

Create a `docker-compose.yml`:

```yaml
services:
  discopanel-bot:
    image: ghcr.io/muckmuck96/discopanel-bot:latest  # or build locally
    # build: .  # uncomment to build from source
    container_name: discopanel-bot
    restart: unless-stopped
    environment:
      - DISCORD_TOKEN=your_discord_bot_token
      - DISCORD_CLIENT_ID=your_application_client_id
      - ENCRYPTION_KEY=your_64_char_hex_key_from_step_2
      # Optional:
      # - STATUS_INTERVAL=30    # Status update interval in seconds (default: 30)
      # - LOG_LEVEL=info        # debug, info, warn, error (default: info)
    volumes:
      - discopanel-bot-data:/app/data

volumes:
  discopanel-bot-data:
```

```bash
docker compose up -d
```

### 4. Or Run with Docker Run

```bash
docker run -d \
  --name discopanel-bot \
  --restart unless-stopped \
  -e DISCORD_TOKEN=your_discord_bot_token \
  -e DISCORD_CLIENT_ID=your_application_client_id \
  -e ENCRYPTION_KEY=your_64_char_hex_key \
  -v discopanel-bot-data:/app/data \
  ghcr.io/muckmuck96/discopanel-bot:latest
```

### 5. Build from Source (Optional)

```bash
git clone https://github.com/muckmuck96/discopanel-bot.git
cd discopanel-bot
docker build -t discopanel-bot .
docker run -d \
  --name discopanel-bot \
  --restart unless-stopped \
  -e DISCORD_TOKEN=your_discord_bot_token \
  -e DISCORD_CLIENT_ID=your_application_client_id \
  -e ENCRYPTION_KEY=your_64_char_hex_key \
  -v discopanel-bot-data:/app/data \
  discopanel-bot
```

## Bot Setup (in Discord)

Once the bot is running and invited to your server:

1. **`/setup`** — Connect to your DiscoPanel instance (enter URL + credentials via a secure popup)
2. **`/pin`** — Select which servers to monitor
3. **`/status-channel`** — Pick a channel for live status embeds
4. Done! The bot will start posting and updating server status automatically.

## Commands

| Command | Description | Permission |
|---|---|---|
| `/setup` | Connect to a DiscoPanel instance | Admin |
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

| Variable | Required | Default | Description |
|---|---|---|---|
| `DISCORD_TOKEN` | ✅ | — | Discord bot token |
| `DISCORD_CLIENT_ID` | ✅ | — | Discord application client ID |
| `ENCRYPTION_KEY` | ✅ | — | 32-byte hex string for encrypting stored tokens |
| `STATUS_INTERVAL` | ❌ | `30` | Status embed update interval in seconds |
| `LOG_LEVEL` | ❌ | `info` | Log level: `debug`, `info`, `warn`, `error` |

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
export DISCORD_TOKEN=...
export DISCORD_CLIENT_ID=...
export ENCRYPTION_KEY=...
npm start
```

## Contributing

Contributions are welcome! Please open an issue or PR.

## License

MIT
