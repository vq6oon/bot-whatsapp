import os from "os";
import fs from "fs";
import prettyMs from "pretty-ms";
import { PATHS } from "../src/config.js";

export const name = "deviceinfo";

export function match(ctx) {
  return ctx.text === ".deviceinfo";
}

const formatBytes = (bytes) => (bytes / 1024 / 1024 / 1024).toFixed(2) + " GB";

function readOsName() {
  try {
    const osRelease = fs.readFileSync("/etc/os-release", "utf-8");
    const prettyName = osRelease.match(/^PRETTY_NAME="(.+?)"$/m);
    if (prettyName) return prettyName[1];
  } catch {
    // Ignore the error and use the default value.
  }
  return "Linux";
}

function readCpuModel() {
  try {
    const cpus = os.cpus();
    if (cpus && cpus.length > 0) return cpus[0].model;
  } catch {
    // Ignore the error and use the default value.
  }
  return "Unknown";
}

export async function run({ sock, from }) {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const uptimeMs = os.uptime() * 1000;

  const deviceInfo = [
    "🖥️ *Device Status*",
    "",
    `📦 OS        : ${readOsName()} (${os.arch()})`,
    `🧠 Kernel    : ${os.type()} ${os.release()}`,
    `⚙️ CPU       : ${readCpuModel()}`,
    `🔩 Cores     : ${os.cpus()?.length || "?"}`,
    `🗂️ RAM       : ${formatBytes(usedMemory)} / ${formatBytes(totalMemory)}`,
    `⏱️ Uptime    : ${prettyMs(uptimeMs, { verbose: true, secondsDecimalDigits: 0 })}`,
    "",
    "🐧 i use arch, btw",
  ].join("\n");

  await sock.sendMessage(from, {
    image: fs.readFileSync(PATHS.deviceBanner),
    caption: deviceInfo,
  });
}
