import fs from "fs";
import { BOT_NAME, BOT_VERSION, DEVELOPER, PATHS } from "../src/config.js";
import { catalogLines } from "./help.js";

export const name = "menu";

export function match(ctx) {
  return ctx.text === ".menu";
}

export async function run({ sock, from }) {
  const caption = [
    `${BOT_NAME} · ${BOT_VERSION}`,
    "",
    ...catalogLines({ helpLinks: true }),
    "",
    DEVELOPER,
  ].join("\n");

  return sock.sendMessage(from, {
    image: fs.readFileSync(PATHS.banner),
    caption,
  });
}
