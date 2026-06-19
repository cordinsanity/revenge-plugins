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
- Everything is saved in this plugin's own storage file (the same JSON-backed storage every plugin in this repo uses) — nothing is sent anywhere
- Log persists across app restarts

### Settings
- Toggle delete logging, edit logging and the visible strike-through independently
- Delete a single log entry with the ✕ button, or wipe everything with **Clear all**
- Log is capped (default 500 entries) to keep storage small — oldest entries drop first

---

## Notes

- Read receipts/unread counters may not perfectly reflect a "soft-deleted" message since the delete event is intercepted — this is a known trade-off of keeping the message visible.
- Bulk deletions (`MESSAGE_DELETE_BULK`, e.g. mod purges) are logged but not restored visibly.

---

**Author:** Cordinsanity — [github.com/cordinsanity](https://github.com/cordinsanity)
