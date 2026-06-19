import { storage } from "@vendetta/plugin";
import { React } from "@vendetta/metro/common";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { before } from "@vendetta/patcher";
import MentionLogSettings from "./Settings.js";

// Defaults
if (!storage.settings) storage.settings = {};
if (!storage.log) storage.log = [];
if (storage.settings.logEveryoneHere === undefined) storage.settings.logEveryoneHere = false;
if (storage.settings.maxEntries === undefined) storage.settings.maxEntries = 300;

const FluxDispatcher = findByProps("dispatch", "subscribe");
const UserStore = findByStoreName("UserStore");
const ChannelStore = findByStoreName("ChannelStore");

function mentionsMe(message, myId) {
  const direct = (message.mentions || []).some(m => (typeof m === "string" ? m : m?.id) === myId);
  if (direct) return true;
  if (storage.settings.logEveryoneHere && message.mention_everyone) return true;
  return false;
}

function addLog(entry) {
  const log = storage.log || [];
  log.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, time: Date.now(), ...entry });
  const max = storage.settings.maxEntries || 300;
  if (log.length > max) log.length = max;
  storage.log = log;
}

let unpatch = null;

export const settings = (props) => React.createElement(MentionLogSettings, { ...props, storage });

export function onLoad() {
  if (!FluxDispatcher || !UserStore) {
    console.error("[MentionLog] FluxDispatcher or UserStore not found");
    return;
  }

  unpatch = before("dispatch", FluxDispatcher, ([action]) => {
    if (action?.type !== "MESSAGE_CREATE") return;

    try {
      const message = action.message;
      if (!message) return;

      const me = UserStore.getCurrentUser?.();
      if (!me || message.author?.id === me.id) return;
      if (!mentionsMe(message, me.id)) return;

      const channelName = (() => {
        try { return ChannelStore?.getChannel?.(message.channel_id)?.name || null; } catch { return null; }
      })();

      addLog({
        messageId: message.id,
        channelId: message.channel_id,
        channelName,
        authorId: message.author?.id,
        authorTag: message.author?.global_name || message.author?.username || "unknown",
        content: message.content || "",
        everyone: !!message.mention_everyone,
      });
    } catch (e) {
      console.error("[MentionLog] dispatch handler error:", e);
    }
  });
}

export function onUnload() {
  try { unpatch?.(); } catch {}
}
