# MoreAlts — by Cordinsanity

Secure multi-account switcher for Revenge/Vendetta Discord.

```
https://cordinsanity.github.io/revenge-plugins/MoreAlts/
```

---

## What makes this different?

The original MoreAlts stored tokens in plain text — anyone with physical access to your device could read them directly. This version encrypts everything with real cryptography and adds a full suite of security features on top.

---

## Feature Overview

### Security
- **AES-256-GCM encryption** — tokens are never stored in plain text
- **PBKDF2 password hashing** with 100,000 iterations and a unique random salt
- **Per-account encryption keys** — every account uses its own derived key via HKDF
- **Memory wipe** — decrypted token is zeroed out from memory immediately after use
- **PIN lock** — 4-digit PIN to open the plugin (PBKDF2-hashed)
- **Panic wipe** — wipes all accounts after 5 wrong PIN attempts
- **Biometric auth** — fingerprint / Face ID support
- **Screenshot protection** — blocks screenshots inside the plugin (Android)
- **Unknown device warning** — alerts if a new session is detected on an account
- **Request fingerprint randomizer** — randomizes headers and User-Agent on login

### Account Management
- Add accounts via email & password or token
- Save your current account with one tap
- Switch accounts instantly
- **Reorder accounts** with ▲▼ buttons
- **Per-account refresh** — updates Nitro status, avatar and display name live
- Remove accounts from the switcher or force a full logout

### UI
- **Nitro badge** on every card — `✦ Nitro` / `✦ Classic` / `✦ Basic`
- Colored border per card — blue = active, purple = Nitro, gray = standard
- Compact action bar per account — Refresh / Copy Token / Remove

### Privacy
- **Encrypted login history** — logs every switch, add and remove (PIN-gated)
- **Token expiry check** — verifies all saved tokens are still valid
- **Clipboard auto-clear** — copied tokens are cleared after 30 seconds
- **Export / Import** with optional password protection

### Comparison

| | Original MoreAlts | MoreAlts by Cordinsanity |
|---|---|---|
| Token storage | ❌ Plain text | ✅ AES-256-GCM encrypted |
| Password hashing | ❌ Trivial | ✅ PBKDF2 + SHA-256 + salt |
| Per-account encryption | ❌ None | ✅ HKDF per account |
| PIN lock | ❌ No | ✅ Yes |
| Biometric auth | ❌ No | ✅ Yes |
| Screenshot protection | ❌ No | ✅ Yes |
| Memory wipe | ❌ No | ✅ Yes |
| Login history | ❌ No | ✅ Encrypted & PIN-gated |
| Nitro badge | ❌ No | ✅ Yes |
| Request fingerprint | ❌ No | ✅ Yes |

### CLI Commands
```
/accswitcher add     — Save current account
/accswitcher login   — Switch to a saved account
/accswitcher list    — List all accounts
/accswitcher remove  — Remove an account
/accswitcher token   — Show current token (requires Unsafe Features)
```

---

**Author:** Cordinsanity — [github.com/cordinsanity](https://github.com/cordinsanity)

> ⚠️ Account switching violates Discord's ToS. Use at your own risk.
