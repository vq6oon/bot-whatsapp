# Lamp1on-Bot

WhatsApp bot built on Baileys v6 and Node.js. It downloads media (YouTube, TikTok), stores large files in Google Drive, and bundles small text utilities. Version 2.0.0, ESM (`"type": "module"`).

## Requirements

- Node.js 20 or newer (`engines.node` is `>=20`; the test runner needs `node --test`)
- `ffmpeg` on `PATH` — yt-dlp uses it to extract MP3 and mux MP4
- `python3.11` on `PATH` — `youtube-dl-exec` is invoked as `python3.11 <youtube-dl-binary>`; override with `YOUTUBE_DL_PYTHON`
- Google OAuth client and token for the Drive commands (see Drive setup)

## Install and run

```bash
git clone git@github.com:vq6oon/bot-whatsapp.git
cd bot-whatsapp
npm ci
npm start
```

`npm start` runs `node bot.js`, which loads `.env` through `dotenv/config` and calls `startBot()` in `src/bot.js`. On first start a QR code is printed; scan it from WhatsApp → Linked Devices. The session is stored in `data/auth_info/` (`useMultiFileAuthState`), so later starts do not need another scan. Set `WA_PAIR_NUMBER` in `.env` to log in with a pairing code instead — the code is requested three seconds after socket creation and printed as `Pairing code: XXXXXXXX`.

Runtime files, all under `data/` and ignored by Git: `data/auth_info/` (session), `data/downloads/`, `data/logs/`.

## Environment

Three variables are read by the code:

```dotenv
# Bot phone number for pairing-code login; empty means QR login
WA_PAIR_NUMBER=

# Google Drive folder that stores uploads and YouTube downloads
DRIVE_FOLDER_ID=

# Python interpreter used to run the bundled yt-dlp binary (default: python3.11)
YOUTUBE_DL_PYTHON=
```

`DRIVE_FOLDER_ID` is required by every Drive command. When it is empty, `.checkdrive`, `.list`, `.upload`, and `.yt` reply with a configuration warning instead of calling the API. `.ytm` needs no folder because it returns the MP3 to the chat.

## Google Drive setup

1. Create an OAuth client of type *Desktop app* in Google Cloud Console, enable the Drive API, and save the JSON as `credentials/credentials.json`.
2. Run `node get_token.js` on a machine with a browser. It prints an authorization URL, asks for the pasted code, and writes `credentials/token.json`.
3. Restart the bot.

Both files are ignored by Git. The requested scope is `https://www.googleapis.com/auth/drive` (`DRIVE.scopes` in `src/config.js`), which is what lets the bot list and read a folder it did not create. With the narrower `drive.file` scope, Google answers 403/404 for pre-existing folders and the handlers tell the user to re-run OAuth.

## Commands

One handler runs per message: `src/router.js` walks `HANDLERS` in order and executes the first `match(ctx)` that returns true.

| Command | Behavior |
| --- | --- |
| `.menu` | Banner image plus grouped command list |
| `.info` | Bot name, developer, framework, version from `src/config.js` |
| `.rules` | Usage rules |
| `.checkdrive` | Drive folder name, file count, folder link |
| `.list [audio\|video\|document\|photo]` | Files in the Drive folder, optionally filtered by extension, one link per file |
| `.upload [name]` | Upload the attached or quoted media (image, video, audio, document, sticker) to Drive |
| `.yt <url> --<360\|480\|720\|1080\|best>` | YouTube video only: streamed to Drive, replies with the link. Without the flag it downloads `best` |
| `.ytm <url>` | YouTube audio: downloads an MP3 and sends it to the chat as a playable audio message |
| `.tiktok <url> [video\|hd\|audio\|photo]` | TikTok via tikwm.com; `hd` prefers `hdplay`, `photo` sends each slide |
| `.tts <text>` | Google TTS voice note (`gtts`, English) |
| `.scan <url>` | Google Safe Browsing diagnostic lookup |
| `.hitung <expression>` | Calculator; input is restricted to digits, operators, parentheses, space, `%`, `.` |
| `.anime <title>` | Anime search via `api.tenrai.org`, sends the cover image when available |
| `.shorturl <url>` | TinyURL shortlink |
| `.deviceinfo` | Host OS, kernel, CPU, cores, RAM, uptime |
| `.morse <text>` / `.textmorse <code>` | Morse encode/decode |
| `.encode64 <text>` / `.decode64 <code>` | Base64 encode/decode |
| `.biner <text>`, `.textbinary <text>`, `.binarytext <code>` | Binary conversion |
| `.tebakhewan` / `.tebak <answer>` | Animal guessing game, 60 second timeout, one game per process |
| `.sticker` / `.s` | Convert an image to a 512×512 WebP sticker (`sharp`) |

