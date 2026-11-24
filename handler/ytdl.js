import { URL } from "node:url";
import { DRIVE } from "../src/config.js";
import { MAX_DRIVE_UPLOAD_BYTES, downloadYoutube, removeDownloadedFile } from "../src/services/youtube.js";

export const name = "ytdl";

export function match(ctx) {
  return /^\.ytdl(?:\s|$)/.test(ctx.text);
}

export async function run(
  { text, sock, from, sendText },
  download = downloadYoutube,
  removeFile = removeDownloadedFile,
  drive,
) {
  const [, url, firstArg = "best", secondArg, ...rest] = text.trim().split(/\s+/);
  let hostname;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    hostname = "";
  }
  if (!hostname || !(hostname === "youtube.com" || hostname.endsWith(".youtube.com") || hostname === "youtu.be")) {
    return sendText("Kirim link YouTube. Format: .ytdl <url> [360|720|1080|best] atau .ytdl <url> mp3");
  }

  let requestedQuality = "best";
  let mode = "mp4";
  let extra = [];
  if (firstArg === "mp3") {
    mode = "mp3";
    extra = [secondArg, ...rest].filter(Boolean);
  } else if (firstArg === "mp4") {
    requestedQuality = secondArg || "best";
    extra = rest;
  } else {
    requestedQuality = firstArg;
    extra = [secondArg, ...rest].filter(Boolean);
  }
  if (!new Set(["best", "360", "720", "1080"]).has(requestedQuality) || extra.length) {
    return sendText("Format: .ytdl <url> [360|720|1080|best] atau .ytdl <url> mp3");
  }
  if (mode === "mp3" && requestedQuality !== "best") {
    return sendText("Resolusi video hanya berlaku untuk MP4.");
  }

  let media;
  try {
    media = await download(url, mode, requestedQuality);
    if (!media || (media.filePath ? !media.size : !media.buffer?.length)) {
      return sendText("❌ Video tidak bisa diunduh dari YouTube.");
    }

    const caption = `YouTube · ${mode.toUpperCase()}\n\n${media.title}\n${url}`;
    if (mode === "mp4") {
      try {
        let uploaded;
        if (drive) {
          const auth = await drive.authorize();
          uploaded = await drive.uploadToDrive(auth, media.filePath || media.buffer, media.fileName, media.mimeType);
        } else {
          if (!DRIVE.folderId) return sendText("❌ Folder Google Drive belum dikonfigurasi.");
          const { authorize, uploadToDrive } = await import("../src/services/drive.js");
          const auth = await authorize();
          uploaded = await uploadToDrive(auth, media.filePath || media.buffer, media.fileName, media.mimeType);
        }
        const link = uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`;
        return await sendText(`✅ ${media.title} tersimpan di Google Drive\n🔗 ${link}`);
      } catch (error) {
        console.error("ytdl Drive upload:", error?.message || error);
        return sendText("❌ Gagal menyimpan hasil unduhan ke Google Drive.");
      }
    }
    if (mode === "mp3" && media.buffer.length < MAX_DRIVE_UPLOAD_BYTES && !drive) {
      if (!DRIVE.folderId) return sendText("❌ Folder Google Drive belum dikonfigurasi.");
      try {
        const { authorize, uploadToDrive } = await import("../src/services/drive.js");
        const auth = await authorize();
        const uploaded = await uploadToDrive(auth, media.buffer, media.fileName, media.mimeType);
        const link = uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`;
        return await sendText(`✅ ${media.title} tersimpan di Google Drive\n🔗 ${link}`);
      } catch (error) {
        console.error("ytdl Drive upload:", error?.message || error);
        return sendText("❌ Gagal menyimpan hasil unduhan ke Google Drive.");
      }
    }
    if (mode === "mp3") {
      return await sock.sendMessage(from, {
        audio: media.buffer,
        mimetype: media.mimeType || "audio/mpeg",
        fileName: media.fileName,
        ptt: false,
        caption,
      });
    }
    return await sock.sendMessage(from, {
      document: media.buffer,
      mimetype: media.mimeType || "video/mp4",
      fileName: media.fileName,
      caption,
    });

  } catch (error) {
    if (error?.code === 1) {
      console.error("ytdl download:", error?.stderr || error?.message || error);
      return sendText("❌ YouTube menolak unduhan atau format video tidak tersedia. Coba link video publik lain.");
    }
    console.error("ytdl:", error?.message || error);
    return sendText("❌ Gagal mengunduh atau mengunggah media. Periksa YouTube dan koneksi Google Drive.");
  } finally {
    if (media?.filePath) await removeFile(media.filePath).catch(() => {});
  }
}
