import { storage } from "@vendetta/plugin";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { before } from "@vendetta/patcher";
import MessageVaultSettings from "./Settings.js";
import patchSidebar from "./SidebarPatcher.js";

// Defaults
if (!storage.settings) storage.settings = {};
if (!storage.log) storage.log = [];
if (storage.settings.logDeletes === undefined) storage.settings.logDeletes = true;
if (storage.settings.logEdits === undefined) storage.settings.logEdits = true;
if (storage.settings.keepDeletedVisible === undefined) storage.settings.keepDeletedVisible = true;
if (storage.settings.maxEntries === undefined) storage.settings.maxEntries = 500;
if (storage.settings.addToSidebar === undefined) storage.settings.addToSidebar = true;

const FluxDispatcher = findByProps("dispatch", "subscribe");
const MessageStore = findByStoreName("MessageStore");

let unpatch = null;
let unpatchSidebar = null;

function addLog(entry) {
  const log = storage.log || [];
  log.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    time: Date.now(),
    ...entry,
  });
  const max = storage.settings.maxEntries || 500;
  if (log.length > max) log.length = max;
  storage.log = log;
}

function snapshotAuthor(msg) {
  return {
    authorId: msg?.author?.id,
    authorTag: msg?.author?.username || "unknown",
  };
}

export const settings = MessageVaultSettings;

export function onLoad() {
  unpatchSidebar = patchSidebar();

  if (!FluxDispatcher || !MessageStore) return;

  unpatch = before("dispatch", FluxDispatcher, ([action]) => {
    if (!action?.type) return;

    try {
      if (action.type === "MESSAGE_DELETE" && storage.settings.logDeletes) {
        const original = MessageStore.getMessage(action.channelId, action.id);
        if (!original) return;

        addLog({
          kind: "delete",
          channelId: action.channelId,
          messageId: action.id,
          ...snapshotAuthor(original),
          content: original.content,
          attachments: (original.attachments || []).map(a => a.url || a.proxy_url).filter(Boolean),
        });

        if (storage.settings.keepDeletedVisible) {
          action.type = "MESSAGE_UPDATE";
          action.message = {
            ...original,
            content: `🗑️ ~~${original.content || "*(no text content)*"}~~`,
            __vaultDeleted: true,
          };
        }
      } else if (action.type === "MESSAGE_DELETE_BULK" && storage.settings.logDeletes) {
        for (const id of action.ids || []) {
          const original = MessageStore.getMessage(action.channelId, id);
          if (!original) continue;
          addLog({
            kind: "delete",
            channelId: action.channelId,
            messageId: id,
            ...snapshotAuthor(original),
            content: original.content,
            attachments: (original.attachments || []).map(a => a.url || a.proxy_url).filter(Boolean),
          });
        }
      } else if (action.type === "MESSAGE_UPDATE" && storage.settings.logEdits && !action.message?.__vaultDeleted) {
        const incoming = action.message;
        if (!incoming?.id || incoming.content === undefined) return;

        const previous = MessageStore.getMessage(incoming.channel_id, incoming.id);
        if (previous && previous.content !== incoming.content) {
          addLog({
            kind: "edit",
            channelId: incoming.channel_id,
            messageId: incoming.id,
            ...snapshotAuthor(previous),
            before: previous.content,
            after: incoming.content,
          });
        }
      }
    } catch {}
  });
}

export function onUnload() {
  unpatch?.();
  unpatch = null;
  unpatchSidebar?.();
  unpatchSidebar = null;
}
