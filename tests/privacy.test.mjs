import assert from "node:assert/strict";
import { BOT_NAME, DEVELOPER, GITHUB } from "../src/config.js";

assert.equal(BOT_NAME, "Lamp1on-Bot");
assert.equal(DEVELOPER, "@vq6oon");
assert.equal(GITHUB, "github.com/vq6oon");
console.log("public config privacy checks passed");
