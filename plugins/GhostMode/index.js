import { after, before } from "@vendetta/patcher";
import { findByProps, findByDisplayName, findByStoreName } from "@vendetta/metro";
import { findInReactTree } from "@vendetta/utils";
import { React } from "@vendetta/metro/common";
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
const TypingActions = findByProps("startTyping", "stopTyping");
const ChannelActions = findByProps("ack", "batchAck");
const { TouchableOpacity, View, Text } = findByProps("TouchableOpacity") || {};

const patches = [];

function setGhostMode(enabled) {
  storage.ghostEnabled = enabled;
  try {
    if (PresenceActions?.updateStatus) {
      PresenceActions.updateStatus({ status: enabled ? "invisible" : (storage.settings.defaultStatus || "online") });
    }
  } catch {}
  showToast(enabled ? "👻 Ghost Mode AN" : "👤 Ghost Mode AUS", 0);
}

function GhostButton() {
  const s = useProxy(storage);
  const active = s.ghostEnabled;

  return React.createElement(
    TouchableOpacity,
    {
      onPress: () => setGhostMode(!active),
      onLongPress: () => showToast(`Ghost: ${active ? "AN" : "AUS"} — Tipps blockiert: ${s.settings.blockTyping ? "ja" : "nein"}`, 0),
      accessibilityLabel: "Ghost Mode Toggle",
      style: {
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 22,
        backgroundColor: active ? "rgba(114,137,218,0.25)" : "transparent",
        marginRight: 4,
      }
    },
    React.createElement(
      Text,
      { style: { fontSize: 20, lineHeight: 24 } },
      active ? "👻" : "👤"
    )
  );
}

function tryPatchYouBar() {
  // Try common component names for the bottom user panel
  const candidates = [
    () => findByDisplayName("YouBar", false),
    () => findByDisplayName("UserPanel", false),
    () => findByDisplayName("ConnectedUserPanel", false),
    () => findByDisplayName("YouSection", false),
    () => findByProps("useShouldShowBell"),
    () => findByProps("renderBell", "renderAvatar"),
  ];

  for (const getter of candidates) {
    try {
      const mod = getter();
      if (!mod) continue;

      // The component might be mod itself or mod.default
      const target = mod;
      if (!target || typeof target.default !== "function") continue;

      const patch = after("default", target, ([props], res) => {
        if (!storage.settings?.showInYouBar || !res) return res;
        try {
          // Look for a row/container that holds the bell notification button
          const bellContainer = findInReactTree(res, node =>
            node?.props?.children &&
            Array.isArray(node.props.children) &&
            node.props.children.some?.(c =>
              c?.props?.accessibilityLabel?.toLowerCase().includes("notif") ||
              c?.props?.accessibilityLabel?.toLowerCase().includes("bell") ||
              c?.type?.displayName?.toLowerCase().includes("bell") ||
              c?.type?.displayName?.toLowerCase().includes("notif")
            )
          );

          if (bellContainer) {
            const kids = Array.isArray(bellContainer.props.children)
              ? [...bellContainer.props.children]
              : [bellContainer.props.children];
            // Insert ghost button before the bell
            kids.unshift(React.createElement(GhostButton, { key: "__ghost_btn__" }));
            bellContainer.props.children = kids;
          }
        } catch {}
        return res;
      });

      patches.push(patch);
      return true; // stop after first successful patch
    } catch {}
  }
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
    patches.push(before("batchAck", ChannelActions, () => {
      if (storage.ghostEnabled && storage.settings?.blockReadReceipts) return [undefined];
    }));
  }

  // Inject into YouBar
  if (storage.settings?.showInYouBar !== false) {
    tryPatchYouBar();
  }

  // If ghost was on before, re-enable it
  if (storage.ghostEnabled && PresenceActions?.updateStatus) {
    try { PresenceActions.updateStatus({ status: "invisible" }); } catch {}
  }
}

export function onUnload() {
  patches.forEach(p => { try { p(); } catch {} });
  // Restore visible status when plugin unloads
  if (storage.ghostEnabled && PresenceActions?.updateStatus) {
    try { PresenceActions.updateStatus({ status: storage.settings?.defaultStatus || "online" }); } catch {}
  }
}
