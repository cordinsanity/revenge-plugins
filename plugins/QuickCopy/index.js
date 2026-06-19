import { registerCommand } from "@vendetta/commands";
import { findByStoreName } from "@vendetta/metro";
import { clipboard } from "@vendetta/metro/common";
import { showToast } from "@vendetta/ui/toasts";
import { React } from "@vendetta/metro/common";
import QuickCopySettings from "./Settings.js";

const UserStore = findByStoreName("UserStore");
const SelectedGuildStore = findByStoreName("SelectedGuildStore");
const GuildStore = findByStoreName("GuildStore");

const authorMods = {
  author: {
    username: "QuickCopy by woodbloom",
    avatar: "command",
  },
};

function sendMessage() {
  if (window.sendMessage) return window.sendMessage?.(...arguments);
}

function avatarUrl(user) {
  if (!user) return null;
  if (!user.avatar) {
    const idx = Number(user.discriminator) % 5 || 0;
    return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
  }
  const ext = user.avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=512`;
}

function resolveUser(idInput) {
  if (!idInput) return UserStore?.getCurrentUser?.();
  try { return UserStore?.getUser?.(idInput.trim()); } catch { return null; }
}

function copyAndConfirm(ctx, title, value, label) {
  if (!value) {
    sendMessage?.({
      loggingName: "QuickCopy error",
      channelId: ctx.channel.id,
      embeds: [{ type: "rich", title: "❌ Nothing to copy", description: `Could not resolve ${label}.` }],
    }, authorMods);
    showToast(`Could not resolve ${label}`, 1);
    return;
  }
  clipboard.setString(value);
  sendMessage?.({
    loggingName: "QuickCopy result",
    channelId: ctx.channel.id,
    embeds: [{ type: "rich", title, description: `\`${value}\`\n\nCopied to clipboard.` }],
  }, authorMods);
  showToast(`Copied ${label}`, 0);
}

const commands = {
  async uid(args, ctx) {
    try {
      const options = new Map(args.map(a => [a.name, a]));
      const user = resolveUser(options.get("user")?.value);
      copyAndConfirm(ctx, "🆔 User ID", user?.id, "user ID");
    } catch (e) {
      console.error("[QuickCopy] uid failed:", e);
      showToast("Failed to copy user ID", 1);
    }
  },
  async avatar(args, ctx) {
    try {
      const options = new Map(args.map(a => [a.name, a]));
      const user = resolveUser(options.get("user")?.value);
      copyAndConfirm(ctx, "🖼️ Avatar URL", avatarUrl(user), "avatar URL");
    } catch (e) {
      console.error("[QuickCopy] avatar failed:", e);
      showToast("Failed to copy avatar URL", 1);
    }
  },
  async serverId(args, ctx) {
    try {
      const guildId = SelectedGuildStore?.getGuildId?.();
      copyAndConfirm(ctx, "🏠 Server ID", guildId, "server ID");
    } catch (e) {
      console.error("[QuickCopy] serverId failed:", e);
      showToast("Failed to copy server ID", 1);
    }
  },
  async serverIcon(args, ctx) {
    try {
      const guildId = SelectedGuildStore?.getGuildId?.();
      const guild = guildId ? GuildStore?.getGuild?.(guildId) : null;
      const url = guild?.icon
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${guild.icon.startsWith("a_") ? "gif" : "png"}?size=512`
        : null;
      copyAndConfirm(ctx, "🏠 Server Icon URL", url, "server icon URL");
    } catch (e) {
      console.error("[QuickCopy] serverIcon failed:", e);
      showToast("Failed to copy server icon URL", 1);
    }
  },
};

const USER_OPTION = {
  required: false,
  type: 3,
  name: "user",
  description: "User ID to look up (leave empty for yourself)",
};

export const settings = (props) => React.createElement(QuickCopySettings, props);

export function onLoad() {
  const commandsToRegister = [
    { type: 1, inputType: 1, applicationId: "-1", execute: commands.uid, name: "uid", description: "Copy a user ID to your clipboard", options: [USER_OPTION] },
    { type: 1, inputType: 1, applicationId: "-1", execute: commands.avatar, name: "avatar", description: "Copy an avatar URL to your clipboard", options: [USER_OPTION] },
    { type: 1, inputType: 1, applicationId: "-1", execute: commands.serverId, name: "serverid", description: "Copy the current server's ID to your clipboard", options: [] },
    { type: 1, inputType: 1, applicationId: "-1", execute: commands.serverIcon, name: "servericon", description: "Copy the current server's icon URL to your clipboard", options: [] },
  ];

  commandsToRegister.forEach(command => {
    try { registerCommand(command); }
    catch (e) { console.error(`[QuickCopy] Failed to register command ${command.name}:`, e); }
  });
}

export function onUnload() {}
