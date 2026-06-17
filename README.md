# Cordinsanity Plugins
> Revenge / Vendetta plugins by **Cordinsanity**

---

## MoreAlts — Secure Account Switcher

A privacy-focused, feature-rich account switcher for Discord (Revenge/Vendetta).  
Built as a **secure alternative to the original MoreAlts by Win8.1VMUser** — with proper encryption, PIN protection, biometric auth, and much more.

### Why this fork?

The original MoreAlts stored Discord tokens in **plain text** inside the plugin storage and used a trivial bitshift function as a "password hash". Anyone with access to your device storage could read all your tokens instantly.

This version fixes that completely:

| | Original MoreAlts | MoreAlts by Cordinsanity |
|---|---|---|
| Token storage | ❌ Plaintext | ✅ AES-256-GCM encrypted |
| Password hashing | ❌ Bitshift (trivial) | ✅ PBKDF2 + SHA-256 + random salt |
| Per-account encryption | ❌ None | ✅ HKDF per-account key derivation |
| PIN lock | ❌ No | ✅ Yes (4-digit, PBKDF2 hashed) |
| Biometric auth | ❌ No | ✅ Fingerprint / FaceID |
| Screenshot protection | ❌ No | ✅ Yes (Android) |
| Memory wipe after use | ❌ No | ✅ Yes (best effort) |
| Login history | ❌ No | ✅ Encrypted, PIN-protected |
| Nitro status badge | ❌ No | ✅ Live badge on each account |
| Request fingerprint randomizer | ❌ No | ✅ Randomized headers/User-Agent |
| Unknown device warning | ❌ No | ✅ Detects new sessions |

---

### Features

#### Security
- **AES-256-GCM token encryption** — tokens are never stored in plaintext
- **PBKDF2 password hashing** with 100,000 iterations and a random salt
- **Per-account salt** — each token uses its own HKDF-derived encryption key
- **Memory wipe** — decrypted token buffer is zeroed out after use
- **PIN lock** — 4-digit PIN required to open the plugin
- **Panic wipe** — deletes all accounts after 5 wrong PIN attempts
- **Biometric authentication** — fingerprint / FaceID support
- **Screenshot protection** — prevents screenshots in the plugin UI (Android)
- **Unknown device warning** — alerts when a new session appears on an account
- **Request fingerprint randomizer** — randomizes User-Agent and headers on login

#### Account Management
- Add accounts via email & password or token
- Add your current logged-in account in one tap
- Switch accounts instantly
- **Reorder accounts** with ▲▼ buttons
- **Refresh button** per account — updates Nitro status, avatar, display name live
- Remove accounts (switcher only, or full logout)
- Force logout without deleting saved accounts

#### UI
- **Nitro badge** on each account card (`✦ Nitro` / `✦ Classic` / `✦ Basic`)
- Colored accent border per card — blue = active, purple = Nitro, gray = normal
- Avatar ring color matching account type, yellow while switching
- Clean action bar (Refresh / Copy Token / Remove) on every card

#### Privacy & Info
- **Encrypted login history** — records every switch, add and remove (PIN-gated)
- **Token expiry checker** — pings Discord API to verify all saved tokens
- **Clipboard auto-clear** — copied tokens are wiped from clipboard after 30 seconds
- **Export / Import** with optional PBKDF2 password protection

#### CLI Commands
```
/accswitcher         — Plugin overview
/accswitcher add     — Save current account
/accswitcher login   — Switch to a saved account
/accswitcher list    — List all saved accounts
/accswitcher remove  — Remove a saved account
/accswitcher token   — Get current token (requires Unsafe Features)
```

---

### Installation

1. Open **Revenge** on Discord
2. Go to **Settings → Plugins → +**
3. Paste the plugin URL:

```
https://cordinsanity.github.io/revenge-plugins/MoreAlts/index.js
```

---

### Build from source

```bash
git clone https://github.com/cordinsanity/revenge-plugins
cd YOUR_REPO
npm install
npm run build
```

Built plugin ends up in `dist/MoreAlts/`.

---

### Credits

- Original MoreAlts concept by **Win8.1VMUser**
- Completely rewritten and extended by **Cordinsanity**

---

> ⚠️ **Disclaimer:** Account switching violates Discord's Terms of Service. Use at your own risk.
