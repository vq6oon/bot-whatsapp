import fs from "fs";
import { google } from "googleapis";
import { DRIVE } from "./src/config.js";

// Run on a machine with a browser, not on the VPS.
// The output is credentials/token.json.
const credentials = JSON.parse(
  fs.readFileSync(DRIVE.credentialsPath, "utf-8"),
);
const { client_id, client_secret, redirect_uris } = credentials.installed;

const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0],
);

const url = oAuth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: DRIVE.scopes,
});

console.log("Open this URL in a browser:\n");
console.log(url);

const readline = await import("node:readline/promises");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const code = await rl.question("\nPaste the code from the browser: ");
rl.close();

const { tokens } = await oAuth2Client.getToken(code.trim());
fs.mkdirSync("credentials", { recursive: true });
fs.writeFileSync(DRIVE.tokenPath, JSON.stringify(tokens, null, 2));
console.log(`Token saved to ${DRIVE.tokenPath}`);
