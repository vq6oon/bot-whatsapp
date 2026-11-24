import {
  downloadYoutube,
  isYoutubeUrl,
  removeDownloadedFile,
  youtubeDownloadError,
} from "../src/services/youtube.js";

export const name = "ytm";

const FORMAT_HINT = "Format: .ytm <url>";

export function match(ctx) {
  return /^\.ytm(?:\s|$)/.test(ctx.text);
}

export async function run(
  { text, sock, from, sendText },
  download = downloadYoutube,
  removeFile = removeDownloadedFile,
) {
  const args = text.trim().split(/\s+/).slice(1);
  if (args.length !== 1) return sendText(FORMAT_HINT);
  const [url] = args;
  if (!isYoutubeUrl(url)) return sendText(`Kirim link YouTube. ${FORMAT_HINT}`);

  let media;
  try {
    try {
      media = await download(url, "mp3", "best");
    } catch (error) {
      console.error("ytm download:", error?.stderr || error?.message || error);
      return sendText(youtubeDownloadError(error));
    }
    if (!media?.buffer?.length) {
      return sendText("❌ Audio tidak bisa diunduh dari YouTube.");
    }

    try {
      return await sock.sendMessage(from, {
        audio: media.buffer,
        mimetype: media.mimeType || "audio/mpeg",
        fileName: media.fileName,
        ptt: false,
      });
    } catch (error) {
      console.error("ytm send:", error?.message || error);
      return sendText("❌ Gagal mengirim audio ke WhatsApp.");
    }
  } finally {
    if (media?.filePath) await removeFile(media.filePath).catch(() => {});
  }
}
