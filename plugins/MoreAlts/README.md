# MoreAlts — by Cordinsanity

> Secure account switcher for Revenge/Vendetta Discord

```
https://cordinsanity.github.io/revenge-plugins/MoreAlts/index.js
```

---

## What is this?

MoreAlts lets you save multiple Discord accounts and switch between them with a single tap. The original by Win8.1VMUser stored all tokens in **plain text** and used a trivial bitshift as a "password hash" — anyone with access to your phone's storage could read every token instantly.

This version rebuilds it from scratch with real cryptography.

---

## Comparison to the original

| | Original MoreAlts | MoreAlts by Cordinsanity |
|---|---|---|
| Token storage | ❌ Plain text | ✅ AES-256-GCM encrypted |
| Password hashing | ❌ Bitshift (trivial) | ✅ PBKDF2 + SHA-256 + random salt |
| Per-account encryption | ❌ None | ✅ HKDF key derivation per account |
| PIN lock | ❌ No | ✅ 4-digit, PBKDF2-hashed |
| Biometric auth | ❌ No | ✅ Fingerprint / Face ID |
| Screenshot protection | ❌ No | ✅ Yes (Android) |
| Memory wipe | ❌ No | ✅ Token buffer zeroed out after use |
| Login history | ❌ No | ✅ Encrypted, PIN-gated |
| Nitro badge | ❌ No | ✅ Live badge on every account card |
| Request fingerprint randomizer | ❌ No | ✅ Randomized User-Agent & headers |
| Unknown device warning | ❌ No | ✅ Alert on new sessions |

---

## Features

### Security
- **AES-256-GCM** — tokens are never stored in plain text
- **PBKDF2** password hashing with 100,000 iterations and a random salt
- **Per-account salt** — every token uses its own HKDF-derived encryption key
- **Memory wipe** — decrypted token buffer is zeroed out immediately after use
- **PIN lock** — 4-digit PIN required to open the plugin
- **Panic wipe** — deletes all accounts after 5 wrong PIN attempts
- **Biometric auth** — fingerprint / Face ID support
- **Screenshot protection** — blocks screenshots inside the plugin UI (Android)
- **Unknown device warning** — alerts when a new session appears on an account
- **Request fingerprint randomizer** — randomizes User-Agent and headers on login

### Account Management
- Add accounts via email & password or token
- Save your currently logged-in account in one tap
- Switch accounts instantly
- **Reorder accounts** with ▲▼ buttons
- **Refresh button** per account — updates Nitro status, avatar and display name live
- Remove accounts (switcher only, or full logout)
- Force logout without deleting saved accounts

### UI
- **Nitro badge** on every account card (`✦ Nitro` / `✦ Classic` / `✦ Basic`)
- Colored accent border per card — blue = active, purple = Nitro, gray = normal
- Avatar ring color reflecting account type, yellow while switching
- Clean action bar (Refresh / Copy Token / Remove) on every card

### Privacy & Info
- **Encrypted login history** — logs every switch, add and remove (PIN-gated)
- **Token expiry check** — pings the Discord API to verify all saved tokens are still valid
- **Clipboard auto-clear** — copied tokens are wiped from clipboard after 30 seconds
- **Export / Import** with optional PBKDF2 password protection

### CLI Commands
```
/accswitcher         — Plugin overview
/accswitcher add     — Save current account
/accswitcher login   — Switch to a saved account
/accswitcher list    — List all saved accounts
/accswitcher remove  — Remove a saved account
/accswitcher token   — Show current token (requires Unsafe Features)
```

---

## Credits

- Original MoreAlts concept by **Win8.1VMUser**
- Completely rewritten and extended by **Cordinsanity**

> ⚠️ Account switching violates Discord's Terms of Service. Use at your own risk.
