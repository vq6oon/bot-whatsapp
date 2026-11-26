import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { PATHS } from "../config.js";

const execFileAsync = promisify(execFile);
const API_URL = "https://api.tenrai.org/v1/anime";
const VIDEO_EXTENSIONS = new Set([".mp4", ".mkv", ".webm", ".m4v"]);
const SUBTITLE_EXTENSIONS = new Set([".vtt", ".srt", ".ass", ".ssa"]);

export const ANIME_QUALITIES = new Set(["best", "worst", "360", "480", "720", "1080"]);
export const ANIME_QUALITY_PATTERN = /^(best|worst|360|480|720|1080)$/;
export const MAX_ANIDL_EPISODES = 20;
export const ANIME_FORMAT_HINT = ".anime <title> [-e <episode>] [-q <quality>] [--info|-i] [--search] [--format-list]  # q=best|worst|360|480|720|1080, also accepts --360";

const ANIME_DIR = path.join(PATHS.downloads, "anime");
const ANI_CLI_BIN = process.env.ANI_CLI_BIN || "ani-cli";
const ANI_CLI_MENU = process.env.ANI_CLI_MENU || "/usr/local/bin/ani-pick-first";
const ANI_DL_TIMEOUT_MS = Number(process.env.ANI_DL_TIMEOUT_MS || 15 * 60 * 1000);
const ANI_PROBE_TIMEOUT_MS = 60_000;

function animeEnv(overrides = {}) {
  return {
    ...process.env,
    ANI_CLI_PLAYER: "/bin/true",
    ANI_CLI_MENU,
    ANI_CLI_DOWNLOAD_DIR: ANIME_DIR,
    TERM: "dumb",
    ...overrides,
  };
}

const ANIME_SEARCH_LIMIT = 10;

