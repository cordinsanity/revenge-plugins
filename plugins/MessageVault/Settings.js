import { React, ReactNative } from "@vendetta/metro/common";
import { useProxy } from "@vendetta/plugin";
import { showToast } from "@vendetta/ui/toasts";
import { showConfirmationAlert } from "@vendetta/ui/alerts";
import { findByStoreName } from "@vendetta/metro";
import { decryptText } from "./CryptoUtils.js";
import { exportChannelChat } from "./ChatExport.js";

const SelectedChannelStore = findByStoreName("SelectedChannelStore");

const { View, Text, Switch, ScrollView, TouchableOpacity, TextInput } = ReactNative;

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

function ToggleRow({ label, sub, value, onToggle, accent }) {
  return React.createElement(View, { style: ROW },
    React.createElement(View, { style: { flex: 1, paddingRight: 12 } },
      React.createElement(Text, { style: { color: "#fff", fontSize: 16, fontWeight: "600" } }, label),
      sub && React.createElement(Text, { style: { color: "#aaa", fontSize: 12, marginTop: 2 } }, sub)
    ),
    React.createElement(Switch, {
      value: !!value,
      onValueChange: onToggle,
      trackColor: { true: accent || "#7289DA", false: "#555" },
    })
  );
}

function DecryptedText({ value, encKey, style }) {
  const [text, setText] = React.useState(value);

  React.useEffect(() => {
    let cancelled = false;
    if (typeof value === "string" && value.startsWith("enc:")) {
      setText("Entschlüsseln…");
      decryptText(value, encKey).then(plain => {
        if (!cancelled) setText(plain);
      });
    } else {
      setText(value);
    }
    return () => { cancelled = true; };
  }, [value, encKey]);

  return React.createElement(Text, { style }, text);
}

