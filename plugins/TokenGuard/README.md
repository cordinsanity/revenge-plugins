# TokenGuard — by Cordinsanity

> Monitors all network requests and alerts when a plugin sends your Discord token to an unknown URL

```
https://cordinsanity.github.io/revenge-plugins/TokenGuard/index.js
```

---

## What does this plugin do?

Revenge/Vendetta plugins have full access to `fetch` — meaning any installed plugin can theoretically send your Discord token to an external URL without you ever noticing.

TokenGuard patches `globalThis.fetch` and checks **every single network request** made from within Discord. If your token (`Authorization` header) is being sent to a domain that doesn't belong to Discord, you get an immediate warning.

---

## Features

### Real-Time Monitoring
- Monitors **all** `fetch` requests in the background
- Checks whether the `Authorization` header (= your token) is included
- Distinguishes between Discord's own requests (OK) and external URLs (🚨 Suspicious)
- **Toast notification** on suspicious requests

### Request Log
- Full log of all requests containing your token inside the settings page
- 🔴 Red = suspicious (external domain), 🟢 Green = ok (Discord)
- Shows: domain, method, URL preview, timestamp
- Up to 200 entries, oldest are removed automatically
- Log can be cleared with one button

### Protection Options
- **Auto-block suspicious requests** — blocks them before they go out
- **Log suspicious only** — saves storage, Discord requests are ignored

### Whitelist
- Default whitelist covers all Discord domains
- Add your own domains (e.g. self-hosted bots)
- Whitelisted domains are never flagged as suspicious

### Status Banner
- At a glance: how many suspicious requests were detected
- 🛡️ Green = all clear / 🚨 Red = action recommended

---

## Why does this matter?

A malicious or compromised plugin could:
- Send your token to an attacker's server
- Steal your account data silently
- Make background requests without your knowledge

TokenGuard makes this visible — and can optionally block it entirely.

---

**Author:** Cordinsanity — [github.com/cordinsanity](https://github.com/cordinsanity)
