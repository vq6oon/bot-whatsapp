import { DRIVE } from "../src/config.js";
import { withQualitySuffix } from "../src/utils/filenames.js";
import {
  ANIME_FORMAT_HINT,
  ANIME_QUALITY_PATTERN,
  MAX_ANIDL_EPISODES,
  animeDownloadError,
  animeProbeError,
  downloadAnimeEpisode,
  formatAnimeTitle,
  probeAnimeQualities,
  removeAnimeDownload,
  searchAnime,
  searchAnimeTitles,
} from "../src/services/anime.js";

export const name = "anime";

const USAGE_HINT = `Format: ${ANIME_FORMAT_HINT.split("  #")[0]}\nDetails: .help anime`;

// Flags that require the bot to act instead of printing the usage hint.
const ACTION_FLAG = /^(?:-e|--ep|--episode|-q|--quality|--info|-i|--search|--format-list|--(?:best|worst|\d{3,4}))$/;

export function match(ctx) {
  return /^\.anime(?:\s|$)/.test(ctx.text);
}

export function usesFlags(text) {
  return text
    .trim()
    .split(/\s+/)
    .slice(1)
    .some((token) => ACTION_FLAG.test(token.replace(/^["']|["']$/g, "")));
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
  if (!args?.length) return { error: USAGE_HINT };

  const words = [];
  let episodes = [1];
  let quality = "best";
  let formatList = false;
  let search = false;
  let info = false;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--format-list") {
      formatList = true;
      continue;
    }
    if (arg === "--search") {
      search = true;
      continue;
    }
    if (arg === "--info" || arg === "-i") {
      info = true;
      continue;
    }
    if (arg === "--ep" || arg === "--episode" || arg === "-e") {
      const value = args[++i];
      if (!value || value.startsWith("--")) return { error: USAGE_HINT };
      const parsed = parseEpisodes(value);
      if (!parsed) return { error: USAGE_HINT };
      episodes = parsed;
      continue;
    }
    if (arg === "--quality" || arg === "-q") {
      const value = args[++i];
      if (!value || value.startsWith("--")) return { error: USAGE_HINT };
      if (!ANIME_QUALITY_PATTERN.test(value)) return { error: USAGE_HINT };
      quality = value;
      continue;
    }
    if (arg.startsWith("--")) {
      const flag = arg.slice(2);
      if (!ANIME_QUALITY_PATTERN.test(flag)) return { error: USAGE_HINT };
      quality = flag;
      continue;
    }
    if (ANIME_QUALITY_PATTERN.test(arg)) return { error: USAGE_HINT };
    words.push(arg);
  }

  const title = words.join(" ").trim();
  if (!title) return { error: USAGE_HINT };
  const parsed = { title, episodes, quality };
  if (formatList) parsed.formatList = true;
  if (search) parsed.search = true;
  if (info) parsed.info = true;
  return parsed;
}

export async function run(
  { text, sock, from, sendText },
  download = downloadAnimeEpisode,
  removeFile = removeAnimeDownload,
  drive,
  probe = probeAnimeQualities,
  search = searchAnimeTitles,
  lookup = searchAnime,
) {
  const parsed = parseArguments(text);
  if (parsed.error) return sendText(USAGE_HINT);
  if (!usesFlags(text)) return sendText(USAGE_HINT);

  if (parsed.info) {
    const query = parsed.title;
    await sendText(`· Looking up ${query}...`);
    let anime;
    try {
      anime = await lookup(query);
    } catch (error) {
      console.error("anime info:", error?.message || error);
      return sendText("✗ Anime search is temporarily unavailable. Try again later.");
    }
    if (!anime) {
      return sendText(`✗ No anime found for ${query}. Try: .anime "${query}" --search`);
    }

    const caption = `*${anime.title || anime.title_english || "Unknown title"}*\n\n` +
      `Episodes: ${anime.episodes || "?"}\nScore: ${anime.score || "?"}\nAired: ${anime.aired?.string || "?"}\n\n` +
      `Synopsis: ${anime.synopsis || "No synopsis yet."}\n\n` +
      `→ ${anime.url || `https://myanimelist.net/anime/${anime.mal_id}`}`;
    const imageUrl = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url;

    if (imageUrl) {
      return sock.sendMessage(from, { image: { url: imageUrl }, caption });
    }
    return sendText(caption);
  }

  if (parsed.search) {
    const query = parsed.title;
    await sendText(`· Searching anime for ${query}...`);
    let results;
    try {
      results = await search(query);
    } catch (error) {
      console.error("anime search:", error?.message || error);
      return sendText("✗ Anime search is temporarily unavailable. Try again later.");
    }

    const titles = Array.isArray(results)
      ? results.map((anime) => anime?.title || anime?.title_english || "Unknown").filter(Boolean)
      : [];
    if (!titles.length) return sendText(`✗ No anime titles found for ${query}.`);

    const options = titles.map((title) => `· ${formatAnimeTitle(title)}`).join("\n");
    return sendText(
      `Available titles for ${query}:\n${options}\n\nPick one and run: .anime "<title>" -e <episode> -q <quality>`,
    );
  }

  if (parsed.formatList) {
    const episode = parsed.episodes[0];
    await sendText(`· Checking formats for ${parsed.title} episode ${episode}...`);
    let qualities;
    try {
      qualities = await probe(parsed.title, { episode });
    } catch (error) {
      console.error("anime format list:", error?.message || error);
      return sendText(animeProbeError(error));
    }
    if (!qualities?.length) {
      return sendText(`✗ No formats found for ${parsed.title} episode ${episode}.`);
    }
    const options = qualities.map((quality) => `· ${quality}p`).join("\n");
    return sendText(
      `Available formats for ${parsed.title} episode ${episode}:\n${options}\n\n` +
      `Pick one: .anime ${formatAnimeTitle(parsed.title)} -e ${episode} -q ${qualities[0]}`,
    );
  }

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
        console.error("anime download:", error?.message || error);
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
        const selectedQuality = media.quality || parsed.quality;
        const quality = selectedQuality === "best" ? "best" : `${selectedQuality}p`;
        const uploadName = withQualitySuffix(media.fileName, quality);
        const uploaded = await driveApi.uploadToDrive(auth, media.filePath, uploadName, media.mimeType);
        const link = uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`;
        const status = uploaded.reused ? "already in Google Drive" : "saved to Google Drive";
        const episodeLabel = media.title.includes(`Episode ${episode}`)
          ? media.title
          : `${media.title} (ep ${episode})`;
        await sendText(
          `✓ ${episodeLabel} (${quality}) ${status}\n→ ${link}`,
        );
      } catch (error) {
        console.error("anime Drive upload:", error?.message || error);
        return sendText("✗ Failed to save the episode to Google Drive.");
      }
    }
  } finally {
    for (const { media } of downloaded) {
      if (media?.filePath) await removeFile(media.filePath).catch(() => {});
    }
  }
}
