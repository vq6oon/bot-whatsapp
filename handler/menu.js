import fs from "fs";
import { BOT_VERSION, DEVELOPER, PATHS } from "../src/config.js";

export const name = "menu";

export function match(ctx) {
  return ctx.text === ".menu";
}

export async function run({ sock, from }) {
  return sock.sendMessage(from, {
    image: fs.readFileSync(PATHS.banner),
    caption: `Lamp1on-Bot\n\nType .rules for usage rules.\n\nInformation\n├ .help [command] — Show help for every / one command\n├ .info — Show bot information\n└ .rules — Show usage rules\n\nDownloader\n├ .yt <url> — YouTube video to Drive (.help yt)\n├ .ytm <url> — YouTube audio to chat (.help ytm)\n├ .anidl <title> — Anime to Drive (.help anidl)\n└ .tiktok <url> — TikTok media (.help tiktok)\n\nGoogle Drive\n├ .checkdrive — Check Drive folder status\n├ .list [type] — List Drive files (.help list)\n└ .upload [name] — Upload media to Drive\n\nSearch\n├ .getani <title> — Search anime (.help getani)\n├ .scan <url> — Check URL safety\n└ .shorturl <url> — Shorten URL\n\nGeneral tools\n├ .tts <text> — Text to speech\n├ .hitung <expression> — Calculate\n├ .morse / .textmorse — Morse\n├ .encode64 / .decode64 — Base64\n├ .biner / .binarytext — Binary\n├ .deviceinfo — Device info\n└ .tebakhewan / .tebak — Guessing game (.help tebak)\n\nSticker: .sticker / .s (attach an image)\n\nVersion ${BOT_VERSION} · ${DEVELOPER}`,
  });
}
