# MessageVault — by Cordinsanity

MessageVault is a local message logger — it logs deleted & edited messages on-device. Deleted messages stay visible (struck through), every edit keeps a before/after copy, and the whole log lives in this plugin's own storage on your device.

```
https://cordinsanity.github.io/revenge-plugins/MessageVault/
```

---

## Features

### Deletion logging
- Catches the `MESSAGE_DELETE` event before Discord removes the message from your view
- Deleted message stays in the chat, prefixed `🗑️` and struck through, instead of vanishing
- Full content + attachment URLs are saved to the log even if you disable the visible strike-through

### Edit logging
- Catches `MESSAGE_UPDATE` and stores the content **before** and **after** the edit
- Works in DMs and servers alike

### Local-only storage
- Everything is saved in this plugin's own storage file (the same JSON-backed storage every plugin in this repo uses) — nothing is sent anywhere by default
- Log persists across app restarts

### Encryption (on by default)
- Logged message content (deleted/edited text) is encrypted at rest with **AES-256-GCM** using a key generated on-device and stored in the plugin's own storage
- Protects your DM/private chat history from anyone who pulls the raw plugin storage off your device
- Can be turned off in Settings → Security, but doing so requires confirming **3 separate warning dialogs** since it makes future log entries plain text
- Entries already encrypted stay encrypted even if you later disable the setting

### Remote backup (optional, off by default)
- Settings → Remote backup lets you point the plugin at a server URL of your choosing; every new log entry is POSTed there as JSON in addition to local storage
- Off by default, and enabling it requires confirming a warning: only use a server you control and trust, since it receives private message content, and sending a lot of data can overload small/free servers
- Local storage keeps working exactly the same whether or not remote backup is enabled

### Settings
- Toggle delete logging, edit logging and the visible strike-through independently
- Delete a single log entry with the ✕ button, or wipe everything with **Clear all**
- Log is capped (default 500 entries) to keep storage small — oldest entries drop first

### Sidebar shortcut
- Adds a **Message Logger** button to your Discord settings sidebar, right alongside MoreAlts' **Account Switcher** button
- Tapping it opens the same log/settings screen described above — no need to dig through Plugins → MessageVault
- Can be disabled via the "Add Message Logger to settings sidebar" toggle (restart the app to apply)

---

## Notes

- Read receipts/unread counters may not perfectly reflect a "soft-deleted" message since the delete event is intercepted — this is a known trade-off of keeping the message visible.
- Bulk deletions (`MESSAGE_DELETE_BULK`, e.g. mod purges) are logged but not restored visibly.

---

**Author:** Cordinsanity — [github.com/cordinsanity](https://github.com/cordinsanity)
