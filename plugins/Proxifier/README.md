# Proxifier — by woodbloom

Route Discord API requests through a custom proxy. Protects your real IP and helps bypass network restrictions.

```
https://woodbloom.github.io/revenge-plugins/Proxifier/
```

---

## What does this plugin do?

Proxifier patches Discord's `fetch` function and redirects API requests through a proxy server of your choice. This lets you:
- Hide your real IP from Discord's servers
- Bypass network-level Discord blocks (school/work/country)
- Route traffic through a self-hosted proxy for full control

---

## Features

### Proxy Configuration
- **Preset proxies** — choose from built-in options or enter your own URL
- **Two proxy modes:**
  - **Prepend** — `proxy.com/https://discord.com/api/...`
  - **Query param** — `proxy.com/?url=https://discord.com/api/...`
- Choose **which domains to proxy** — API, CDN, gateway individually

### Domains
- `discord.com` — main API (messages, auth, etc.)
- `discordapp.com` — legacy API endpoints
- `cdn.discordapp.com` — avatars, attachments, emojis
- `gateway.discord.gg` — realtime gateway (WebSocket)

### Test Connection
- Built-in **proxy test** button — pings Discord's gateway through your proxy and shows response time

### Enable / Disable
- One toggle to enable or disable proxying instantly
- Active proxy URL shown in the status banner

---

## Setting up your own proxy

For best privacy, self-host a proxy. The simplest option is a CORS proxy on any Node.js host:

```bash
npx local-cors-proxy --proxyUrl https://discord.com
```

Or use any HTTP reverse proxy (nginx, Caddy, etc.) pointing to `https://discord.com`.

---

**Author:** woodbloom — [github.com/woodbloom](https://github.com/woodbloom)

> ⚠️ Using proxies may violate Discord's ToS. Use at your own risk.
