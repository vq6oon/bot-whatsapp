import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { PATHS } from "../config.js";

const execFileAsync = promisify(execFile);
const API_URL = "https://api.tenrai.org/v1/anime";
const VIDEO_EXTENSIONS = new Set([".mp4", ".mkv", ".webm", ".m4v"]);

export const ANIME_QUALITIES = new Set(["best", "360", "480", "720", "1080"]);
export const ANIDL_FORMAT_HINT = ".anidl <title> [--ep <n>] [--<360|480|720|1080|best>]";

const ANIDL_DIR = path.join(PATHS.downloads, "anidl");
const ANI_CLI_BIN = process.env.ANI_CLI_BIN || "ani-cli";
const ANI_CLI_MENU = process.env.ANI_CLI_MENU || "/usr/local/bin/ani-pick-first";
const ANI_DL_TIMEOUT_MS = Number(process.env.ANI_DL_TIMEOUT_MS || 15 * 60 * 1000);

export async function searchAnime(query, fetchImpl) {
  const fetch = fetchImpl || (await import("node-fetch")).default;
  const url = new URL(API_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Anime API returned HTTP ${response.status}`);

  const json = await response.json();
  return json.data?.[0] ?? null;
}

export async function downloadAnimeEpisode(
  title,
  { episode = 1, quality = "best" } = {},
  options = {},
) {
  const {
    run = execFileAsync,
    listFiles = (dir) => fs.readdir(dir, { withFileTypes: true }),
    stat = (filePath) => fs.stat(filePath),
    now = () => Date.now(),
    downloadDir = ANIDL_DIR,
  } = options;

  if (!title || !title.trim()) throw new Error("Anime title is required.");
  if (!Number.isInteger(episode) || episode < 1) throw new Error("Episode must be a positive integer.");
  if (!ANIME_QUALITIES.has(String(quality))) throw new Error(`Unsupported quality: ${quality}`);

  await fs.mkdir(downloadDir, { recursive: true });
  const startedAt = now() - 2000;
  const args = ["-d", "-S", "1", "-e", String(episode), "-q", String(quality), title.trim()];

  await run(ANI_CLI_BIN, args, {
    env: {
      ...process.env,
      ANI_CLI_PLAYER: "/bin/true",
      ANI_CLI_MENU,
      ANI_CLI_DOWNLOAD_DIR: downloadDir,
      TERM: "dumb",
    },
    timeout: ANI_DL_TIMEOUT_MS,
    maxBuffer: 8 * 1024 * 1024,
  });

  const entries = await listFiles(downloadDir);
  const newest = entries
    .filter((entry) =>
      entry.isFile?.() !== false &&
      VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) &&
      entry.mtimeMs >= startedAt,
    )
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
  if (!newest) throw new Error(`ani-cli produced no video for "${title}" episode ${episode}.`);

  const filePath = path.join(downloadDir, newest.name);
  const extension = path.extname(newest.name);
  return {
    title: path.basename(newest.name, extension),
    fileName: newest.name,
    mimeType: "video/mp4",
    filePath,
    size: (await stat(filePath)).size,
  };
}

export function animeDownloadError(error) {
  const message = String(error?.message || error);
  if (error?.code === "ENOENT" || /not found/i.test(message)) {
    return "❌ ani-cli belum terpasang di server.";
  }
  if (error?.killed || /timed out|timeout/i.test(message)) {
    return "❌ Unduhan anime timeout. Coba lagi nanti.";
  }
  return "❌ Gagal mengunduh anime dari ani-cli. Coba judul atau episode lain.";
}

export async function removeAnimeDownload(filePath) {
  if (!filePath) return;
  await fs.rm(filePath, { force: true });
  const subtitle = filePath.replace(/\.[^.]+$/, ".vtt");
  if (subtitle !== filePath) await fs.rm(subtitle, { force: true });
}
