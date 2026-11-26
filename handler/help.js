import { BOT_NAME, BOT_VERSION } from "../src/config.js";

export const name = "help";

// One entry per command: format line + one-line behavior note.
// Namespace styling: duplicate subcommands (encode64/biner) share owner.
export const HELP = {
  menu: {
    format: ".menu",
    about: "command menu",
    sections: [
      { title: "Usage", rows: [
        ".menu · banner plus every command, grouped",
        "· each downloader row links to its own .help",
      ] },
    ],
  },
  info: {
    format: ".info",
    about: "bot information",
    sections: [
      { title: "Shows", rows: [
        "· name, developer, language, framework, platform",
        "· github link and version",
      ] },
    ],
  },
  rules: {
    format: ".rules",
    about: "usage rules",
    sections: [
      { title: "Covers", rows: [
        "· spam, upload limits, and abuse",
        "· the bot can stop or restrict access at any time",
      ] },
    ],
  },
  checkdrive: {
    format: ".checkdrive",
    about: "folder status",
    sections: [
      { title: "Shows", rows: [
        "· folder name, file count, folder link",
        "· needs DRIVE_FOLDER_ID in .env",
      ] },
    ],
  },
  list: {
    format: ".list [audio|video|document|photo]",
    about: "list files",
    sections: [
      { title: "Usage", rows: [
        ".list · every file in the Drive folder",
        ".list video · one type only",
        ".list audio · audio files",
      ] },
      { title: "Types", rows: [
        "· audio, video, document, photo",
        "· one link per file",
      ] },
    ],
  },
  upload: {
    format: ".upload [name]",
    about: "upload media",
    sections: [
      { title: "Usage", rows: [
        ".upload · media attached to the same message",
        ".upload holiday · rename before upload",
        ".upload · also works as a reply to media",
      ] },
      { title: "Notes", rows: [
        "· photo, video, audio, document, sticker",
        "· an existing Drive name is linked, not duplicated",
        "· needs DRIVE_FOLDER_ID in .env",
      ] },
    ],
  },
  yt: {
    format: ".yt <url> [--<360|480|720|1080|best>]",
    about: "youtube video → drive",
    sections: [
      { title: "Usage", rows: [
        ".yt <url> · download video, best quality",
        ".yt <url> --720 · pick a quality",
        "· example: .yt https://youtu.be/abc123 --720",
      ] },
      { title: "Notes", rows: [
        "· accepted: youtube.com, *.youtube.com, youtu.be",
        "· lookalike hosts are rejected before any download",
        "· the Drive name carries the real resolution",
        "· needs DRIVE_FOLDER_ID in .env",
      ] },
    ],
  },
  ytm: {
    format: ".ytm <url>",
    about: "youtube audio → chat",
    sections: [
      { title: "Usage", rows: [
        ".ytm <url> · mp3 back to this chat",
        "· example: .ytm https://youtu.be/abc123",
      ] },
      { title: "Notes", rows: [
        "· always best audio, no quality flag",
        "· Google Drive is not needed",
      ] },
    ],
  },
  anime: {
    format: ".anime <title> [-e <episode>] [-q <quality>] [--info|-i] [--search] [--format-list]",
    about: "anime → drive",
    sections: [
      { title: "Modes", rows: [
        ".anime \"one piece\" -e 3 · download one episode",
        ".anime \"one piece\" -e 1-3 · download a range, max 20",
        ".anime \"naruto\" --info · cover and synopsis",
        ".anime \"dandadan\" --search · ani-cli title list",
        ".anime \"one piece\" --format-list · available qualities",
      ] },
      { title: "Flags", rows: [
        "-e, --episode · one episode or an inclusive range",
        "-q, --quality · best, worst, 360, 480, 720, 1080",
        "--720 · short form of -q 720",
        "-i · alias of --info",
        "--search · list titles, no download",
        "--format-list · list qualities, no download",
      ] },
      { title: "Notes", rows: [
        "· titles with spaces must be quoted",
        "· no flag replies with the usage hint, no download",
        "· search uses ani-cli's own index, same as the downloader",
        "· ani-cli subtitles are embedded when ffmpeg is installed",
        "· if a quality is unavailable, the bot lists what it has",
        "· episode 1 and quality best are the defaults",
      ] },
    ],
  },
  tiktok: {
    format: ".tiktok <url> [video|hd|audio|photo]",
    about: "tiktok media",
    sections: [
      { title: "Modes", rows: [
        ".tiktok <url> · video, default",
        ".tiktok <url> hd · best quality stream",
        ".tiktok <url> audio · sound only",
        ".tiktok <url> photo · every slide, one by one",
      ] },
      { title: "Notes", rows: [
        "· media comes from tikwm.com",
        "· private or removed posts return an error",
      ] },
    ],
  },
  tts: {
    format: ".tts <text>",
    about: "text to speech",
    sections: [
      { title: "Usage", rows: [
        ".tts hello there · voice note back to chat",
        "· english voice, google tts",
      ] },
    ],
  },
  scan: {
    format: ".scan <url>",
    about: "url safety check",
    sections: [
      { title: "Usage", rows: [
        ".scan https://example.com · google safe browsing lookup",
        "· replies safe or suspicious",
      ] },
    ],
  },
  hitung: {
    format: ".hitung <expression>",
    about: "calculator",
    sections: [
      { title: "Usage", rows: [
        ".hitung 12 * (3 + 4) · result back to chat",
        "· digits, + - * / ( ) % and . only",
      ] },
    ],
  },
  shorturl: {
    format: ".shorturl <url>",
    about: "shorten url",
    sections: [
      { title: "Usage", rows: [
        ".shorturl https://example.com/long/path · tinyurl shortlink",
      ] },
    ],
  },
  morse: {
    format: ".morse <text> / .textmorse <code>",
    about: "morse",
    sections: [
      { title: "Usage", rows: [
        ".morse hello · text to morse",
        ".textmorse .... . .-.. .-.. --- · morse to text",
      ] },
    ],
  },
  encode64: {
    format: ".encode64 <text> / .decode64 <code>",
    about: "base64",
    sections: [
      { title: "Usage", rows: [
        ".encode64 hello world · text to base64",
        ".decode64 aGVsbG8= · base64 to text",
      ] },
    ],
  },
  biner: {
    format: ".biner <text> / .binarytext <code> / .textbinary <text>",
    about: "binary",
    sections: [
      { title: "Usage", rows: [
        ".biner hello · text to binary, one row per character",
        ".textbinary hello · text to one binary line",
        ".binarytext 01101000 · binary back to text",
      ] },
    ],
  },
  sticker: {
    format: ".sticker / .s",
    about: "image → sticker",
    sections: [
      { title: "Usage", rows: [
        ".sticker · image attached to the message",
        ".sticker · or reply to an image with .sticker",
        ".s · alias",
      ] },
      { title: "Output", rows: [
        "· 512×512 webp sticker",
      ] },
    ],
  },
  help: {
    format: ".help [command]",
    about: "help for one command",
    sections: [
      { title: "Usage", rows: [
        ".help · grouped list, same sections as .menu",
        ".help yt · usage and flags for one command",
        ".yt --help · same as .help yt",
      ] },
    ],
  },
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
  if (!entry.sections?.length) return heading;
  const blocks = entry.sections.map((section) => [`› ${section.title}`, ...section.rows].join("\n"));
  return [heading, "", blocks.join("\n\n")].join("\n");
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