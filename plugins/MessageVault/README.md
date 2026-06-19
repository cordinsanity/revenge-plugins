# MessageVault — by woodbloom

MessageVault is a local message logger — it logs deleted & edited messages on-device. Deleted messages stay visible (struck through), every edit keeps a before/after copy, and the whole log lives in this plugin's own storage on your device.

```
https://woodbloom.github.io/revenge-plugins/MessageVault/
```

---

## Features

### Deletion logging
- Catches the `MESSAGE_DELETE` event before Discord removes the message from your view
- Deleted message stays in the chat, prefixed `🗑️` and struck through, instead of vanishing
- Full content + attachment URLs are saved to the log even if you disable the visible strike-through

### Edit logging
- Catches `MESSAGE_UPDATE` and stores the content **before** and **after** the edit
- DMs are logged by default; logging server (guild) channels too is opt-in (see below)

### Server message logging (optional, off by default)
- DMs are logged out of the box. Logging server channels as well is a separate toggle in Settings → Logging
- Off by default because servers are usually far busier than DMs — turning it on can fill up your device's internal storage noticeably faster
- Enabling it requires confirming a warning; consider lowering "Max log entries" if you turn this on

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

### Chat export (ZIP)
- Settings → Chat export lets you export a channel's full message history as a `.zip` file saved to your device's Downloads folder
- Includes `messages.txt` (readable transcript), `messages.json` (raw data), and optionally a `media/` folder with downloaded images/videos
- Useful for keeping evidence/backups of a conversation outside of Discord
- Capped by a "Max messages" setting (default 1000) and requires confirming a warning before starting, since media-heavy or long chats can take a while and use noticeable storage/data — or flip "Export ALL messages (no limit)" to ignore the cap and pull the channel's entire history
- Needs a channel ID (Settings → Advanced → Developer Mode, then "Copy Channel ID" on a chat); it's pre-filled with whatever channel you had open when you opened MessageVault's settings
- **👥 Pick a friend instead**: opens a searchable list of your friends (with their avatars) right in the export card — tapping one opens/finds your DM with them and immediately starts a full, unlimited export of that conversation

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
- Chat export relies on Discord's internal REST module and a native file-writing module that can vary between app versions/platforms; if either isn't found, the export shows a clear error toast instead of saving a broken file.
- The friend picker reads your friends list from Discord's internal relationship/user stores and opens DMs via the same internal REST module — same version-dependent caveat applies.
- "Export ALL messages" can take a long time and use a lot of storage/data on very long or busy conversations — there's no upper bound once it's enabled.

---

**Author:** woodbloom — [github.com/woodbloom](https://github.com/woodbloom)