## Project layout

```
bot.js                  entry point: dotenv plus startBot()
get_token.js            one-time OAuth flow, writes credentials/token.json
src/bot.js              Baileys socket, QR and pairing login, message dispatch, reconnect
src/router.js           HANDLERS registry and first-match dispatch
src/config.js           bot identity, PATHS, DRIVE settings
src/logger.js           console plus data/logs/<date>.log logging
src/message-filter.js   skips own messages and @channel traffic
src/reconnect.js        2 second reconnect, stops on loggedOut
src/services/           drive.js, youtube.js, media.js (Baileys media download), anime.js
src/utils/morse.js      Morse tables
src/data/animals.js     guessing-game answers
handler/                one module per command (yt.js and ytm.js are separate), each exporting name, match, run
tests/                  node:test suites, no WhatsApp session needed
tools/panel.js          optional browser editor for bot.js, port 3000
```

A handler module exports `name`, `match(ctx)`, and `run(ctx, ...injectableDeps)`. `dispatch()` returns the name of the handler that matched, or `null`. Every handler receives `sock`, `msg`, `from`, `sender`, `text`, `quoted`, `quotedContext`, `sendText`; the Drive and YouTube handlers also take an injected service object so tests can stub the API.

## YouTube commands

`.yt` is video only. The quality flag is a `--` argument, not a bare number: `.yt <url> --720`. Accepted values are `--360`, `--480`, `--720`, `--1080`, and `--best`; omitting the flag means `best`. Anything else — a bare `720`, `--999`, a second argument — is rejected with the format hint before any download starts. `youtube.com`, any `*.youtube.com` host, and `youtu.be` pass; lookalike domains such as `youtube.com.evil.example` do not. The MP4 is uploaded to Drive and the reply carries the link, so `DRIVE_FOLDER_ID` must be set.

`.ytm` takes only a URL and always produces an MP3: `downloadYoutube(url, "mp3", "best")`, then `sock.sendMessage` with `audio`, `mimetype: audio/mpeg`, `fileName`, and `ptt: false`. The audio message comes back to the chat, not Drive, so no folder is needed.

Both handlers delete the temporary download in a `finally` block, and both turn yt-dlp exit code 1 into "YouTube menolak unduhan atau format tidak tersedia" instead of leaking stderr.

## Google Drive behavior

- `src/services/drive.js` reads `credentials/credentials.json` (installed or web client) and `credentials/token.json`, then builds a Drive v3 client per call. Expired tokens are refreshed by the `googleapis` client.
- `uploadToDrive` accepts a file path (streamed with `createReadStream`) or a buffer (`Readable.from`). It creates a new file inside `DRIVE_FOLDER_ID`; it does not replace same-name files and does not change sharing permissions.
- `listDriveFiles` walks `nextPageToken` in 100-file pages ordered by name; `getDriveQuota` reports usage, limit, and free space in GB.
- `.list` groups files by extension into audio, video, document, and photo.
- 401/403/404 responses are translated into OAuth and folder-permission hints.

## Tests

```bash
npm test
# same as: node --test tests/drive.test.js tests/yt.test.js
```

23 tests. `tests/drive.test.js` covers `.checkdrive`, `.list`, `.upload`, file filtering, and the menu caption. `tests/yt.test.js` covers the `.yt`/`.ytm` split: default and `--` quality flags, rejection of bare qualities and lookalike hosts, the missing-folder guard, Drive upload failure, extractor exit code 1, temporary file cleanup, the audio payload `.ytm` sends, and command-prefix matching. No network, no WhatsApp session, and no real Drive call: the Drive client is injected. Use Node 20 or newer — Node 12 rejects `--test`.

## Notes

- Only one message per upsert is handled (`messages[0]`), and `dispatch` stops at the first matching handler.
- `tools/panel.js` writes edits into `bot.js` over HTTP and needs `body-parser` plus `panel/index.html`; neither ships in this repository, so treat it as a local scratch tool only.
- Never commit `.env`, `credentials/`, or `data/`.
