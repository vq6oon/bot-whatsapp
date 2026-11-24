import { DRIVE } from "../src/config.js";
import { withQualitySuffix } from "../src/utils/filenames.js";
import {
  QUALITY_FLAGS,
  YOUTUBE_FORMAT_HINT,
  downloadYoutube,
  isYoutubeUrl,
  removeDownloadedFile,
  youtubeDownloadError,
} from "../src/services/youtube.js";

export const name = "yt";

const FORMAT_HINT = `Format: ${YOUTUBE_FORMAT_HINT}`;

export function match(ctx) {
  return /^\.yt(?:\s|$)/.test(ctx.text);
}

export function parseArguments(text) {
  const [, ...args] = text.trim().split(/\s+/);
  if (!args.length || args.length > 2) return { error: FORMAT_HINT };
  const [url, flag] = args;
  if (!isYoutubeUrl(url)) return { error: `Send a YouTube link. ${FORMAT_HINT}` };
  if (flag === undefined) return { url, quality: "best" };
  if (!flag.startsWith("--") || !QUALITY_FLAGS.has(flag.slice(2))) return { error: FORMAT_HINT };
  return { url, quality: flag.slice(2) };
}

export async function run(
  { text, sendText },
  download = downloadYoutube,
  removeFile = removeDownloadedFile,
  drive,
) {
  const parsed = parseArguments(text);
  if (parsed.error) return sendText(parsed.error);
  if (!drive && !DRIVE.folderId) {
    return sendText("✗ Google Drive folder is not configured. Set DRIVE_FOLDER_ID in .env.");
  }

  await sendText("Downloading video...");

  let media;
  try {
    try {
      media = await download(parsed.url, "mp4", parsed.quality);
    } catch (error) {
      console.error("yt download:", error?.stderr || error?.message || error);
      return sendText(youtubeDownloadError(error));
    }
    if (!media || (media.filePath ? !media.size : !media.buffer?.length)) {
      return sendText("✗ Could not download the video from YouTube.");
    }

    try {
      await sendText("Uploading to Google Drive...");
      const quality = parsed.quality === "best" ? "best" : `${parsed.quality}p`;
      const uploadName = withQualitySuffix(media.fileName, quality);
      let uploaded;
      if (drive) {
        const auth = await drive.authorize();
        uploaded = await drive.uploadToDrive(auth, media.filePath || media.buffer, uploadName, media.mimeType);
      } else {
        const { authorize, uploadToDrive } = await import("../src/services/drive.js");
        const auth = await authorize();
        uploaded = await uploadToDrive(auth, media.filePath, uploadName, media.mimeType);
      }
      const link = uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`;
      return await sendText(`✓ ${media.title} (${quality}) saved to Google Drive\n→ ${link}`);
    } catch (error) {
      console.error("yt Drive upload:", error?.message || error);
      return sendText("✗ Failed to save the download to Google Drive.");
    }
  } finally {
    if (media?.filePath) await removeFile(media.filePath).catch(() => {});
  }
}
