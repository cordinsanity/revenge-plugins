import { before } from "@vendetta/patcher";
import { findByProps } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import StatusLockSettings from "./Settings.js";

// Defaults
if (!storage.settings) storage.settings = {};
if (storage.settings.locked === undefined) storage.settings.locked = false;
if (!storage.settings.lockedStatus) storage.settings.lockedStatus = "online";

const PresenceActions = findByProps("updateStatus", "setStatus");

const patches = [];

export function applyLockedStatusNow() {
  if (!storage.settings.locked) return;
  try { PresenceActions?.updateStatus?.({ status: storage.settings.lockedStatus }); } catch {}
}

export const settings = (props) => React.createElement(StatusLockSettings, { ...props, storage, applyLockedStatusNow });

export function onLoad() {
  if (!PresenceActions) {
    console.error("[StatusLock] Could not find presence module, lock will not function");
    return;
  }

  try {
    patches.push(before("updateStatus", PresenceActions, (args) => {
      if (!storage.settings.locked) return;
      const wanted = storage.settings.lockedStatus || "online";
      if (args[0] && args[0].status !== wanted) {
        args[0] = { ...args[0], status: wanted };
      }
    }));
  } catch (e) {
    console.error("[StatusLock] Failed to patch updateStatus:", e);
  }

  if (storage.settings.locked) applyLockedStatusNow();
}

export function onUnload() {
  patches.forEach(p => { try { p(); } catch {} });
  patches.length = 0;
}
