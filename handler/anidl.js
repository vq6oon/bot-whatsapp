import { DRIVE } from "../src/config.js";
import {
  ANIDL_FORMAT_HINT,
  ANIME_QUALITY_PATTERN,
  animeDownloadError,
  downloadAnimeEpisode,
  removeAnimeDownload,
} from "../src/services/anime.js";

export const name = "anidl";

const FORMAT_HINT = `Format: ${ANIDL_FORMAT_HINT}`;

export function match(ctx) {
  return /^\.anidl(?:\s|$)/.test(ctx.text);
}

export function parseArguments(text) {
  const args = text.trim().split(/\s+/).slice(1);
  if (!args.length) return { error: FORMAT_HINT };

  const words = [];
  let episode = 1;
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
        if (!/^\d+$/.test(value)) return { error: FORMAT_HINT };
        episode = Number(value);
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
  if (!title || episode < 1) return { error: FORMAT_HINT };
  return { title, episode, quality };
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
    return sendText("❌ Folder Google Drive belum dikonfigurasi.");
  }
  await sendText(`⏳ Sedang mengunduh ${parsed.title} episode ${parsed.episode}...`);

  let media;
  try {
    try {
      media = await download(parsed.title, {
        episode: parsed.episode,
        quality: parsed.quality,
      });
    } catch (error) {
      console.error("anidl download:", error?.message || error);
      return sendText(animeDownloadError(error));
    }
    if (!media?.filePath || !media.size) {
      return sendText("❌ Episode tidak bisa diunduh dari ani-cli.");
    }

    try {
      const driveApi = drive || (await import("../src/services/drive.js"));
      const auth = await driveApi.authorize();
      const uploaded = await driveApi.uploadToDrive(auth, media.filePath, media.fileName, media.mimeType);
      const link = uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`;
      const quality = parsed.quality === "best" ? "best" : `${parsed.quality}p`;
      return await sendText(
        `✅ ${media.title} (ep ${parsed.episode}, ${quality}) tersimpan di Google Drive\n🔗 ${link}`,
      );
    } catch (error) {
      console.error("anidl Drive upload:", error?.message || error);
      return sendText("❌ Gagal menyimpan episode ke Google Drive.");
    }
  } finally {
    if (media?.filePath) await removeFile(media.filePath).catch(() => {});
  }
}
