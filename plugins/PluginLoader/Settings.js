import { React, ReactNative } from "@vendetta/metro/common";
import { plugins, installPlugin, startPlugin, stopPlugin } from "@vendetta/plugins";
import { useProxy } from "@vendetta/storage";
import { showToast } from "@vendetta/ui/toasts";

const { View, Text, ScrollView, TouchableOpacity, Switch, ActivityIndicator } = ReactNative;

const ROW = {
  flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  paddingVertical: 14, paddingHorizontal: 16,
  borderBottomWidth: 0.5, borderBottomColor: "rgba(255,255,255,0.07)",
};
const SECTION = {
  color: "#7289DA", fontSize: 11, fontWeight: "700",
  letterSpacing: 1.2, paddingHorizontal: 16,
  paddingTop: 20, paddingBottom: 6, textTransform: "uppercase",
};
const CARD = {
  backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12,
  marginHorizontal: 12, marginBottom: 8, overflow: "hidden",
};

const BASE_URL = "https://woodbloom.github.io/revenge-plugins";

const CATALOG = [
  { key: "MoreAlts", emoji: "🔐", title: "MoreAlts", desc: "Secure multi-account switcher — AES-256 token encryption, PIN lock & biometrics." },
  { key: "GhostMode", emoji: "👻", title: "GhostMode", desc: "Go invisible & block typing indicators — toggle in the You Bar." },
  { key: "TokenGuard", emoji: "🛡️", title: "TokenGuard", desc: "Watches network requests and warns if your token is sent somewhere unknown." },
  { key: "Proxifier", emoji: "🔀", title: "Proxifier", desc: "Route Discord through your own proxy — hide your IP, bypass blocks." },
  { key: "MessageVault", emoji: "🗑️", title: "MessageVault", desc: "Local message logger — deleted messages stay visible, edits saved before/after." },
  { key: "NoTrack", emoji: "🚫", title: "NoTrack", desc: "Blocks Discord's telemetry, crash reporting & analytics requests before they leave your device." },
  { key: "StatusLock", emoji: "🔒", title: "StatusLock", desc: "Pins your online status so the app or other plugins can't quietly change it." },
  { key: "RPCGuard", emoji: "🎮", title: "RPCGuard", desc: "Stops Discord from broadcasting what you're playing/listening to." },
  { key: "QuickCopy", emoji: "📋", title: "QuickCopy", desc: "Slash commands to instantly copy user IDs, avatar URLs & server info." },
  { key: "FriendWatch", emoji: "👋", title: "FriendWatch", desc: "Logs friend adds/removes locally — see exactly who unfriended you." },
  { key: "GuildWatch", emoji: "🏠", title: "GuildWatch", desc: "Logs server joins/leaves & warns when a server suddenly renames/re-icons." },
  { key: "MentionLog", emoji: "🔔", title: "MentionLog", desc: "Keeps a local record of every mention, even ones that get deleted." },
].map(p => ({ ...p, url: `${BASE_URL}/${p.key}/` }));

function PluginRow({ entry, busy, onInstall, onToggle, onReinstall }) {
  const installed = !!entry.status;
  const enabled = entry.status?.enabled;

  return React.createElement(View, { style: ROW },
    React.createElement(View, { style: { flex: 1, paddingRight: 12 } },
      React.createElement(Text, { style: { color: "#fff", fontSize: 16, fontWeight: "600" } }, `${entry.emoji} ${entry.title}`),
      React.createElement(Text, { style: { color: "#aaa", fontSize: 12, marginTop: 2 } }, entry.desc),
      installed && React.createElement(TouchableOpacity, { onPress: onReinstall, disabled: busy, style: { marginTop: 6 } },
        React.createElement(Text, { style: { color: "#7289DA", fontSize: 12, fontWeight: "600" } }, busy ? "Working…" : "↻ Reinstall / Update")
      )
    ),
    busy
      ? React.createElement(ActivityIndicator, { size: "small", color: "#7289DA" })
      : installed
        ? React.createElement(Switch, {
            value: !!enabled,
            onValueChange: onToggle,
            trackColor: { true: "#43B581", false: "#555" },
          })
        : React.createElement(TouchableOpacity, {
            onPress: onInstall,
            style: { backgroundColor: "#7289DA", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 }
          },
            React.createElement(Text, { style: { color: "#fff", fontSize: 13, fontWeight: "700" } }, "⬇️ Install")
          )
  );
}

