import { storage } from "@vendetta/plugin";
import { React } from "@vendetta/metro/common";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { before } from "@vendetta/patcher";
import { showToast } from "@vendetta/ui/toasts";
import FriendWatchSettings from "./Settings.js";

// Defaults
if (!storage.settings) storage.settings = {};
if (!storage.log) storage.log = [];
if (storage.settings.logFriends === undefined) storage.settings.logFriends = true;
if (storage.settings.logBlocks === undefined) storage.settings.logBlocks = false;
if (storage.settings.notifyOnRemove === undefined) storage.settings.notifyOnRemove = true;
if (storage.settings.maxEntries === undefined) storage.settings.maxEntries = 300;

const FluxDispatcher = findByProps("dispatch", "subscribe");
const UserStore = findByStoreName("UserStore");

// Discord relationship type ids
const TYPE_FRIEND = 1;
const TYPE_BLOCKED = 2;

function userTag(id, fallbackUser) {
  try {
    const u = UserStore?.getUser?.(id) || fallbackUser;
    return u ? (u.globalName || u.username || id) : id;
  } catch {
    return id;
  }
}

function addLog(entry) {
  const log = storage.log || [];
  log.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, time: Date.now(), ...entry });
  const max = storage.settings.maxEntries || 300;
  if (log.length > max) log.length = max;
  storage.log = log;
}

let unpatch = null;

export const settings = (props) => React.createElement(FriendWatchSettings, { ...props, storage });

export function onLoad() {
  if (!FluxDispatcher) {
    console.error("[FriendWatch] FluxDispatcher not found");
    return;
  }

  unpatch = before("dispatch", FluxDispatcher, ([action]) => {
    if (!action?.type) return;

    try {
      if (action.type === "RELATIONSHIP_ADD") {
        const rel = action.relationship;
        if (!rel) return;
        if (rel.type === TYPE_FRIEND && storage.settings.logFriends) {
          const tag = userTag(rel.id, rel.user);
          addLog({ kind: "add", relType: "friend", userId: rel.id, userTag: tag });
          showToast(`👋 ${tag} added as friend`, 0);
        } else if (rel.type === TYPE_BLOCKED && storage.settings.logBlocks) {
          const tag = userTag(rel.id, rel.user);
          addLog({ kind: "add", relType: "blocked", userId: rel.id, userTag: tag });
        }
      } else if (action.type === "RELATIONSHIP_REMOVE") {
        const rel = action.relationship;
        if (!rel) return;
        const tag = userTag(rel.id, rel.user);
        if (rel.type === TYPE_FRIEND && storage.settings.logFriends) {
          addLog({ kind: "remove", relType: "friend", userId: rel.id, userTag: tag });
          if (storage.settings.notifyOnRemove) showToast(`💔 ${tag} removed you as friend`, 0);
        } else if (rel.type === TYPE_BLOCKED && storage.settings.logBlocks) {
          addLog({ kind: "remove", relType: "blocked", userId: rel.id, userTag: tag });
        }
      }
    } catch (e) {
      console.error("[FriendWatch] dispatch handler error:", e);
    }
  });
}

export function onUnload() {
  try { unpatch?.(); } catch {}
}
