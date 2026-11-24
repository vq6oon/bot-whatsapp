import fs from "fs";
import { BOT_VERSION, DEVELOPER, PATHS } from "../src/config.js";

export const name = "menu";

export function match(ctx) {
  return ctx.text === ".menu";
}

export async function run({ sock, from }) {
  return sock.sendMessage(from, {
    image: fs.readFileSync(PATHS.banner),
    caption: `Lamp1on-Bot

Type .rules for usage rules.

Information
├ .menu — Show this menu
├ .info — Show bot information
├ .rules — Show usage rules
└ .statusbot — Show bot status

Google Drive (na)
└ Not integrated

General tools
├ .tts <text> — Convert text to speech
├ .morse <text> — Encode text as Morse code
├ .textmorse <code> — Decode Morse code
├ .encode64 <text> — Encode Base64
├ .decode64 <code> — Decode Base64
├ .hitung <expression> — Calculate expression
├ .shorturl <url> — Shorten URL
├ .scan <url> — Check URL safety
└ .deviceinfo — Show device information

Search
└ .anime <title> — Search anime

Games
├ .tebakhewan — Start animal guessing game
└ .tebak <answer> — Submit answer

Downloader
├ .ytdl <url> [360|720|1080|best] — Download YouTube video
├ .ytdl <url> mp3 — Download YouTube audio
└ .tiktok <url> [video|hd|audio|photo] — Download media

Version ${BOT_VERSION} · ${DEVELOPER}`,
  });
}
