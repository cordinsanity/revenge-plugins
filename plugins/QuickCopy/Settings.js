import { React, ReactNative } from "@vendetta/metro/common";

const { View, Text, ScrollView } = ReactNative;

const SECTION = {
  color: "#7289DA", fontSize: 11, fontWeight: "700",
  letterSpacing: 1.2, paddingHorizontal: 16,
  paddingTop: 20, paddingBottom: 6, textTransform: "uppercase",
};
const CARD = {
  backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12,
  marginHorizontal: 12, marginBottom: 8, overflow: "hidden",
  paddingVertical: 14, paddingHorizontal: 16,
};

function CommandRow({ cmd, desc }) {
  return React.createElement(View, { style: { marginBottom: 10 } },
    React.createElement(Text, { style: { color: "#fff", fontSize: 15, fontWeight: "600" } }, cmd),
    React.createElement(Text, { style: { color: "#aaa", fontSize: 12, marginTop: 2 } }, desc)
  );
}

export default function QuickCopySettings() {
  return React.createElement(ScrollView, { style: { flex: 1 } },

    React.createElement(Text, { style: SECTION }, "Commands"),
    React.createElement(View, { style: CARD },
      React.createElement(CommandRow, { cmd: "/uid [user]", desc: "Copy your own or another user's ID" }),
      React.createElement(CommandRow, { cmd: "/avatar [user]", desc: "Copy your own or another user's avatar URL" }),
      React.createElement(CommandRow, { cmd: "/serverid", desc: "Copy the current server's ID" }),
      React.createElement(CommandRow, { cmd: "/servericon", desc: "Copy the current server's icon URL" }),
    ),

    React.createElement(Text, { style: SECTION }, "About"),
    React.createElement(View, { style: CARD },
      React.createElement(Text, { style: { color: "#aaa", fontSize: 13, lineHeight: 18 } },
        "QuickCopy has no settings to configure — just type one of the commands above in any channel. Results are copied straight to your clipboard."
      )
    ),

    React.createElement(View, { style: { height: 40 } })
  );
}
