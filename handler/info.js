import fs from "fs";
import { BOT_NAME, BOT_VERSION, DEVELOPER, GITHUB, PATHS } from "../src/config.js";

export const name = "info";

export function match(ctx) {
  return ctx.text === ".info";
}

export async function run({ sock, from }) {
  return sock.sendMessage(from, {
    image: fs.readFileSync(PATHS.banner),
    caption: [
      "Bot information",
      "",
      `Name      · ${BOT_NAME}`,
      `Developer · ${DEVELOPER}`,
      "Language  · JavaScript",
      "Framework · Baileys v6",
      "Platform  · WhatsApp",
      `GitHub    · ${GITHUB}`,
      `Version   · ${BOT_VERSION}`,
    ].join("\n"),
  });
}
