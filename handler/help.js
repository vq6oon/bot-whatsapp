import { BOT_NAME } from "../src/config.js";

export const name = "help";

// One entry per command: format line + one-line behavior note.
// Namespace styling: duplicate subcommands (encode64/biner) share owner.
export const HELP = {
  menu: { format: ".menu", about: "Show the command menu" },
  info: { format: ".info", about: "Show bot, developer, framework, and version information" },
  rules: { format: ".rules", about: "Show bot usage rules" },
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
  anidl: {
    format: ".anidl <title> [-e <episode>] [-q <quality>] [--format-list] [--search]",
    about: "Download anime episodes to Google Drive or search anime titles",
    detail: "Quality: best | worst | 360 | 480 | 720 | 1080. Default: best. Short flags such as --720 also work.\nExample: .anidl \"one piece\" -e 3 -q 720\nList formats: .anidl --format-list\nSearch titles: .anidl --search \"dandadan\"\nAlways quote anime titles. -e|--episode selects episodes; -q|--quality selects quality. --format-list lists qualities for the first episode without downloading. --search lists anime titles without downloading. If a quality is unavailable, the bot shows available qualities.",
  },
  getani: {
    format: ".getani <title>",
    about: "Search anime and show its cover and synopsis",
    detail: "Example: .getani Naruto",
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

// Command prefixes that answer to the same help block (e.g. .encode64/.decode64).
const OWNERS = {
  menu: "menu", info: "info", rules: "rules", checkdrive: "checkdrive",
  list: "list", upload: "upload", yt: "yt", ytm: "ytm", anidl: "anidl",
  getani: "getani", tiktok: "tiktok", tts: "tts", scan: "scan", hitung: "hitung",
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
  const owner = OWNERS[normalized] || ["yt", "ytm", "anidl", "tiktok", "getani", "list", "upload"].find(
    (k) => normalized.startsWith(k),
  );
  const entry = HELP[owner];
  if (!entry) return `✗ No help for \`${command}\`. Try \`.help\`.`;

  const heading = `.${entry.format.slice(1)} · ${entry.about}`;
  if (entry.detail) return `${heading}\n\n${entry.detail}`;
  return heading;
}

export function allHelp() {
  const rows = Object.values(HELP).map(
    (entry) => `.${entry.format.slice(1)} · ${entry.about}`,
  );
  return `Commands for ${BOT_NAME}\n\n${rows.join("\n")}\n\nType \`.help <command>\` for more details.`;
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
