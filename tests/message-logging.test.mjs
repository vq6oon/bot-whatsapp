import assert from "node:assert/strict";
import { createMessageLogger } from "../src/logger.js";

const consoleLines = [];
const fileLines = [];
const logger = createMessageLogger({
  console: (line) => consoleLines.push(line),
  file: (line) => fileLines.push(line),
});

logger.incoming("[12:00:00] 15550000001@s.whatsapp.net ➜ halo");
logger.outgoing("[12:00:01] Bot ➜ Hai");

assert.deepEqual(consoleLines, ["[12:00:00] 15550000001@s.whatsapp.net ➜ halo"]);
assert.deepEqual(fileLines, [
  "[12:00:00] 15550000001@s.whatsapp.net ➜ halo",
  "[12:00:01] Bot ➜ Hai",
]);

console.log("message logging test passed");
