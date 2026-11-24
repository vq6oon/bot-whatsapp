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
  if (!isYoutubeUrl(url)) return sendText(`Send a YouTube link. ${FORMAT_HINT}`);

  await sendText("· Downloading audio...");

  let media;
  try {
    try {
      media = await download(url, "mp3", "best");
    } catch (error) {
      console.error("ytm download:", error?.stderr || error?.message || error);
      return sendText(youtubeDownloadError(error));
    }
    if (!media?.buffer?.length) {
      return sendText("✗ Could not download the audio from YouTube.");
    }

    try {
      await sendText("· Sending audio...");
      return await sock.sendMessage(from, {
        audio: media.buffer,
        mimetype: media.mimeType || "audio/mpeg",
        fileName: media.fileName,
        ptt: false,
      });
    } catch (error) {
      console.error("ytm send:", error?.message || error);
      return sendText("✗ Failed to send the audio to WhatsApp.");
    }
  } finally {
    if (media?.filePath) await removeFile(media.filePath).catch(() => {});
  }
}
