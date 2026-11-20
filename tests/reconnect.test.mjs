import assert from "node:assert/strict";
import { scheduleReconnect } from "../src/reconnect.js";

const scheduled = [];
const errors = [];
const logger = { error: (...args) => errors.push(args) };

assert.equal(scheduleReconnect({
  reason: 401,
  loggedOutReason: 401,
  restart: async () => {},
  logger,
  setTimer: (callback, delay) => scheduled.push({ callback, delay }),
}), false);
assert.equal(scheduled.length, 0, "logged-out socket must not restart");

assert.equal(scheduleReconnect({
  reason: 428,
  loggedOutReason: 401,
  restart: async () => { throw new Error("restart failed"); },
  logger,
  setTimer: (callback, delay) => scheduled.push({ callback, delay }),
}), true);
assert.equal(scheduled.length, 1);
assert.equal(scheduled[0].delay, 2000);
await scheduled[0].callback();
assert.ok(errors.some((args) => String(args[0]).includes("closed")));
assert.ok(errors.some((args) => String(args[0]).includes("reconnect failed")));

console.log("reconnect tests passed");
