# TokenGuard — by Cordinsanity

Monitors all network requests and alerts you when your Discord token is sent to an unknown URL.

```
https://cordinsanity.github.io/revenge-plugins/TokenGuard/
```

---

## Why does this matter?

Every Revenge/Vendetta plugin has full access to `fetch` — which means any plugin could theoretically send your Discord token to an external server. TokenGuard makes that visible and lets you stop it.

---

## Features

### Real-Time Monitoring
- Intercepts every `fetch` request made from within Discord
- Checks whether your token (`Authorization` header) is included
- Instantly distinguishes Discord's own requests from external ones
- **Toast alert** the moment something suspicious is detected

### Request Log
- Full request history inside the settings page
- 🔴 Red = suspicious &nbsp;|&nbsp; 🟢 Green = Discord — safe
- Shows domain, method, URL preview and timestamp
- Stores up to 200 entries, clears automatically when full
- One-tap log wipe

### Protection Options
- **Auto-block** suspicious requests before they leave your device
- **Log suspicious only** — ignores Discord traffic to save space

### Whitelist
- All Discord domains are whitelisted by default
- Add your own trusted domains (e.g. self-hosted bots)
- Whitelisted domains are never flagged

### Status Banner
- At a glance view of how many suspicious requests were caught
- 🛡️ All clear &nbsp;/&nbsp; 🚨 Action recommended

---

**Author:** Cordinsanity — [github.com/cordinsanity](https://github.com/cordinsanity)
