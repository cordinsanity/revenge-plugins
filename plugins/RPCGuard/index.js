import { before } from "@vendetta/patcher";
import { findByProps } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import RPCGuardSettings from "./Settings.js";

// Defaults
if (!storage.settings) storage.settings = {};
if (storage.settings.enabled === undefined) storage.settings.enabled = true;
if (!storage.stats) storage.stats = { stripped: 0 };

// Game/app activity ("Playing X", "Listening to Y") is sent to Discord's
// gateway as part of the same presence payload as your online status —
// so stripping `activities` from that payload is enough to stop it from
// ever reaching other users, without touching your status itself.
const PresenceActions = findByProps("updateStatus", "setStatus");

const patches = [];

export const settings = (props) => React.createElement(RPCGuardSettings, { ...props, storage });

export function onLoad() {
  if (!PresenceActions) {
    console.error("[RPCGuard] Could not find presence module, guard will not function");
    return;
  }

  try {
    patches.push(before("updateStatus", PresenceActions, (args) => {
      if (!storage.settings.enabled) return;
      if (args[0]?.activities?.length) {
        storage.stats.stripped = (storage.stats.stripped || 0) + 1;
        args[0] = { ...args[0], activities: [] };
      }
    }));
  } catch (e) {
    console.error("[RPCGuard] Failed to patch updateStatus:", e);
  }
}

export function onUnload() {
  patches.forEach(p => { try { p(); } catch {} });
  patches.length = 0;
}
