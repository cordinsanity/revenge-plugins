# GhostMode — by Cordinsanity

> Go invisible, block typing indicators and read receipts — toggle right from the You Bar

```
https://cordinsanity.github.io/revenge-plugins/GhostMode/index.js
```

---

## What does this plugin do?

GhostMode adds a **👻 ghost button directly in the You Bar** (next to the bell icon at the bottom) so you can go invisible with a single tap. Others will see you as offline even while you're actively using Discord.

On top of that, GhostMode optionally blocks the typing indicator and read receipts — nobody can tell you're online or currently writing a message.

---

## Features

### Ghost Toggle in the You Bar
- 👻 / 👤 button right next to the bell in the You Bar
- One tap → status immediately set to **Invisible**
- Tap again → back to your normal status
- Long press → shows current ghost state as a toast

### Privacy Features
- **Block typing indicator** — nobody sees "is typing..." while ghost mode is active
- **Block read receipts** — channels are not automatically marked as read
- Status stays **Invisible** even while actively navigating

### Settings
- **Default status after Ghost-Off** — choose whether to return to Online / Idle / DND / Invisible
- **You Bar button** — can be disabled if you don't want it
- Typing blocker and read receipt blocker can be toggled individually

---

## How it works

GhostMode patches `PresenceActions.updateStatus` internally to set the status to `invisible`, and blocks `startTyping` and `ack` (mark-as-read) calls while ghost is active. When the plugin unloads, the status is automatically restored.

---

**Author:** Cordinsanity — [github.com/cordinsanity](https://github.com/cordinsanity)
