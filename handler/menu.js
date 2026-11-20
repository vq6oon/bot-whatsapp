import fs from "fs";
import { BOT_VERSION, DEVELOPER, PATHS } from "../src/config.js";

export const name = "menu";

export function match(ctx) {
  return ctx.text === ".menu";
}

export async function run({ sock, from }) {
  return sock.sendMessage(from, {
    image: fs.readFileSync(PATHS.banner),
    caption: `✨ Welcome to Lamp1on-Bot!
Type *.rules* to read the usage rules.

┌─ 📄 *Information*
├ .menu - Show the bot menu
├ .info - Show bot information
├ .rules - Show usage rules
└ .statusbot - Show system status

┌─ ☁️ *Google Drive* (na)
└ Not integrated yet.

┌─ 🧰 *General Tools*
├ .tts <text> - Convert text to speech
├ .morse <text> - Encode text as Morse code
├ .textmorse <code> - Decode Morse code
├ .encode64 <text> - Encode Base64
├ .decode64 <code> - Decode Base64
├ .hitung <expression> - Calculator
├ .shorturl <url> - Shorten a URL
├ .scan <url> - Check URL safety
└ .deviceinfo - Show bot device information

┌─ 🔍 *Search & Information*
└ .anime <title> - Search anime information

┌─ 🎮 *Mini Game*
├ .tebakhewan - Start the animal guessing game
└ .tebak <answer> - Submit an answer

┌─ 📥 *Downloader*
└ .tiktok <url> [video|audio|photo] - Download TikTok media

⚠️ *Important:*
Do not upload illegal, pornographic, or violent content.
Users are responsible for their use of this bot.

🔖 *Version:* ${BOT_VERSION} - Lamp1on-Bot by ${DEVELOPER}`,
  });
}