export default function PluginLoaderSettings({ storage }) {
  const s = useProxy(storage);
  const [, bump] = React.useState(0);
  const [busyKeys, setBusyKeys] = React.useState({});
  const refresh = () => bump(n => n + 1);
  const setBusy = (key, v) => setBusyKeys(prev => ({ ...prev, [key]: v }));

  const doInstall = async (p) => {
    setBusy(p.key, true);
    try {
      await installPlugin(p.url, true);
      showToast(`${p.title} installed`, 0);
    } catch (e) {
      showToast(`Failed to install ${p.title}: ${e?.message || e}`, 0);
    } finally {
      setBusy(p.key, false);
      refresh();
    }
  };

  const doToggle = async (p, value) => {
    setBusy(p.key, true);
    try {
      if (value) await startPlugin(p.url);
      else stopPlugin(p.url, true);
    } catch (e) {
      showToast(`Failed: ${e?.message || e}`, 0);
    } finally {
      setBusy(p.key, false);
      refresh();
    }
  };

  const installAll = async () => {
    for (const p of CATALOG) {
      if (plugins[p.url]) continue;
      await doInstall(p);
    }
    showToast("Install All done", 0);
  };

  const updateAll = async () => {
    for (const p of CATALOG) {
      if (!plugins[p.url]) continue;
      await doInstall(p);
    }
    showToast("Update All done", 0);
  };

  const rows = CATALOG.map(p => ({ ...p, status: plugins[p.url] }));
  const installedCount = rows.filter(r => r.status).length;

  return React.createElement(ScrollView, { style: { flex: 1 } },

    React.createElement(Text, { style: SECTION }, `woodbloom plugins (${installedCount}/${rows.length} installed)`),
    React.createElement(View, { style: { flexDirection: "row", marginHorizontal: 12, marginBottom: 8 } },
      React.createElement(TouchableOpacity, {
        onPress: installAll,
        style: { flex: 1, marginRight: 8, backgroundColor: "#43B581", borderRadius: 10, paddingVertical: 12, alignItems: "center" }
      }, React.createElement(Text, { style: { color: "#fff", fontWeight: "700" } }, "⬇️ Install All")),
      React.createElement(TouchableOpacity, {
        onPress: updateAll,
        style: { flex: 1, backgroundColor: "#7289DA", borderRadius: 10, paddingVertical: 12, alignItems: "center" }
      }, React.createElement(Text, { style: { color: "#fff", fontWeight: "700" } }, "🔄 Update Installed")),
    ),

    React.createElement(View, { style: CARD },
      rows.map(p => React.createElement(PluginRow, {
        key: p.key,
        entry: p,
        busy: !!busyKeys[p.key],
        onInstall: () => doInstall(p),
        onToggle: (v) => doToggle(p, v),
        onReinstall: () => doInstall(p),
      }))
    ),

    React.createElement(Text, { style: SECTION }, "Settings"),
    React.createElement(View, { style: CARD },
      React.createElement(View, { style: ROW },
        React.createElement(View, { style: { flex: 1, paddingRight: 12 } },
          React.createElement(Text, { style: { color: "#fff", fontSize: 16, fontWeight: "600" } }, "Add to Settings Sidebar"),
          React.createElement(Text, { style: { color: "#aaa", fontSize: 12, marginTop: 2 } }, "Restart app to apply")
        ),
        React.createElement(Switch, {
          value: s.settings?.addToSidebar !== false,
          onValueChange: v => { s.settings.addToSidebar = v; showToast("Restart Discord to apply", 0); },
          trackColor: { true: "#7289DA", false: "#555" },
        })
      )
    ),

    React.createElement(View, { style: { height: 40 } })
  );
}
