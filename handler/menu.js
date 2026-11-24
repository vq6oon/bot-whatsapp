import fs from "fs";
import { BOT_VERSION, DEVELOPER, PATHS } from "../src/config.js";

export const name = "menu";

export function match(ctx) {
  return ctx.text === ".menu";
}

export async function run({ sock, from }) {
  const caption = [
    `Lamp1on-Bot · ${BOT_VERSION}`,
    "",
    "Info",
    ".help [command] · help for one command",
    ".info · bot information",
    ".rules · usage rules",
    "",
    "Download",
    ".yt <url> · YouTube video to Drive (.help yt)",
    ".ytm <url> · YouTube audio to chat (.help ytm)",
    ".anidl <title> · anime to Drive (.help anidl)",
    ".tiktok <url> · TikTok media (.help tiktok)",
    "",
    "Drive",
    ".checkdrive · folder status",
    ".list [type] · list files (.help list)",
    ".upload [name] · upload media",
    "",
    "Search",
    ".getani <title> · anime search (.help getani)",
    ".scan <url> · URL safety check",
    ".shorturl <url> · shorten URL",
    "",
    "Tools",
    ".tts <text> · text to speech",
    ".hitung <expression> · calculator",
    ".morse / .textmorse · Morse",
    ".encode64 / .decode64 · Base64",
    ".biner / .binarytext · binary",
    ".deviceinfo · device info",
    ".tebakhewan / .tebak · guessing game (.help tebak)",
    ".sticker / .s · image to sticker",
    "",
    DEVELOPER,
  ].join("\n");

  return sock.sendMessage(from, {
    image: fs.readFileSync(PATHS.banner),
    caption,
  });
}
