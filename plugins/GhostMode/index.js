import { after, before } from "@vendetta/patcher";
import { findByProps, findByDisplayName, findByStoreName } from "@vendetta/metro";
import { findInReactTree } from "@vendetta/utils";
import { React, ReactNative } from "@vendetta/metro/common";
import { storage, useProxy } from "@vendetta/plugin";
import { showToast } from "@vendetta/ui/toasts";
import GhostModeSettings from "./Settings.js";

// Defaults
if (!storage.settings) storage.settings = {};
if (storage.ghostEnabled === undefined) storage.ghostEnabled = false;
if (storage.settings.blockTyping === undefined) storage.settings.blockTyping = true;
if (storage.settings.blockReadReceipts === undefined) storage.settings.blockReadReceipts = false;
if (!storage.settings.defaultStatus) storage.settings.defaultStatus = "online";
if (storage.settings.showInYouBar === undefined) storage.settings.showInYouBar = true;

const PresenceActions = findByProps("updateStatus", "setStatus");
const TypingActions   = findByProps("startTyping", "stopTyping");
const ChannelActions  = findByProps("ack", "batchAck");

const patches = [];

function setGhostMode(enabled) {
  storage.ghostEnabled = enabled;
  try {
    PresenceActions?.updateStatus?.({ status: enabled ? "invisible" : (storage.settings.defaultStatus || "online") });
  } catch {}
  showToast(enabled ? "👻 Ghost Mode ON" : "👤 Ghost Mode OFF", 0);
}

function GhostButton() {
  const s = useProxy(storage);
  const active = s.ghostEnabled;

  return React.createElement(
    ReactNative.TouchableOpacity,
    {
      onPress: () => setGhostMode(!active),
      onLongPress: () => showToast(`Ghost: ${active ? "ON" : "OFF"} — Typing blocked: ${s.settings.blockTyping ? "yes" : "no"}`, 0),
      accessibilityLabel: "Ghost Mode",
      style: {
        width: 44, height: 44,
        alignItems: "center", justifyContent: "center",
        borderRadius: 22,
        backgroundColor: active ? "rgba(114,137,218,0.3)" : "transparent",
        marginHorizontal: 2,
      }
    },
    React.createElement(ReactNative.Text, { style: { fontSize: 20 } }, active ? "👻" : "👤")
  );
}

function tryPatchYouBar() {
  // Try every common name Discord has used for the bottom user panel
  const names = [
    "YouBar", "UserPanel", "ConnectedUserPanel", "YouSection",
    "AccountPanelInner", "AccountPanel", "ConnectedAccountPanel",
  ];

  for (const name of names) {
    try {
      const mod = findByDisplayName(name, false);
      if (!mod?.default || typeof mod.default !== "function") continue;

      patches.push(after("default", mod, ([props], res) => {
        if (!storage.settings?.showInYouBar || !res) return res;
        try {
          // Find any container that holds the notification bell button
          const bellContainer = findInReactTree(res, node => {
            if (!node?.props?.children || !Array.isArray(node.props.children)) return false;
            return node.props.children.some(c =>
              c?.props?.accessibilityLabel?.toLowerCase().includes("notif") ||
              c?.props?.accessibilityLabel?.toLowerCase().includes("bell") ||
              c?.type?.displayName?.toLowerCase?.().includes("bell") ||
              c?.type?.displayName?.toLowerCase?.().includes("notif")
            );
          });

          if (bellContainer) {
            const kids = Array.isArray(bellContainer.props.children)
              ? [...bellContainer.props.children]
              : [bellContainer.props.children].filter(Boolean);
            kids.unshift(React.createElement(GhostButton, { key: "__ghost__" }));
            bellContainer.props.children = kids;
          }
        } catch {}
        return res;
      }));

      return true;
    } catch {}
  }

  // Fallback: patch by props signature
  try {
    const mod = findByProps("useShouldShowBell");
    if (mod) {
      const key = Object.keys(mod).find(k => typeof mod[k] === "function");
      if (key) {
        patches.push(after(key, mod, ([props], res) => {
          if (!storage.settings?.showInYouBar || !res) return res;
          try {
            const bellContainer = findInReactTree(res, node =>
              Array.isArray(node?.props?.children) &&
              node.props.children.some(c => c?.props?.accessibilityLabel?.toLowerCase().includes("notif"))
            );
            if (bellContainer) {
              const kids = [...(Array.isArray(bellContainer.props.children) ? bellContainer.props.children : [bellContainer.props.children])];
              kids.unshift(React.createElement(GhostButton, { key: "__ghost__" }));
              bellContainer.props.children = kids;
            }
          } catch {}
          return res;
        }));
        return true;
      }
    }
  } catch {}

  return false;
}

export const settings = GhostModeSettings;

export function onLoad() {
  // Block typing indicator
  if (TypingActions) {
    patches.push(before("startTyping", TypingActions, () => {
      if (storage.ghostEnabled && storage.settings?.blockTyping) return [undefined];
    }));
  }

  // Block read receipts
  if (ChannelActions) {
    patches.push(before("ack", ChannelActions, () => {
      if (storage.ghostEnabled && storage.settings?.blockReadReceipts) return [undefined, undefined];
    }));
    if (ChannelActions.batchAck) {
      patches.push(before("batchAck", ChannelActions, () => {
        if (storage.ghostEnabled && storage.settings?.blockReadReceipts) return [undefined];
      }));
    }
  }

  if (storage.settings?.showInYouBar !== false) {
    tryPatchYouBar();
  }

  // Re-apply ghost state from previous session
  if (storage.ghostEnabled) {
    try { PresenceActions?.updateStatus?.({ status: "invisible" }); } catch {}
  }
}

export function onUnload() {
  patches.forEach(p => { try { p(); } catch {} });
  if (storage.ghostEnabled) {
    try { PresenceActions?.updateStatus?.({ status: storage.settings?.defaultStatus || "online" }); } catch {}
  }
}
