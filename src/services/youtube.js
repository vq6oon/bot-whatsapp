import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { PATHS } from "../config.js";

const execFileAsync = promisify(execFile);
export const MAX_DRIVE_UPLOAD_BYTES = 50 * 1024 * 1024;
export const QUALITY_FLAGS = new Set(["best", "360", "480", "720", "1080"]);
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
  if (error?.code === 1) {
    return "✗ YouTube rejected the download or the format is unavailable. Try another public video link.";
  }
  return "✗ Failed to download media from YouTube. Try again later.";
}

export function parseYoutubeMetadata(output) {
  const title = JSON.parse(output.trimEnd());
  if (typeof title !== "string") {
    throw new Error("YouTube returned invalid metadata.");
  }
  return { title };
}

export async function downloadYoutube(url, mode = "mp4", requestedQuality = "best") {
  const { default: youtubedl } = await import("youtube-dl-exec");
  const python = process.env.YOUTUBE_DL_PYTHON || "python3.11";
  const binaryPath = youtubedl.constants.YOUTUBE_DL_PATH;
  await fs.mkdir(PATHS.downloads, { recursive: true });

  const metadataOptions = {
    print: ["%(title)j"],
    noWarnings: true,
    noPlaylist: true,
    skipDownload: true,
  };
  const { stdout: metadataOutput } = await execFileAsync(python, [
    binaryPath,
    url,
    ...youtubedl.args(metadataOptions),
  ], { maxBuffer: 1024 * 1024 });
  const metadata = parseYoutubeMetadata(metadataOutput);
  const prefix = `youtube-${randomUUID()}`;
  const outputTemplate = path.join(PATHS.downloads, `${prefix}.%(ext)s`);
  const options = {
    noWarnings: true,
    noPlaylist: true,
    restrictFilenames: true,
    maxFilesize: "50G",
    output: outputTemplate,
  };
  if (mode === "mp3") {
    options.extractAudio = true;
    options.audioFormat = "mp3";
  } else {
    options.format = requestedQuality === "best"
      ? "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"
      : `bestvideo[height<=?${requestedQuality}][ext=mp4]+bestaudio[ext=m4a]/best[height<=?${requestedQuality}][ext=mp4]/best[height<=?${requestedQuality}]`;
  }

  try {
    await execFileAsync(python, [
      binaryPath,
      url,
      ...youtubedl.args(options),
    ], { maxBuffer: 4 * 1024 * 1024 });
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

    return { title, fileName: `${title}.${extension}`, mimeType, size: stat.size, filePath };
  } catch (error) {
    const partialFiles = await fs.readdir(PATHS.downloads).catch(() => []);
    await Promise.all(partialFiles
      .filter((name) => name.startsWith(`${prefix}.`))
      .map((name) => fs.rm(path.join(PATHS.downloads, name), { force: true })));
    throw error;
  }
}

export async function removeDownloadedFile(filePath) {
  if (filePath) await fs.rm(filePath, { force: true });
}