export async function searchAnimeTitles(query, fetchImpl, limit = ANIME_SEARCH_LIMIT) {
  const fetch = fetchImpl || (await import("node-fetch")).default;
  const url = new URL(API_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Anime API returned HTTP ${response.status}`);

  const json = await response.json();
  return json.data ?? [];
}

export async function searchAnime(query, fetchImpl) {
  const results = await searchAnimeTitles(query, fetchImpl);
  return results[0] ?? null;
}

export function formatAnimeTitle(title) {
  const trimmed = String(title || "").trim();
  return `"${trimmed}"`;
}

// ani-cli prints its title menu as "<n> <title>" lines once fzf reads stdin.
export function parseAniCliTitles(raw, limit = ANIME_SEARCH_LIMIT) {
  const lines = String(raw || "")
    .split("\n")
    .map((line) => line.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "").trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const numbered = lines.every((line, index) => {
    const prefix = String(index + 1);
    return line.startsWith(prefix) && (line.length === prefix.length || /\s/.test(line[prefix.length]));
  });
  const titles = numbered
    ? lines.map((line) => line.replace(/^\d+\s+/, "").trim())
    : lines;
  return titles.filter(Boolean).slice(0, limit);
}

// ani-cli's own search, so titles match what the downloader will pick.
export async function searchAniCliTitles(query, options = {}) {
  const run = options.run || execFileAsync;
  const limit = options.limit ?? ANIME_SEARCH_LIMIT;
  const timeout = options.timeout ?? ANI_PROBE_TIMEOUT_MS;
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "anicli-search-"));
  const captureFile = path.join(dir, "captured.txt");
  const menuPath = path.join(dir, "capture-menu");

  try {
    await fs.writeFile(menuPath, '#!/bin/sh\ncat > "$ANI_CLI_CAPTURE_FILE"\nexit 1\n', { mode: 0o755 });
    const env = animeEnv({
      ANI_CLI_MENU: menuPath,
      ANI_CLI_CAPTURE_FILE: captureFile,
      ANI_CLI_PLAYER: "/bin/true",
      ANI_CLI_DOWNLOAD_DIR: dir,
    });
    try {
      await run(ANI_CLI_BIN, ["-d", query], { env, timeout, maxBuffer: 8 * 1024 * 1024 });
    } catch (error) {
      // The capture shim exits non-zero on purpose; read whatever it wrote.
      if (!/selection|exit|code/i.test(String(error?.message || ""))) {
        console.error("anidl search:", error?.message || error);
      }
    }
    const raw = await fs.readFile(captureFile, "utf8").catch(() => "");
    return parseAniCliTitles(raw, limit);
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function findAnimeSubtitle(dir, listFiles = defaultListFiles) {
  const entries = await listFiles(dir).catch(() => []);
  const subtitles = entries
    .filter((entry) =>
      entry.isFile?.() !== false && SUBTITLE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()),
    )
    .sort((a, b) => (b.mtimeMs || 0) - (a.mtimeMs || 0));
  if (!subtitles.length) return null;
  return path.join(dir, subtitles[0].name);
}

// ani-cli saves a .vtt next to the video; embed it so the Drive file carries subtitles.
export async function muxAnimeSubtitles(videoPath, subtitlePath, options = {}) {
  if (!videoPath || !subtitlePath) return null;
  const run = options.run || execFileAsync;
  const parsed = path.parse(videoPath);
  const subtitleCodec = subtitlePath.toLowerCase().endsWith(".vtt") ? "srt" : "copy";
  const baseArgs = [
    "-y",
    "-i", videoPath,
    "-i", subtitlePath,
    "-map", "0:v:0",
    "-map", "0:a?",
    "-map", "1:0",
    "-c", "copy",
    "-c:s",
  ];
  const candidates = [];
  if ([".mp4", ".m4v", ".mov"].includes(parsed.ext.toLowerCase())) {
    candidates.push({ codec: "mov_text", outPath: path.join(parsed.dir, `${parsed.name}.muxed.mp4`) });
  }
  candidates.push({ codec: subtitleCodec, outPath: path.join(parsed.dir, `${parsed.name}.muxed.mkv`) });

  for (const candidate of candidates) {
    try {
      await run("ffmpeg", [...baseArgs, candidate.codec, "-metadata:s:s:0", "language=eng", candidate.outPath], {
        maxBuffer: 8 * 1024 * 1024,
      });
      const { size } = await fs.stat(candidate.outPath);
      if (!size) continue;
      await fs.rm(videoPath, { force: true });
      const finalPath = path.join(parsed.dir, `${parsed.name}${path.extname(candidate.outPath)}`);
      await fs.rename(candidate.outPath, finalPath);
      return finalPath;
    } catch (error) {
      console.error("anime subtitle mux:", candidate.codec, error?.message || error);
      await fs.rm(candidate.outPath, { force: true }).catch(() => {});
    }
  }
  return null;
}

export class AnimeQualityUnavailableError extends Error {
  constructor(title, episode, requested, available) {
    const formats = available.map((quality) => `${quality}p`).join(", ");
    super(
      `✗ Quality ${requested} is not available for ${title} episode ${episode}.\n` +
      `Available qualities: ${formats}\n` +
      `Try: .anime ${formatAnimeTitle(title)} -e ${episode} -q ${available[0]}`,
    );
    this.name = "AnimeQualityUnavailableError";
    this.title = title;
    this.episode = episode;
    this.requested = requested;
    this.available = available;
  }
}

export function parseAnimeQualities(output) {
  const block = String(output || "").split("All links:")[1]?.split("Selected link:")[0] ?? "";
  return [...new Set([...block.matchAll(/^(\d{3,4})\s*>/gm)].map((match) => match[1]))]
    .sort((a, b) => Number(b) - Number(a));
}

export async function probeAnimeQualities(
  title,
  { episode = 1 } = {},
  options = {},
) {
  const run = options.run || execFileAsync;
  const { stdout = "", stderr = "" } = await run(
    ANI_CLI_BIN,
    ["-S", "1", "-e", String(episode), "-q", "best", title],
    {
      env: animeEnv({ ANI_CLI_PLAYER: "debug", ANI_CLI_DOWNLOAD_DIR: options.downloadDir || ANIME_DIR }),
      timeout: ANI_PROBE_TIMEOUT_MS,
      maxBuffer: 8 * 1024 * 1024,
    },
  );
  return parseAnimeQualities(`${stdout}\n${stderr}`);
}

const defaultListFiles = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return Promise.all(entries.map(async (entry) => ({
    name: entry.name,
    isFile: () => entry.isFile(),
    mtimeMs: (await fs.stat(path.join(dir, entry.name))).mtimeMs,
  })));
};

export async function downloadAnimeEpisode(
  title,
  { episode = 1, quality = "best" } = {},
  options = {},
) {
  const {
    run = execFileAsync,
    listFiles = defaultListFiles,
    stat = (filePath) => fs.stat(filePath),
    now = () => Date.now(),
    mkdir = (dir) => fs.mkdir(dir, { recursive: true }),
    mux = muxAnimeSubtitles,
    findSubtitle = findAnimeSubtitle,
  } = options;

  const downloadDir = options.downloadDir || path.join(ANIME_DIR, `${now()}-${randomUUID()}`);

  if (!title || !title.trim()) throw new Error("Anime title is required.");
  if (!Number.isInteger(episode) || episode < 1) throw new Error("Episode must be a positive integer.");
  if (!ANIME_QUALITY_PATTERN.test(String(quality))) throw new Error(`Unsupported quality: ${quality}`);

  let selectedQuality = String(quality);
  if (options.availableQualities || options.probeQualities !== false) {
    let available = options.availableQualities;
    if (!available) {
      try {
        available = await probeAnimeQualities(title, { episode }, { ...options, downloadDir });
      } catch (error) {
        console.error("anime quality probe:", error?.message || error);
        available = [];
      }
    }
    if (available.length) {
      const sortedQualities = [...available].sort((a, b) => Number(b) - Number(a));
      if (selectedQuality === "best") selectedQuality = sortedQualities[0];
      if (selectedQuality === "worst") selectedQuality = sortedQualities.at(-1);
      if (!ANIME_QUALITY_PATTERN.test(selectedQuality)) {
        throw new Error(`Unsupported quality: ${selectedQuality}`);
      }
      if (!sortedQualities.includes(selectedQuality)) {
        throw new AnimeQualityUnavailableError(title, episode, selectedQuality, sortedQualities);
      }
    }
  }

  await mkdir(downloadDir);
  const startedAt = now() - 2000;
  const args = ["-d", "-S", "1", "-e", String(episode), "-q", selectedQuality, title.trim()];

  try {
    await run(ANI_CLI_BIN, args, {
      env: animeEnv({ ANI_CLI_DOWNLOAD_DIR: downloadDir }),
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
    const subtitle = await findSubtitle(downloadDir, listFiles).catch(() => null);
    let finalPath = filePath;
    if (subtitle) {
      const muxed = await mux(filePath, subtitle, { run: options.ffmpegRun });
      if (muxed) finalPath = muxed;
    }
    const extension = path.extname(finalPath);
    return {
      title: path.basename(finalPath, extension),
      fileName: path.basename(finalPath),
      quality: selectedQuality,
      mimeType: extension.toLowerCase() === ".mkv" ? "video/x-matroska" : "video/mp4",
      filePath: finalPath,
      size: (await stat(finalPath)).size,
    };
  } catch (error) {
    if (!options.downloadDir) {
      await fs.rm(downloadDir, { recursive: true, force: true }).catch(() => {});
    }
    throw error;
  }
}

export function animeProbeError(error) {
  const message = String(error?.message || error);
  if (error?.code === "ENOENT" || /not found/i.test(message)) {
    return "✗ ani-cli is not installed on the server.";
  }
  if (error?.killed || /timed out|timeout/i.test(message)) {
    return "✗ Format lookup timed out. Try again later.";
  }
  return "✗ Could not read available formats with ani-cli.";
}

export function animeDownloadError(error) {
  if (error instanceof AnimeQualityUnavailableError || error?.name === "AnimeQualityUnavailableError") {
    return error.message;
  }
  const message = String(error?.message || error);
  if (error?.code === "ENOENT" || /not found/i.test(message)) {
    return "✗ ani-cli is not installed on the server.";
  }
  if (error?.killed || /timed out|timeout/i.test(message)) {
    return "✗ Anime download timed out. Try again later.";
  }
  return "✗ Failed to download the anime with ani-cli. Try another title or episode.";
}

export async function removeAnimeDownload(filePath) {
  if (!filePath) return;
  await fs.rm(path.dirname(filePath), { recursive: true, force: true }).catch(() => {});
}