import { React, ReactNative } from "@vendetta/metro/common";
import { useProxy } from "@vendetta/plugin";
import { showToast } from "@vendetta/ui/toasts";
import { showConfirmationAlert } from "@vendetta/ui/alerts";

const { View, Text, Switch, ScrollView, TouchableOpacity } = ReactNative;

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

function LogEntry({ entry, onDelete }) {
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
      ? React.createElement(Text, { style: { color: "#ccc", fontSize: 12, marginTop: 4 } }, entry.content || "*(no text content)*")
      : React.createElement(View, { style: { marginTop: 4 } },
          React.createElement(Text, { style: { color: "#888", fontSize: 11 } }, "before:"),
          React.createElement(Text, { style: { color: "#ccc", fontSize: 12, marginBottom: 4 } }, entry.before || "*(empty)*"),
          React.createElement(Text, { style: { color: "#888", fontSize: 11 } }, "after:"),
          React.createElement(Text, { style: { color: "#ccc", fontSize: 12 } }, entry.after || "*(empty)*")
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
          React.createElement(LogEntry, { key: entry.id, entry, onDelete: deleteEntry })
        ),

    React.createElement(View, { style: { height: 40 } })
  );
}
