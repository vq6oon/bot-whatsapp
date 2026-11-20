import sharp from "sharp";
import { downloadQuotedBuffer, downloadOwnBuffer } from "../src/services/media.js";

export const name = "sticker";

export function match(ctx) {
  return ctx.text === ".sticker" || ctx.text === ".s";
}

export async function run({ sock, msg, from, quoted, quotedContext, sendText }) {
  let buffer = null;

  if (quoted?.imageMessage) {
    buffer = await downloadQuotedBuffer(quoted, quotedContext);
  } else if (msg.message?.imageMessage) {
    buffer = await downloadOwnBuffer(msg);
  }

  if (!buffer) return sendText("❌ Send or reply to an image.");

  const webp = await sharp(buffer).resize(512, 512).webp().toBuffer();
  await sock.sendMessage(from, { sticker: webp });
}
