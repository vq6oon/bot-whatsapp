import { BOT_NAME } from "../src/config.js";

export const name = "help";

// One entry per command: format line + one-line behavior note.
// Namespace styling: duplicate subcommands (encode64/biner) share owner.
export const HELP = {
  menu: { format: ".menu", about: "Show this menu" },
  info: { format: ".info", about: "Bot name, developer, framework, version" },
  rules: { format: ".rules", about: "Usage rules" },
  checkdrive: { format: ".checkdrive", about: "Drive folder name, file count, folder link" },
  list: { format: ".list [audio|video|document|photo]", about: "List Drive files, optionally filtered by type" },
  upload: { format: ".upload [name]", about: "Upload attached or quoted media to Drive" },
  yt: {
    format: ".yt <url> [--<360|480|720|1080|best>]",
    about: "Download YouTube video to Drive; default best",
    detail: ".yt <url> [--<360|480|720|1080|best>]\n\nExample: .yt https://youtu.be/abc123 --720\nNo flag = best. URL must be youtube.com / youtu.be.",
  },
  ytm: { format: ".ytm <url>", about: "Download YouTube audio, send MP3 to chat", detail: ".ytm <url>\n\nDownload audio and send it as an MP3 audio message in this chat. No Drive needed." },
  anidl: {
    format: ".anidl <title> [-e <episode>] [-q <quality>] [--format-list] [--search]",
    about: "Download anime episodes to Drive via ani-cli; list anime titles with --search",
    detail: ".anidl <title> [-e <episode>] [-q <quality>] [--format-list] [--search]\n\n<q> = best | worst | 360 | 480 | 720 | 1080 (default best). The short form --360 / --720 etc. also works.\n\nExamples: .anidl \"one piece\" -e 3 -q 720\n.anidl --format-list\n.anidl --search \"dandadan\"\n\nAlways quote anime titles. -e|--episode selects the episode and -q|--quality selects the quality. --format-list only lists the qualities available for the first episode, without downloading. --search lists anime titles instead of downloading.\n\nIf the requested quality is unavailable, the bot replies with the available qualities, e.g. Available qualities: 1080p",
  },
  getani: { format: ".getani <title>", about: "Search anime, sends cover and synopsis", detail: ".getani <title>\n\nExample: .getani Naruto" },
  tiktok: { format: ".tiktok <url> [video|hd|audio|photo]", about: "Download TikTok media", detail: ".tiktok <url> [video|hd|audio|photo]\n\nDefault: video. hd = high quality, audio = sound only, photo = each slide." },
  tts: { format: ".tts <text>", about: "Text to speech (gtts, English)" },
  scan: { format: ".scan <url>", about: "Google Safe Browsing lookup" },
  hitung: { format: ".hitung <expression>", about: "Calculator (digits, operators, %, .)" },
  shorturl: { format: ".shorturl <url>", about: "Shorten URL (TinyURL)" },
  deviceinfo: { format: ".deviceinfo", about: "Host OS, kernel, CPU, RAM, uptime" },
  morse: { format: ".morse <text> / .textmorse <code>", about: "Encode/decode Morse" },
  encode64: { format: ".encode64 <text> / .decode64 <code>", about: "Encode/decode Base64" },
  biner: { format: ".biner <text> / .binarytext <code> / .textbinary <text>", about: "Binary conversion" },
  sticker: { format: ".sticker / .s", about: "Image to 512x512 WebP sticker" },
  help: { format: ".help [command]", about: "Show this help or one command's help" },
};

// Command prefixes that answer to the same help block (e.g. .encode64/.decode64).
const OWNERS = {
  menu: "menu", info: "info", rules: "rules", checkdrive: "checkdrive",
  list: "list", upload: "upload", yt: "yt", ytm: "ytm", anidl: "anidl",
  getani: "getani", tiktok: "tiktok", tts: "tts", scan: "scan", hitung: "hitung",
  shorturl: "shorturl", deviceinfo: "deviceinfo",
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
  const owner = OWNERS[normalized] || ["yt", "ytm", "anidl", "tiktok", "getani", "list", "upload"].find(
    (k) => normalized.startsWith(k),
  );
  const entry = HELP[owner];
  if (!entry) return `✗ No help for \`${command}\`. Try \`.help\`.`;
  if (entry.detail) return `*${entry.format}*\n\n${entry.detail}`;
  return `*${entry.format}*\n\n${entry.about}`;
}

export function allHelp() {
  const rows = Object.entries(HELP).map(
    ([key, entry]) => `\`${entry.format}\` — ${entry.about}`,
  );
  return `${BOT_NAME} commands\n\n${rows.join("\n")}\n\nType \`.help <command>\` for details.`;
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
