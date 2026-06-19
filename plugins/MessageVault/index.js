import { storage } from "@vendetta/plugin";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { before } from "@vendetta/patcher";
import MessageVaultSettings from "./Settings.js";
import patchSidebar from "./SidebarPatcher.js";
import { generateEncryptionKey, encryptText } from "./CryptoUtils.js";

// Defaults
if (!storage.settings) storage.settings = {};
if (!storage.log) storage.log = [];
if (storage.settings.logDeletes === undefined) storage.settings.logDeletes = true;
if (storage.settings.logEdits === undefined) storage.settings.logEdits = true;
if (storage.settings.keepDeletedVisible === undefined) storage.settings.keepDeletedVisible = true;
if (storage.settings.maxEntries === undefined) storage.settings.maxEntries = 500;
if (storage.settings.addToSidebar === undefined) storage.settings.addToSidebar = true;
if (storage.settings.encryptLog === undefined) storage.settings.encryptLog = true;
if (storage.settings.enableRemoteSync === undefined) storage.settings.enableRemoteSync = false;
if (storage.settings.remoteServerUrl === undefined) storage.settings.remoteServerUrl = "";

const FluxDispatcher = findByProps("dispatch", "subscribe");
const MessageStore = findByStoreName("MessageStore");

let unpatch = null;
let unpatchSidebar = null;

async function ensureEncryptionKey() {
  if (!storage.settings.logEncryptionKey) {
    storage.settings.logEncryptionKey = await generateEncryptionKey();
  }
  return storage.settings.logEncryptionKey;
}

async function syncToRemote(record) {
  if (!storage.settings.enableRemoteSync || !storage.settings.remoteServerUrl) return;
  try {
    await fetch(storage.settings.remoteServerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
  } catch {}
}

async function addLog(entry) {
  const record = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    time: Date.now(),
    ...entry,
  };

  if (storage.settings.encryptLog) {
    try {
      const key = await ensureEncryptionKey();
      if (record.content !== undefined) record.content = await encryptText(record.content, key);
      if (record.before !== undefined) record.before = await encryptText(record.before, key);
      if (record.after !== undefined) record.after = await encryptText(record.after, key);
      record.encrypted = true;
    } catch {}
  }

  const log = storage.log || [];
  log.unshift(record);
  const max = storage.settings.maxEntries || 500;
  if (log.length > max) log.length = max;
  storage.log = log;

  syncToRemote(record);
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
