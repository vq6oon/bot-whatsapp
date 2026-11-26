import { execFile } from "node:child_process";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { PATHS } from "../config.js";
import { qualityLabelFromSize } from "../utils/filenames.js";

const execFileAsync = promisify(execFile);
export const MAX_DRIVE_UPLOAD_BYTES = 50 * 1024 * 1024;
export const QUALITY_FLAGS = new Set(["best", "360", "480", "720", "1080"]);
// Tried in order: strict mp4 first, then anything, then a single best stream.
export const FORMAT_PREFERENCE = [
  "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
  "bv*+ba/b",
  "b",
];

// YTDLP_BIN wins over the python wrapper so a current yt-dlp can replace the bundled one.
export function youtubeDlCommand(youtubedl) {
  const explicit = process.env.YTDLP_BIN;
  if (explicit) return { file: explicit, prefix: [] };
  return {
    file: process.env.YOUTUBE_DL_PYTHON || "python3.11",
    prefix: [youtubedl.constants.YOUTUBE_DL_PATH],
  };
}

// Visitor-only cookie exports do not pass YouTube's bot check; they must carry a login.
export function inspectCookiesFile(file) {
  try {
    const names = new Set(
      fsSync.readFileSync(file, "utf8")
        .split("\n")
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => line.split("\t")[5])
        .filter(Boolean),
    );
    const loggedIn = names.has("LOGIN_INFO") ||
      (names.has("SID") && (names.has("SAPISID") || names.has("__Secure-3PAPISID")));
    return { file, loggedIn };
  } catch {
    return null;
  }
}

// YOUTUBE_COOKIES wins; otherwise ./cookies.txt next to the bot is used.
export function resolvedCookiesPath(cwd = process.cwd()) {
  const explicit = process.env.YOUTUBE_COOKIES;
  if (explicit) return explicit;
  const local = path.join(cwd, "cookies.txt");
  return fsSync.existsSync(local) ? local : null;
}

// Only pass cookies that carry a login; a visitor-only file makes things worse.
export function activeCookies(cwd = process.cwd()) {
  const file = resolvedCookiesPath(cwd);
  if (!file) return null;
  const info = inspectCookiesFile(file);
  if (!info) {
    console.warn(`youtube cookies: cannot read ${file}`);
    return null;
  }
  if (!info.loggedIn) {
    console.warn(`youtube cookies: ${file} has no login cookies (SID, SAPISID, LOGIN_INFO); ignoring it`);
    return null;
  }
  return info;
}

export function ytdlpFailureDetail(error) {
  const text = String(error?.stderr || error?.stdout || error?.message || "");
  const lines = text
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^\[(download|info|debug)\]/i.test(line));
  const last = lines.at(-1) || "";
  return last.replace(/^ERROR:\s*/i, "").replace(/\s+/g, " ").slice(0, 180);
}
export const YOUTUBE_FORMAT_HINT = ".yt <url> --<360|480|720|1080|best>";

export function isYoutubeUrl(value) {
  let hostname;
  try {
    hostname = new URL(value).hostname.toLowerCase();
  } catch {
    return false;
  }
  return hostname === "youtube.com" || hostname.endsWith(".youtube.com") || hostname === "youtu.be";
}

export function youtubeDownloadError(error) {
  const detail = ytdlpFailureDetail(error);
  const reason = detail ? `\n· reason: ${detail}` : "";
  if (error?.code === "ENOENT") {
    return "✗ yt-dlp could not run. Install yt-dlp, or point YTDLP_BIN at it." + reason;
  }
  if (error?.code === 1 || error?.code === "1") {
    const botCheck = /sign in to confirm|not a bot|confirm your age/i.test(detail);
    const fix = botCheck
      ? "\n· fix: export logged-in youtube cookies to cookies.txt, or set YOUTUBE_PROXY for a residential IP"
      : "";
    return "✗ YouTube rejected the download or the format is unavailable. Try another public video link." + reason + fix;
  }
  return "✗ Failed to download media from YouTube. Try again later." + reason;
}

export function parseYoutubeMetadata(output) {
  const title = JSON.parse(output.trimEnd());
  if (typeof title !== "string") {
    throw new Error("YouTube returned invalid metadata.");
  }
  return { title };
}

export async function probeVideoQuality(filePath, runner = execFileAsync) {
  try {
    const { stdout } = await runner("ffprobe", [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height",
      "-of", "csv=p=0",
      filePath,
    ], { maxBuffer: 64 * 1024 });
    const [width, height] = String(stdout).trim().split(/[,\s]+/).map(Number);
    if (!width || !height) return null;
    return qualityLabelFromSize(Math.min(width, height));
  } catch {
    return null;
  }
}

export async function downloadYoutube(url, mode = "mp4", requestedQuality = "best") {
  const { default: youtubedl } = await import("youtube-dl-exec");
  const command = youtubeDlCommand(youtubedl);
  await fs.mkdir(PATHS.downloads, { recursive: true });

  const common = { noWarnings: true, noPlaylist: true };
  const cookies = activeCookies();
  if (cookies) common.cookies = cookies.file;
  if (process.env.YOUTUBE_PROXY) common.proxy = process.env.YOUTUBE_PROXY;

  const runYtdlp = (args, execOptions) =>
    execFileAsync(command.file, [...command.prefix, url, ...youtubedl.args(args)], execOptions);

  const { stdout: metadataOutput } = await runYtdlp(
    { ...common, print: ["%(title)j"], skipDownload: true },
    { maxBuffer: 1024 * 1024 },
  );
  const metadata = parseYoutubeMetadata(metadataOutput);
  const prefix = `youtube-${randomUUID()}`;
  const outputTemplate = path.join(PATHS.downloads, `${prefix}.%(ext)s`);

  const cleanupPartials = async () => {
    const partials = await fs.readdir(PATHS.downloads).catch(() => []);
    await Promise.all(partials
      .filter((name) => name.startsWith(`${prefix}.`))
      .map((name) => fs.rm(path.join(PATHS.downloads, name), { force: true })));
  };

  try {
    let lastError = null;
    const formats = mode === "mp3" ? [null] : FORMAT_PREFERENCE;
    for (const format of formats) {
      const options = { ...common, restrictFilenames: true, maxFilesize: "50G", output: outputTemplate };
      if (mode === "mp3") {
        options.extractAudio = true;
        options.audioFormat = "mp3";
      } else {
        options.format = format;
      }
      try {
        await runYtdlp(options, { maxBuffer: 4 * 1024 * 1024 });
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        await cleanupPartials();
      }
    }
    if (lastError) throw lastError;

    const candidates = (await fs.readdir(PATHS.downloads))
      .filter((name) => name.startsWith(`${prefix}.`));
    if (candidates.length !== 1) {
      throw new Error("YouTube downloader did not produce one media file.");
    }

    const fileName = candidates[0];
    const filePath = path.join(PATHS.downloads, fileName);
    const stat = await fs.stat(filePath);
    const buffer = mode === "mp3" ? await fs.readFile(filePath) : undefined;
    const title = metadata.title || "YouTube media";
    const extension = path.extname(fileName).slice(1).toLowerCase();
    const mimeType = mode === "mp3"
      ? "audio/mpeg"
      : extension === "mp4" ? "video/mp4" : "video/webm";

    const quality = mode === "mp3" ? null : await probeVideoQuality(filePath);

    return { title, fileName: `${title}.${extension}`, mimeType, size: stat.size, filePath, quality };
  } catch (error) {
    await cleanupPartials();
    throw error;
  }
}

export async function removeDownloadedFile(filePath) {
  if (filePath) await fs.rm(filePath, { force: true });
}