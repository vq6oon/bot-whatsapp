import fs from "fs";
import { PATHS } from "./config.js";

export function logToFile(message) {
  const today = new Date().toISOString().slice(0, 10);
  fs.mkdirSync(PATHS.logs, { recursive: true });
  fs.appendFileSync(`${PATHS.logs}/${today}.log`, message + "\n");
}

export function createMessageLogger({ console: writeConsole = console.log, file = logToFile } = {}) {
  return {
    incoming(message) {
      writeConsole(message);
      file(message);
    },
    outgoing(message) {
      file(message);
    },
  };
}

export function logLine(message) {
  console.log(message);
  logToFile(message);
}

export function timeNow() {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}