function LogEntry({ entry, onDelete, encKey }) {
  const isDelete = entry.kind === "delete";
  return React.createElement(View, {
    style: {
      backgroundColor: isDelete ? "rgba(240,71,71,0.1)" : "rgba(250,166,26,0.1)",
      padding: 10, marginHorizontal: 12, marginBottom: 4,
      borderRadius: 8, borderLeftWidth: 3,
      borderLeftColor: isDelete ? "#F04747" : "#FAA61A",
    }
  },
    React.createElement(View, { style: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" } },
      React.createElement(Text, { style: { color: isDelete ? "#F04747" : "#FAA61A", fontSize: 12, fontWeight: "700" } },
        `${isDelete ? "🗑️ DELETED" : "✏️ EDITED"} — ${entry.authorTag}`
      ),
      React.createElement(TouchableOpacity, { onPress: () => onDelete(entry.id) },
        React.createElement(Text, { style: { color: "#888", fontSize: 14, paddingHorizontal: 6 } }, "✕")
      )
    ),
    isDelete
      ? React.createElement(DecryptedText, { value: entry.content || "*(no text content)*", encKey, style: { color: "#ccc", fontSize: 12, marginTop: 4 } })
      : React.createElement(View, { style: { marginTop: 4 } },
          React.createElement(Text, { style: { color: "#888", fontSize: 11 } }, "before:"),
          React.createElement(DecryptedText, { value: entry.before || "*(empty)*", encKey, style: { color: "#ccc", fontSize: 12, marginBottom: 4 } }),
          React.createElement(Text, { style: { color: "#888", fontSize: 11 } }, "after:"),
          React.createElement(DecryptedText, { value: entry.after || "*(empty)*", encKey, style: { color: "#ccc", fontSize: 12 } })
        ),
    entry.attachments?.length > 0 &&
      React.createElement(Text, { style: { color: "#555", fontSize: 10, marginTop: 4 } }, `${entry.attachments.length} attachment(s)`),
    React.createElement(Text, { style: { color: "#555", fontSize: 10, marginTop: 4 } },
      `${new Date(entry.time).toLocaleString()} — channel ${entry.channelId}`
    )
  );
}

export default function MessageVaultSettings({ storage }) {
  const s = useProxy(storage);
  const log = s.log || [];
  const deletes = log.filter(l => l.kind === "delete").length;
  const edits = log.filter(l => l.kind === "edit").length;

  const [exportChannelId, setExportChannelId] = React.useState(() => {
    try { return SelectedChannelStore?.getChannelId?.() || ""; } catch { return ""; }
  });
  const [includeMedia, setIncludeMedia] = React.useState(true);
  const [maxMessages, setMaxMessages] = React.useState("1000");
  const [exporting, setExporting] = React.useState(false);
  const [exportStatus, setExportStatus] = React.useState("");

  const deleteEntry = (id) => {
    s.log = (s.log || []).filter(e => e.id !== id);
  };

  const clearAll = () => {
    showConfirmationAlert({
      title: "Clear log",
      content: "Delete all recorded edits & deletions? This cannot be undone.",
      confirmText: "Clear all",
      cancelText: "Cancel",
      onConfirm: () => { s.log = []; showToast("MessageVault log cleared", 0); },
    });
  };

  const disableEncryption = () => {
    showConfirmationAlert({
      title: "⚠️ Warning (1/3)",
      content: "Turning off encryption means new deleted/edited message content gets saved as PLAIN TEXT in this plugin's local storage. Anyone with file access to your device could read it.",
      confirmText: "Continue",
      cancelText: "Keep encryption on",
      onConfirm: () => {
        showConfirmationAlert({
          title: "⚠️ Warning (2/3)",
          content: "This is especially sensitive for private (DM) conversations. Already-encrypted entries stay encrypted, but anything logged after this point will not be protected.",
          confirmText: "Continue",
          cancelText: "Keep encryption on",
          onConfirm: () => {
            showConfirmationAlert({
              title: "⚠️ Warning (3/3) — Final confirmation",
              content: "Are you absolutely sure you want to disable encryption for the message log?",
              confirmText: "Yes, disable encryption",
              cancelText: "Keep encryption on",
              onConfirm: () => {
                s.settings.encryptLog = false;
                showToast("Encryption disabled for new log entries", 0);
              },
            });
          },
        });
      },
    });
  };

  const enableRemoteSync = () => {
    showConfirmationAlert({
      title: "⚠️ Remote backup warning",
      content: "Every logged entry will be sent to the server URL below. Only use a server you fully control and trust — it will receive private message content. Sending a lot of data can overload small or free servers, so use this carefully.",
      confirmText: "I understand, enable",
      cancelText: "Cancel",
      onConfirm: () => { s.settings.enableRemoteSync = true; },
    });
  };

  const enableGuildLogging = () => {
    showConfirmationAlert({
      title: "⚠️ Storage warning",
      content: "Server channels are usually far busier than DMs. Logging their edits/deletions too can fill up your device's internal storage much faster. Consider lowering \"Max log entries\" if you enable this.",
      confirmText: "I understand, enable",
      cancelText: "Cancel",
      onConfirm: () => { s.settings.logGuildMessages = true; },
    });
  };

  const runExport = async () => {
    const channelId = exportChannelId.trim();
    if (!channelId) { showToast("Enter a channel ID first", 0); return; }

    setExporting(true);
    setExportStatus("Starting…");
    try {
      const result = await exportChannelChat(channelId, {
        includeMedia,
        maxMessages: Math.max(1, Math.min(10000, parseInt(maxMessages, 10) || 1000)),
        onProgress: p => {
          if (p.phase === "fetching") setExportStatus(`Fetching messages… (${p.count})`);
          else if (p.phase === "media") setExportStatus(`Downloading media… (${p.count}/${p.total})`);
          else if (p.phase === "zipping") setExportStatus("Building ZIP…");
          else if (p.phase === "done") setExportStatus("Done!");
        },
      });
      showToast(`Saved ${result.fileName} to Downloads (${result.messageCount} messages)`, 0);
    } catch (e) {
      showToast(`Export failed: ${e?.message || e}`, 0);
    } finally {
      setExporting(false);
    }
  };

  const startExport = () => {
    showConfirmationAlert({
      title: "⚠️ Export warning",
      content: includeMedia
        ? "This downloads the channel's message history plus all images/videos into a ZIP file. Media-heavy or long chats can take a while and use a fair amount of storage and data."
        : "This downloads the channel's message history into a ZIP file (text only).",
      confirmText: "Start export",
      cancelText: "Cancel",
      onConfirm: runExport,
    });
  };

  return React.createElement(ScrollView, { style: { flex: 1 } },

    React.createElement(View, {
      style: {
        margin: 12, padding: 14, borderRadius: 12,
        backgroundColor: "rgba(114,137,218,0.1)",
        borderWidth: 1, borderColor: "#7289DA",
        alignItems: "center",
      }
    },
      React.createElement(Text, { style: { fontSize: 32, marginBottom: 4 } }, "🗄️"),
      React.createElement(Text, { style: { color: "#7289DA", fontWeight: "700", fontSize: 15 } },
        `${deletes} deleted · ${edits} edited`
      ),
      React.createElement(Text, { style: { color: "#aaa", fontSize: 12, marginTop: 2 } },
        "Stored locally in this plugin's data — never leaves your device"
      )
    ),

    React.createElement(Text, { style: SECTION }, "Logging"),
    React.createElement(View, { style: CARD },
      React.createElement(ToggleRow, {
        label: "Log deleted messages",
        sub: "Save content of messages before they disappear",
        value: s.settings.logDeletes !== false,
        onToggle: v => { s.settings.logDeletes = v; },
      }),
      React.createElement(ToggleRow, {
        label: "Keep deleted messages visible",
        sub: "Show them struck through (🗑️) instead of disappearing",
        value: s.settings.keepDeletedVisible !== false,
        onToggle: v => { s.settings.keepDeletedVisible = v; },
        accent: "#F04747",
      }),
      React.createElement(ToggleRow, {
        label: "Log edited messages",
        sub: "Save before/after content whenever a message is edited",
        value: s.settings.logEdits !== false,
        onToggle: v => { s.settings.logEdits = v; },
        accent: "#FAA61A",
      }),
      React.createElement(ToggleRow, {
        label: "Also log server messages",
        sub: "Off by default — servers are much busier than DMs and can fill up storage faster",
        value: s.settings.logGuildMessages === true,
        onToggle: v => { if (v) { enableGuildLogging(); } else { s.settings.logGuildMessages = false; } },
        accent: "#F04747",
      }),
    ),

    React.createElement(Text, { style: SECTION }, "General"),
    React.createElement(View, { style: CARD },
      React.createElement(ToggleRow, {
        label: "Add \"Message Logger\" to settings sidebar",
        sub: "Adds a quick-access button below Account Switcher — restart app to apply",
        value: s.settings.addToSidebar !== false,
        onToggle: v => {
          s.settings.addToSidebar = v;
          showToast("Restart app to apply sidebar changes", 0);
        },
        accent: "#43B581",
      }),
    ),

    React.createElement(Text, { style: SECTION }, "Security"),
    React.createElement(View, { style: CARD },
      React.createElement(ToggleRow, {
        label: "Encrypt stored log (AES-256)",
        sub: "On by default — encrypts deleted/edited content at rest, especially important for DMs",
        value: s.settings.encryptLog !== false,
        onToggle: v => { if (v) { s.settings.encryptLog = true; } else { disableEncryption(); } },
        accent: "#43B581",
      }),
    ),

    React.createElement(Text, { style: SECTION }, "Remote backup (optional)"),
    React.createElement(View, { style: CARD },
      React.createElement(ToggleRow, {
        label: "Enable remote server backup",
        sub: "Off by default — sends each log entry to a server you control. Can overload small servers, use with caution",
        value: s.settings.enableRemoteSync === true,
        onToggle: v => { if (v) { enableRemoteSync(); } else { s.settings.enableRemoteSync = false; } },
        accent: "#F04747",
      }),
      s.settings.enableRemoteSync &&
        React.createElement(View, { style: { padding: 12 } },
          React.createElement(Text, { style: { color: "#888", fontSize: 11, marginBottom: 4 } }, "Server URL"),
          React.createElement(TextInput, {
            value: s.settings.remoteServerUrl || "",
            onChangeText: v => { s.settings.remoteServerUrl = v; },
            placeholder: "https://your-own-server.example/log",
            placeholderTextColor: "#666",
            style: {
              color: "#fff", backgroundColor: "rgba(255,255,255,0.07)",
              borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13,
            },
          })
        ),
    ),

    React.createElement(Text, { style: SECTION }, "Chat export"),
    React.createElement(View, { style: CARD },
      React.createElement(View, { style: { padding: 12 } },
        React.createElement(Text, { style: { color: "#888", fontSize: 11, marginBottom: 4 } }, "Channel ID"),
        React.createElement(TextInput, {
          value: exportChannelId,
          onChangeText: setExportChannelId,
          placeholder: "Right-click a chat → Copy Channel ID",
          placeholderTextColor: "#666",
          editable: !exporting,
          style: {
            color: "#fff", backgroundColor: "rgba(255,255,255,0.07)",
            borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, marginBottom: 10,
          },
        }),
        React.createElement(Text, { style: { color: "#888", fontSize: 11, marginBottom: 4 } }, "Max messages"),
        React.createElement(TextInput, {
          value: maxMessages,
          onChangeText: setMaxMessages,
          keyboardType: "numeric",
          editable: !exporting,
          style: {
            color: "#fff", backgroundColor: "rgba(255,255,255,0.07)",
            borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, marginBottom: 10, width: 100,
          },
        })
      ),
      React.createElement(ToggleRow, {
        label: "Include images/videos",
        sub: "Downloads attachments into the ZIP too — bigger file, takes longer",
        value: includeMedia,
        onToggle: setIncludeMedia,
        accent: "#7289DA",
      }),
      React.createElement(View, { style: { padding: 12 } },
        React.createElement(TouchableOpacity, {
          disabled: exporting,
          onPress: startExport,
          style: {
            backgroundColor: exporting ? "#444" : "#7289DA",
            borderRadius: 8, paddingVertical: 10, alignItems: "center",
          },
        },
          React.createElement(Text, { style: { color: "#fff", fontWeight: "700", fontSize: 14 } },
            exporting ? "Exporting…" : "Export chat as ZIP"
          )
        ),
        exportStatus && React.createElement(Text, { style: { color: "#888", fontSize: 12, marginTop: 6, textAlign: "center" } }, exportStatus),
        React.createElement(Text, { style: { color: "#555", fontSize: 11, marginTop: 6 } },
          "Saves messages.txt, messages.json and (optionally) media as a .zip file to your device's Downloads folder. Useful for keeping evidence/backups outside the app."
        )
      )
    ),

    React.createElement(View, {
      style: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6 }
    },
      React.createElement(Text, { style: { color: "#7289DA", fontSize: 11, fontWeight: "700", letterSpacing: 1.2, flex: 1, textTransform: "uppercase" } }, "Log"),
      React.createElement(TouchableOpacity, { onPress: clearAll },
        React.createElement(Text, { style: { color: "#F04747", fontSize: 13 } }, "🗑 Clear all")
      )
    ),

    log.length === 0
      ? React.createElement(Text, { style: { color: "#444", textAlign: "center", padding: 28 } }, "Nothing logged yet")
      : log.slice(0, 100).map(entry =>
          React.createElement(LogEntry, { key: entry.id, entry, onDelete: deleteEntry, encKey: s.settings.logEncryptionKey })
        ),

    React.createElement(View, { style: { height: 40 } })
  );
}
