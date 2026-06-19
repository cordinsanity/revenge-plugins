import { storage } from "@vendetta/plugin";
import { React } from "@vendetta/metro/common";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { before } from "@vendetta/patcher";
import { showToast } from "@vendetta/ui/toasts";
import GuildWatchSettings from "./Settings.js";

// Defaults
if (!storage.settings) storage.settings = {};
if (!storage.log) storage.log = [];
if (!storage.snapshots) storage.snapshots = {};
if (!storage._knownGuildIds) storage._knownGuildIds = [];
if (storage.settings.logJoinLeave === undefined) storage.settings.logJoinLeave = true;
if (storage.settings.warnOnRebrand === undefined) storage.settings.warnOnRebrand = true;
if (storage.settings.maxEntries === undefined) storage.settings.maxEntries = 300;

const FluxDispatcher = findByProps("dispatch", "subscribe");
const GuildStore = findByStoreName("GuildStore");

function addLog(entry) {
  const log = storage.log || [];
  log.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, time: Date.now(), ...entry });
  const max = storage.settings.maxEntries || 300;
  if (log.length > max) log.length = max;
  storage.log = log;
}

let unpatch = null;

export const settings = (props) => React.createElement(GuildWatchSettings, { ...props, storage });

export function onLoad() {
  if (!FluxDispatcher || !GuildStore) {
    console.error("[GuildWatch] FluxDispatcher or GuildStore not found");
    return;
  }

  // Seed known guilds on first run so the initial guild list at app start
  // never gets logged as a wave of "joins" — only genuinely new joins after
  // this point get recorded.
  if (!storage._seeded) {
    try {
      const guilds = GuildStore.getGuilds?.() || {};
      storage._knownGuildIds = Object.keys(guilds);
      for (const id of storage._knownGuildIds) {
        const g = guilds[id];
        storage.snapshots[id] = { name: g?.name, icon: g?.icon };
      }
      storage._seeded = true;
    } catch (e) {
      console.error("[GuildWatch] seeding failed:", e);
    }
  }

  unpatch = before("dispatch", FluxDispatcher, ([action]) => {
    if (!action?.type) return;

    try {
      if (action.type === "GUILD_CREATE") {
        const guild = action.guild;
        if (!guild?.id) return;
        const known = storage._knownGuildIds || [];
        if (known.includes(guild.id)) return; // re-sync after outage, not a real join

        storage._knownGuildIds = [...known, guild.id];
        storage.snapshots[guild.id] = { name: guild.name, icon: guild.icon };

        if (storage.settings.logJoinLeave) {
          addLog({ kind: "join", guildId: guild.id, guildName: guild.name });
          showToast(`📥 Joined ${guild.name}`, 0);
        }
      } else if (action.type === "GUILD_DELETE") {
        const guild = action.guild;
        if (!guild?.id || guild.unavailable) return; // outage, not a real leave/kick/ban

        const snap = storage.snapshots[guild.id];
        storage._knownGuildIds = (storage._knownGuildIds || []).filter(id => id !== guild.id);

        if (storage.settings.logJoinLeave) {
          addLog({ kind: "leave", guildId: guild.id, guildName: snap?.name || guild.id });
          showToast(`📤 Left/removed from ${snap?.name || "a server"}`, 0);
        }
        delete storage.snapshots[guild.id];
      } else if (action.type === "GUILD_UPDATE") {
        const guild = action.guild;
        if (!guild?.id || !storage.settings.warnOnRebrand) return;

        const snap = storage.snapshots[guild.id];
        if (snap && (snap.name !== guild.name || snap.icon !== guild.icon)) {
          addLog({
            kind: "rebrand",
            guildId: guild.id,
            guildName: guild.name,
            before: { name: snap.name, icon: snap.icon },
            after: { name: guild.name, icon: guild.icon },
          });
          showToast(`⚠️ "${snap.name}" changed its name/icon to "${guild.name}"`, 1);
        }
        storage.snapshots[guild.id] = { name: guild.name, icon: guild.icon };
      }
    } catch (e) {
      console.error("[GuildWatch] dispatch handler error:", e);
    }
  });
}

export function onUnload() {
  try { unpatch?.(); } catch {}
}
