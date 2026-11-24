import { DRIVE } from "../src/config.js";
import { downloadOwnBuffer, downloadQuotedBuffer } from "../src/services/media.js";
import * as driveService from "../src/services/drive.js";

export const name = "upload";

export function match(ctx) {
  return /^\.upload(?:\s|$)/.test(ctx.text);
}

function getMedia(message) {
  return message?.imageMessage || message?.videoMessage || message?.audioMessage ||
    message?.documentMessage || message?.stickerMessage;
}

function inferFileName(media, mimeType, timestamp) {
  if (media?.fileName) return media.fileName;
  const extension = mimeType?.split("/")[1]?.split(";")[0]?.replace(/^x-/, "") || "bin";
  return `whatsapp-${timestamp}.${extension}`;
}

export async function run(
  { text, msg, quoted, quotedContext, sendText },
  drive = driveService,
  mediaService = { downloadOwnBuffer, downloadQuotedBuffer },
) {
  if (!DRIVE.folderId) {
    return sendText("⚠️ Isi DRIVE_FOLDER_ID di .env dengan ID folder Drive.");
  }

  const hasCaption = text.trim().length > ".upload".length;
  if (hasCaption && !text.startsWith(".upload ")) {
    return sendText("Format: kirim .upload bersama media atau balas media dengan .upload");
  }
  const customName = hasCaption ? text.slice(".upload".length).trim() : "";
  const quotedMedia = getMedia(quoted);
  const ownMedia = getMedia(msg?.message);
  const media = quotedMedia || ownMedia;
  if (!media) {
    return sendText("Kirim .upload bersama foto, video, audio, atau dokumen, atau balas media dengan .upload.");
  }

  try {
    const buffer = quotedMedia
      ? await mediaService.downloadQuotedBuffer(quoted, quotedContext)
      : await mediaService.downloadOwnBuffer(msg);
    if (!buffer?.length) return sendText("❌ Media kosong atau gagal diunduh.");

    const mimeType = media.mimetype || "application/octet-stream";
    const fileName = customName || inferFileName(media, mimeType, Date.now());
    const auth = await drive.authorize();
    const uploaded = await drive.uploadToDrive(auth, buffer, fileName, mimeType);
    const link = uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`;
    return sendText(`✅ File tersimpan di Google Drive\n\n*${uploaded.name || fileName}*\n🔗 ${link}`);
  } catch (error) {
    console.error("upload:", error?.message || error);
    if (error?.code === 401 || error?.response?.status === 401) {
      return sendText("❌ Token Google Drive ditolak. Jalankan ulang node get_token.js dan perbarui credentials/token.json.");
    }
    if (error?.code === 403 || error?.response?.status === 403) {
      return sendText("❌ Google menolak akses Drive. Pastikan Drive API aktif dan scope drive.file sudah diizinkan.");
    }
    return sendText("❌ Gagal mengunggah file ke Google Drive. Periksa koneksi, OAuth token, dan folder ID.");
  }
}
