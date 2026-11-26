import { BOT_NAME, BOT_VERSION } from "../src/config.js";

export const name = "help";

// One entry per command: format line + one-line behavior note.
// Namespace styling: duplicate subcommands (encode64/biner) share owner.
export const HELP = {
  menu: { format: ".menu", about: "Show the command menu" },
  info: { format: ".info", about: "Show bot name, developer, framework, and version" },
  rules: { format: ".rules", about: "Show usage rules" },
  checkdrive: { format: ".checkdrive", about: "Show Drive folder name, file count, and folder link" },
  list: { format: ".list [audio|video|document|photo]", about: "List Drive files with an optional type filter" },
  upload: { format: ".upload [name]", about: "Upload attached or quoted media to Drive" },
  yt: {
    format: ".yt <url> [--<360|480|720|1080|best>]",
    about: "Download a YouTube video to Google Drive",
    detail: "Example: .yt https://youtu.be/abc123 --720\nWithout a flag, the bot selects the best available quality.\nAccepted URLs: youtube.com or youtu.be.",
  },
  ytm: {
    format: ".ytm <url>",
    about: "Download YouTube audio as MP3 and send it to chat",
    detail: "Sends a playable MP3 audio message to chat. Google Drive is not required.",
  },
  anime: {
    format: ".anime <title> [-e <episode>] [-q <quality>] [--info|-i] [--search] [--format-list]",
    about: "Download anime to Drive or look up a title",
    detail: "Look up a title: .anime \"naruto\" --info (or -i)\nDownload: .anime \"one piece\" -e 3 -q 720\nList formats: .anime \"one piece\" --format-list\nSearch titles: .anime \"dandadan\" --search\nQuality: best | worst | 360 | 480 | 720 | 1080. Default: best. Short flags such as --720 also work.\nSearch titles come from ani-cli's own index, the same one the downloader uses. Subtitles saved by ani-cli are embedded into the uploaded video when ffmpeg is installed.\nWithout a flag the bot replies with the usage hint instead of downloading. Always quote anime titles. -e|--episode selects one episode or an inclusive range; -q|--quality selects quality. If a quality is unavailable, the bot shows available qualities.",
  },
  tiktok: {
    format: ".tiktok <url> [video|hd|audio|photo]",
    about: "Download TikTok media",
    detail: "Default mode: video. Use hd for high quality, audio for sound only, or photo to send each slide.",
  },
  tts: { format: ".tts <text>", about: "Convert text to English speech" },
  scan: { format: ".scan <url>", about: "Check URL safety with Google Safe Browsing" },
  hitung: { format: ".hitung <expression>", about: "Calculate a math expression" },
  shorturl: { format: ".shorturl <url>", about: "Shorten a URL with TinyURL" },
  morse: { format: ".morse <text> / .textmorse <code>", about: "Encode text to Morse or decode Morse code" },
  encode64: { format: ".encode64 <text> / .decode64 <code>", about: "Encode or decode Base64" },
  biner: { format: ".biner <text> / .binarytext <code> / .textbinary <text>", about: "Convert between text and binary" },
  sticker: { format: ".sticker / .s", about: "Convert an image to a 512×512 WebP sticker" },
  help: { format: ".help [command]", about: "Show all commands or help for one command" },
};

// Menu and .help share one catalog so the two lists cannot drift apart.
export const SECTIONS = [
  {
    title: "Info",
    rows: [
      { short: ".help [command]", label: "help for one command", help: "help" },
      { short: ".info", label: "bot information", help: "info" },
      { short: ".rules", label: "usage rules", help: "rules" },
    ],
  },
  {
    title: "Download",
    rows: [
      { short: ".yt <url>", label: "youtube video → drive", help: "yt", menuHelp: true },
      { short: ".ytm <url>", label: "youtube audio → chat", help: "ytm", menuHelp: true },
      { short: ".anime <title>", label: "anime → drive", help: "anime", menuHelp: true },
      { short: ".tiktok <url>", label: "tiktok media", help: "tiktok", menuHelp: true },
    ],
  },
  {
    title: "Drive",
    rows: [
      { short: ".checkdrive", label: "folder status", help: "checkdrive" },
      { short: ".list [type]", label: "list files", help: "list", menuHelp: true },
      { short: ".upload [name]", label: "upload media", help: "upload" },
    ],
  },
  {
    title: "Search",
    rows: [
      { short: ".anime <title> --info", label: "anime info", help: "anime", menuHelp: true },
      { short: ".scan <url>", label: "url safety check", help: "scan" },
      { short: ".shorturl <url>", label: "shorten url", help: "shorturl" },
    ],
  },
  {
    title: "Tools",
    rows: [
      { short: ".tts <text>", label: "text to speech", help: "tts" },
      { short: ".hitung <expression>", label: "calculator", help: "hitung" },
      { short: ".morse / .textmorse", label: "morse", help: "morse" },
      { short: ".encode64 / .decode64", label: "base64", help: "encode64" },
      { short: ".biner / .binarytext", label: "binary", help: "biner" },
      { short: ".sticker / .s", label: "image → sticker", help: "sticker" },
    ],
  },
];

export function catalogLines({ helpLinks = false } = {}) {
  const lines = [];
  for (const section of SECTIONS) {
    lines.push(`› ${section.title}`);
    for (const row of section.rows) {
      const suffix = helpLinks && row.menuHelp ? ` (.help ${row.help})` : "";
      lines.push(`${row.short} · ${row.label}${suffix}`);
    }
    lines.push("");
  }
  if (lines.at(-1) === "") lines.pop();
  return lines;
}

// Command prefixes that answer to the same help block (e.g. .encode64/.decode64).
const OWNERS = {
  menu: "menu", info: "info", rules: "rules", checkdrive: "checkdrive",
  list: "list", upload: "upload", yt: "yt", ytm: "ytm", anime: "anime",
  tiktok: "tiktok", tts: "tts", scan: "scan", hitung: "hitung",
  shorturl: "shorturl",
  morse: "morse", textmorse: "morse",
  encode64: "encode64", decode64: "encode64",
  biner: "biner", textbinary: "biner", binarytext: "biner",
  sticker: "sticker", s: "sticker",
  help: "help",
};

export function match(ctx) {
  const text = ctx.text.trim();
  if (/^\.help(?:\s|$)/.test(text)) return true;
  return /(?:^|\s)(?:--help|-h)$/.test(text);
}

export function helpText(command) {
  const normalized = String(command || "").replace(/^[.-]+/, "").toLowerCase();
  const owner = OWNERS[normalized] || ["yt", "ytm", "anime", "tiktok", "list", "upload"].find(
    (k) => normalized.startsWith(k),
  );
  const entry = HELP[owner];
  if (!entry) return `✗ No help for \`${command}\`. Try \`.help\`.`;

  const heading = `.${entry.format.slice(1)} · ${entry.about}`;
  if (entry.detail) return `${heading}\n\n${entry.detail}`;
  return heading;
}

export function allHelp() {
  return [
    `${BOT_NAME} · ${BOT_VERSION}`,
    "",
    ...catalogLines(),
    "",
    "Type `.help <command>` for usage and flags.",
  ].join("\n");
}

export async function run({ text, sendText }) {
  const trimmed = text.trim();
  const parts = trimmed.split(/\s+/);

  if (parts[0] === ".help") {
    const command = parts[1]?.replace(/^-+/, "");
    if (!command) return sendText(allHelp());
    return sendText(helpText(command));
  }

  // "<command> --help": answer for the first token.
  const command = parts[0].replace(/^-+/, "");
  return sendText(helpText(command));
}