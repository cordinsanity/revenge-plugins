import "./polyfills.js";
import { findByProps } from "@vendetta/metro";
import { ReactNative } from "@vendetta/metro/common";
import JSZip from "jszip";

const RestAPI = findByProps("getAPIBaseURL", "get");
const { NativeModules } = ReactNative;

function base64FromArrayBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function fetchAllMessages(channelId, { maxMessages, onProgress }) {
  const messages = [];
  let before;

  while (messages.length < maxMessages) {
    const res = await RestAPI.get({
      url: `/channels/${channelId}/messages`,
      query: { limit: 100, ...(before ? { before } : {}) },
    });
    const batch = res?.body || [];
    if (!batch.length) break;

    messages.push(...batch);
    before = batch[batch.length - 1].id;
    onProgress?.(messages.length);

    if (batch.length < 100) break;
    // Small delay between pages so a big export doesn't hammer the API.
    await new Promise(r => setTimeout(r, 350));
  }

  return messages;
}

async function downloadAttachment(url) {
  try {
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    return base64FromArrayBuffer(buffer);
  } catch {
    return null;
  }
}

export async function exportChannelChat(channelId, { includeMedia = true, maxMessages = 1000, onProgress } = {}) {
  if (!RestAPI?.get) throw new Error("Discord's internal API module wasn't found on this version.");
  if (!channelId) throw new Error("No channel ID provided.");

  onProgress?.({ phase: "fetching", count: 0 });
  const messages = await fetchAllMessages(channelId, {
    maxMessages,
    onProgress: count => onProgress?.({ phase: "fetching", count }),
  });
  messages.reverse();

  const zip = new JSZip();

  const lines = messages.map(m => {
    const time = new Date(m.timestamp).toLocaleString();
    const author = m.author ? `${m.author.username}${m.author.discriminator && m.author.discriminator !== "0" ? "#" + m.author.discriminator : ""}` : "unknown";
    const edited = m.edited_timestamp ? " (edited)" : "";
    const attachmentNote = m.attachments?.length ? ` [${m.attachments.length} attachment(s)]` : "";
    return `[${time}] ${author}${edited}: ${m.content || ""}${attachmentNote}`;
  });

  zip.file("messages.txt", lines.join("\n"));
  zip.file("messages.json", JSON.stringify(messages, null, 2));
  zip.file("export-info.json", JSON.stringify({
    channelId,
    exportedAt: new Date().toISOString(),
    messageCount: messages.length,
    includesMedia: includeMedia,
  }, null, 2));

  if (includeMedia) {
    const mediaFolder = zip.folder("media");
    const allAttachments = messages.flatMap(m => (m.attachments || []).map(a => ({ message: m, attachment: a })));

    let done = 0;
    for (const { message, attachment } of allAttachments) {
      const data = await downloadAttachment(attachment.url);
      if (data) {
        const safeName = (attachment.filename || `file_${attachment.id}`).replace(/[/\\]/g, "_");
        mediaFolder.file(`${message.id}_${safeName}`, data, { base64: true });
      }
      done++;
      onProgress?.({ phase: "media", count: done, total: allAttachments.length });
    }
  }

  onProgress?.({ phase: "zipping" });
  const base64Zip = await zip.generateAsync({ type: "base64" });

  const fileManager = NativeModules?.DCDFileManager;
  if (!fileManager?.writeFile) {
    throw new Error("No file-saving module found on this device/version — couldn't write to Downloads.");
  }

  const fileName = `messagevault-export-${channelId}-${Date.now()}.zip`;
  await fileManager.writeFile("downloads", fileName, base64Zip, "base64");

  onProgress?.({ phase: "done" });
  return { fileName, messageCount: messages.length };
}
