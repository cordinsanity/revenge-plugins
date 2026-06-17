# Cordinsanity — Revenge Plugins

> Privacy-focused plugins for [Revenge](https://github.com/revenge-mod) / Vendetta (Discord mod)

---

## Why these plugins?

Most Discord mods and plugins store tokens in plain text, log everything and have zero security features. This is different.

Every plugin here is built from the ground up with a **privacy and security focus**:
- Tokens are **encrypted** at rest (AES-256-GCM)
- No plain text in storage or logs
- Network monitoring instead of blind trust
- Fully configurable — you decide what's active

---

## Plugins

| Plugin | Description | Install |
|--------|-------------|---------|
| [MoreAlts](plugins/MoreAlts/README.md) | Secure account switcher with AES-256 token encryption, PIN lock, biometrics & more | [Link](https://cordinsanity.github.io/revenge-plugins/MoreAlts/index.js) |
| [GhostMode](plugins/GhostMode/README.md) | Go invisible, block typing indicators & read receipts — toggle right in the You Bar | [Link](https://cordinsanity.github.io/revenge-plugins/GhostMode/index.js) |
| [TokenGuard](plugins/TokenGuard/README.md) | Monitors all network requests and alerts when a plugin sends your token to an unknown URL | [Link](https://cordinsanity.github.io/revenge-plugins/TokenGuard/index.js) |

---

## Installation

1. Open **Revenge** on Discord
2. Go to **Settings → Plugins → +**
3. Paste the plugin URL (see table above)

---

## Author

**Cordinsanity** — [github.com/cordinsanity](https://github.com/cordinsanity)

> ⚠️ These plugins are for Revenge/Vendetta. Account switching and mods violate Discord's ToS — use at your own risk.
