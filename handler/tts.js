import fs from "fs";
import gTTS from "gtts";
import { PATHS } from "../src/config.js";

export const name = "tts";

export function match(ctx) {
  return ctx.text.startsWith(".tts ");
}

export async function run({ text, sock, from, sendText }) {
  const input = text.slice(5).trim();
  if (!input) return sendText("✗ Enter text to convert to speech.");

  const speech = new gTTS(input, "en");
  const outputPath = `${PATHS.downloads}/tts_${Date.now()}.mp3`;

  speech.save(outputPath, async (error) => {
    if (error) {
      console.error("tts:", error?.message || error);
      return sendText("✗ Failed to generate speech.");
    }

    const audio = fs.readFileSync(outputPath);
    await sock.sendMessage(from, {
      audio,
      mimetype: "audio/mpeg",
      ptt: true,
    });
    fs.unlinkSync(outputPath);
  });
}
