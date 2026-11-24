import { DRIVE } from "../src/config.js";
import { withQualitySuffix } from "../src/utils/filenames.js";
import {
  ANIDL_FORMAT_HINT,
  ANIME_QUALITY_PATTERN,
  MAX_ANIDL_EPISODES,
  animeDownloadError,
  downloadAnimeEpisode,
  removeAnimeDownload,
} from "../src/services/anime.js";

export const name = "anidl";

const FORMAT_HINT = `Format: ${ANIDL_FORMAT_HINT}`;

export function match(ctx) {
  return /^\.anidl(?:\s|$)/.test(ctx.text);
}

function tokenizeArguments(text) {
  const tokens = [];
  let buffer = null;
  let quote = null;

  for (const part of text.trim().split(/\s+/).slice(1)) {
    if (!part) continue;
    if (buffer !== null) {
      buffer += ` ${part}`;
      if (part.endsWith(quote)) {
        tokens.push(buffer.slice(0, -1));
        buffer = null;
        quote = null;
      }
      continue;
    }
    if ((part[0] === '"' || part[0] === "'") && part.length > 1) {
      quote = part[0];
      buffer = part.slice(1);
      if (buffer.endsWith(quote)) {
        tokens.push(buffer.slice(0, -1));
        buffer = null;
        quote = null;
      }
      continue;
    }
    tokens.push(part);
  }

  return buffer === null ? tokens : null;
}

function parseEpisodes(value) {
  if (!/^\d+(?:-\d+)?$/.test(value)) return null;
  const [start, end = start] = value.split("-").map(Number);
  if (start < 1 || end < start || end - start + 1 > MAX_ANIDL_EPISODES) return null;
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function parseArguments(text) {
  const args = tokenizeArguments(text);
  if (!args?.length) return { error: FORMAT_HINT };

  const words = [];
  let episodes = [1];
  let quality = "best";
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--ep" || arg === "--quality") {
      const value = args[++i];
      if (!value || value.startsWith("--")) return { error: FORMAT_HINT };
      if (arg === "--quality") {
        if (!ANIME_QUALITY_PATTERN.test(value)) return { error: FORMAT_HINT };
        quality = value;
      } else {
        const parsed = parseEpisodes(value);
        if (!parsed) return { error: FORMAT_HINT };
        episodes = parsed;
      }
      continue;
    }
    if (arg.startsWith("--")) {
      const flag = arg.slice(2);
      if (!ANIME_QUALITY_PATTERN.test(flag)) return { error: FORMAT_HINT };
      quality = flag;
      continue;
    }
    if (ANIME_QUALITY_PATTERN.test(arg)) return { error: FORMAT_HINT };
    words.push(arg);
  }

  const title = words.join(" ").trim();
  if (!title) return { error: FORMAT_HINT };
  return { title, episodes, quality };
}

export async function run(
  { text, sendText },
  download = downloadAnimeEpisode,
  removeFile = removeAnimeDownload,
  drive,
) {
  const parsed = parseArguments(text);
  if (parsed.error) return sendText(parsed.error);
  if (!drive && !DRIVE.folderId) {
    return sendText("✗ Google Drive folder is not configured. Set DRIVE_FOLDER_ID in .env.");
  }
  const [first, last] = [parsed.episodes[0], parsed.episodes.at(-1)];
  const range = parsed.episodes.length > 1 ? `s ${first}-${last}` : ` ${first}`;
  await sendText(`· Downloading ${parsed.title} episode${range}...`);

  const downloaded = [];
  let driveApi;
  let auth;
  try {
    for (const episode of parsed.episodes) {
      let media;
      try {
        media = await download(parsed.title, { episode, quality: parsed.quality });
      } catch (error) {
        console.error("anidl download:", error?.message || error);
        return sendText(animeDownloadError(error));
      }
      if (!media?.filePath || !media.size) {
        return sendText("✗ Could not download the episode with ani-cli.");
      }
      downloaded.push({ episode, media });

      await sendText(`· Uploading episode ${episode} to Google Drive...`);
      try {
        driveApi = driveApi || drive || (await import("../src/services/drive.js"));
        auth = auth || (await driveApi.authorize());
        const quality = parsed.quality === "best" ? "best" : `${parsed.quality}p`;
        const uploadName = withQualitySuffix(media.fileName, quality);
        const uploaded = await driveApi.uploadToDrive(auth, media.filePath, uploadName, media.mimeType);
        const link = uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`;
        const status = uploaded.reused ? "already in Google Drive" : "saved to Google Drive";
        await sendText(
          `✓ ${media.title} (ep ${episode}, ${quality}) ${status}\n→ ${link}`,
        );
      } catch (error) {
        console.error("anidl Drive upload:", error?.message || error);
        return sendText("✗ Failed to save the episode to Google Drive.");
      }
    }
  } finally {
    for (const { media } of downloaded) {
      if (media?.filePath) await removeFile(media.filePath).catch(() => {});
    }
  }
}
