# Kamui-Bot

WhatsApp bot built on Baileys v6 and Node.js. It downloads media (YouTube, TikTok, anime via ani-cli), stores large files in Google Drive, and bundles small text utilities. Version 3.0.0, ESM (`"type": "module"`).

## Requirements

- Node.js 20 or newer (`engines.node` is `>=20`; the test runner needs `node --test`)
- `ffmpeg` on `PATH`; yt-dlp uses it to extract MP3 and mux MP4, and the anime handler embeds downloaded subtitles with it
- `python3.11` on `PATH`; `youtube-dl-exec` runs as `python3.11 <youtube-dl-binary>`, override with `YOUTUBE_DL_PYTHON`
- Google OAuth client and token for the Drive commands (see Drive setup)
- `ani-cli` on `PATH` for `.anime`, plus a `yt-dlp` executable on `PATH` that runs under Python 3.11 (ani-cli prefers it over the system `ffmpeg`)
- `tools/ani-pick-first` installed as `/usr/local/bin/ani-pick-first` so ani-cli can pick the first result without an interactive menu

## Install and run

```bash
git clone git@github.com:vq6oon/bot-whatsapp.git
cd bot-whatsapp
npm ci
npm start
```

`npm start` runs `node bot.js`, which loads `.env` through `dotenv/config` and calls `startBot()` in `src/bot.js`. On first start a QR code is printed; scan it from WhatsApp → Linked Devices. The session is stored in `data/auth_info/` (`useMultiFileAuthState`), so later starts do not need another scan. Set `WA_PAIR_NUMBER` in `.env` to log in with a pairing code instead. The code is requested three seconds after socket creation and printed as `Pairing code: XXXXXXXX`.

Runtime files, all under `data/` and ignored by Git: `data/auth_info/` (session), `data/downloads/`, `data/logs/`.

## Environment

Eight variables are read by the code:

```dotenv
# Bot phone number for pairing-code login; empty means QR login
WA_PAIR_NUMBER=

# Google Drive folder that stores uploads and YouTube downloads
DRIVE_FOLDER_ID=

# Python interpreter used to run the bundled yt-dlp binary (default: python3.11)
YOUTUBE_DL_PYTHON=

# Absolute path to a yt-dlp binary; wins over the bundled one
YTDLP_BIN=

# Cookies export for YouTube bot checks (Netscape format)
YOUTUBE_COOKIES=

# ani-cli executable, menu shim, and download timeout in ms
ANI_CLI_BIN=ani-cli
ANI_CLI_MENU=/usr/local/bin/ani-pick-first
ANI_DL_TIMEOUT_MS=900000
```

`DRIVE_FOLDER_ID` is required by every Drive command. When it is empty, `.checkdrive`, `.list`, `.upload`, and `.yt` reply with a configuration warning instead of calling the API. `.ytm` needs no folder because it returns the MP3 to the chat. `.anime` needs it for downloads because the episode is streamed to Drive.

## Google Drive setup

1. Create an OAuth client of type *Desktop app* in Google Cloud Console, enable the Drive API, and save the JSON as `credentials/credentials.json`.
2. Run `node get_token.js` on a machine with a browser. It prints an authorization URL, asks for the pasted code, and writes `credentials/token.json`.
3. Restart the bot.

Both files are ignored by Git. The requested scope is `https://www.googleapis.com/auth/drive` (`DRIVE.scopes` in `src/config.js`), which is what lets the bot list and read a folder it did not create. With the narrower `drive.file` scope, Google answers 403/404 for pre-existing folders and the handlers tell the user to re-run OAuth.

## Commands

One handler runs per message: `src/router.js` walks `HANDLERS` in order and executes the first `match(ctx)` that returns true.

| Command | Behavior |
| --- | --- |
| `.menu` | Banner image plus compact command list; each downloader links to `(.help <cmd>)` |
| `.help [command]` | Grouped command list with the same sections as `.menu`, or one command's usage (`<command> --help` works too) |
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
| `.anime <title> [-e <episode>] [-q <quality>] [--format-list] [--search] [--info\|-i]` | Download anime episodes with ani-cli (`<q>` = best, worst, or offered `360`/`480`/`720`/`1080`; `--720` also works) and stream them to Drive. `--info` (or `-i`) looks up a title and sends its cover and synopsis, `--search` lists anime titles, `--format-list` lists the qualities of one episode, all without downloading. Titles must be quoted, `-e 1-3` downloads episodes 1-3 (max 20), quality defaults to `best`, episode defaults to `1`. Without any flag the bot replies with the usage hint |
| `.shorturl <url>` | TinyURL shortlink |
| `.morse <text>` / `.textmorse <code>` | Morse encode/decode |
| `.encode64 <text>` / `.decode64 <code>` | Base64 encode/decode |
| `.biner <text>`, `.textbinary <text>`, `.binarytext <code>` | Binary conversion |
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
src/services/           drive.js, youtube.js, media.js (Baileys media download), anime.js (search + ani-cli runner)
src/utils/morse.js      Morse tables
handler/                one module per command (yt.js and ytm.js are separate), each exporting name, match, run
tests/                  node:test suites, no WhatsApp session needed
tools/panel.js          optional browser editor for bot.js, port 3000
```

A handler module exports `name`, `match(ctx)`, and `run(ctx, ...injectableDeps)`. `dispatch()` returns the name of the handler that matched, or `null`. Every handler receives `sock`, `msg`, `from`, `sender`, `text`, `quoted`, `quotedContext`, `sendText`; the Drive, YouTube, and anime-download handlers also take an injected service object so tests can stub the API.

## YouTube commands

`.yt` is video only. The quality flag is a `--` argument, not a bare number: `.yt <url> --720`. Accepted values are `--360`, `--480`, `--720`, `--1080`, and `--best`; omitting the flag means `best`. Anything else, such as a bare `720`, `--999`, or a second argument, is rejected with the format hint before any download starts. `youtube.com`, any `*.youtube.com` host, and `youtu.be` pass; lookalike domains such as `youtube.com.evil.example` do not. The MP4 is uploaded to Drive and the reply carries the link, so `DRIVE_FOLDER_ID` must be set.

`.ytm` takes only a URL and always produces an MP3: `downloadYoutube(url, "mp3", "best")`, then `sock.sendMessage` with `audio`, `mimetype: audio/mpeg`, `fileName`, and `ptt: false`. The audio message comes back to the chat, not Drive, so no folder is needed.

Both handlers delete the temporary download in a `finally` block, and both turn yt-dlp exit code 1 into "YouTube rejected the download or the format is unavailable" instead of leaking stderr. `downloadYoutube` tries three format selectors in order (strict mp4, then `bv*+ba/b`, then a single best stream) and clears partial files between attempts, because Shorts and some uploads only expose one codec family.

The bundled yt-dlp ages out as YouTube changes its player. `YTDLP_BIN=/path/to/yt-dlp` replaces it without touching `node_modules`, and `YOUTUBE_COOKIES=/path/to/cookies.txt` passes a Netscape cookies export for the "Sign in to confirm you're not a bot" check. The reply now carries one `· reason: <last yt-dlp line>` line so a failure names its cause instead of guessing.

## Anime command

One command covers download, info, and search. `.anidl` and `.getani` are gone; both now get the unknown-command reply.

`.anime <title> [-e <episode>] [-q <quality>] [--info|-i] [--search] [--format-list]` runs ani-cli in non-interactive download mode: `-d -S 1 -e <n> -q <q> <title>` once per episode. `-S 1` takes the first search result, `-e` chooses one episode or an inclusive range (default `1`, max 20 episodes), and the quality defaults to `best`.

Flags work in any position, and the examples put the title first: `.anime "one piece" -e 3 -q 720`, `.anime "naruto" --info`, `.anime "dandadan" --search`. Quality can be given as `-q 720` or as `--720`; `--episode` and `--quality` are aliases of `-e` and `-q`. The bot rejects a bare `720`, an unknown flag, an invalid range, `-e`/`-q` without a value, an unterminated quote, and a title with no words before ani-cli runs.

A message with no flag at all downloads nothing. The bot replies with `Format: .anime <title> ...` and `Details: .help anime`, so someone who only wants to read about a title cannot start a download by accident.

`--info` (or `-i`) searches `api.tenrai.org`, then sends the cover image with episodes, score, air date, and synopsis. A title with no match replies `No anime found for <query>. Try: .anime "<query>" --search`. `--format-list` probes the first episode and replies with `Available formats` plus a ready-to-copy `-q` command.

`--search` lists titles from ani-cli's own index through a capture shim for the menu program: the shim reads the numbered list from stdin and exits, and the bot strips the numbering and ANSI codes. Titles therefore match the ones the downloader will pick, unlike `--info`, which still reads the MAL-based API. A query with a single match makes ani-cli skip the title menu and print episode numbers instead, so the bot answers `No title list for <query>. ani-cli may have a single match; try: .anime "<query>" -e 1`.

ani-cli saves a `.vtt` next to the episode whenever the selected source ships subtitles. `downloadAnimeEpisode` finds the newest `.vtt`/`.srt`/`.ass`/`.ssa` in the job directory and muxes it with ffmpeg before the Drive upload: `mov_text` into the original MP4 name for mp4/m4v/mov, with an MKV + `srt` remux as fallback. The muxed file replaces the raw download, so the Drive name keeps its `(720p)` suffix and the subtitle track rides along. When ffmpeg is missing or the mux fails, the bot uploads the raw video and logs the reason.

Before downloading, the bot probes ani-cli in `debug` player mode to read the offered streams (the `All links:` block). If the requested quality is not among them it fails fast with the list, e.g. requesting `--720` on a series that only offers 1080p replies:

```
✗ Quality 720 is not available for one piece episode 1.
Available qualities: 1080p
Try: .anime "one piece" -e 1 -q 1080
```

The downloader sets `ANI_CLI_PLAYER=/bin/true` (ani-cli checks for a player even in download mode), `ANI_CLI_MENU=/usr/local/bin/ani-pick-first` (picks the first row instead of opening fzf), and `ANI_CLI_DOWNLOAD_DIR=data/downloads/anime/<timestamp>-<uuid>`. Each run gets its own directory, so leftover files cannot make yt-dlp skip the download. The bot uploads the freshest `.mp4`, `.mkv`, `.webm`, or `.m4v` to `DRIVE_FOLDER_ID`, replies with the Drive link, then deletes the directory. A missing binary becomes "ani-cli is not installed on the server", and a killed/timeout run becomes "Anime download timed out".

Install the host-side pieces once:

```bash
curl -sSL https://raw.githubusercontent.com/pystardust/ani-cli/master/ani-cli -o /usr/local/bin/ani-cli
chmod +x /usr/local/bin/ani-cli
install -m 755 tools/ani-pick-first /usr/local/bin/ani-pick-first
```

If `yt-dlp` is not on `PATH`, ani-cli falls back to `ffmpeg`; in that case the ffmpeg build must understand `-extension_picky` or the download fails. `ANI_CLI_BIN`, `ANI_CLI_MENU`, and `ANI_DL_TIMEOUT_MS` override the defaults.

## Google Drive behavior

- `src/services/drive.js` reads `credentials/credentials.json` (installed or web client) and `credentials/token.json`, then builds a Drive v3 client per call. Expired tokens are refreshed by the `googleapis` client.
- `uploadToDrive` accepts a file path (streamed with `createReadStream`) or a buffer (`Readable.from`). It looks for the exact name in `DRIVE_FOLDER_ID` first: a match is returned as-is with `reused: true` and its link is reported, with no `(2)` suffix and no new file. Only a free name is uploaded. Sharing permissions are never changed.
- `.anime` labels output with the selected quality. `.yt` probes the downloaded file with `ffprobe` and labels it with the actual short-edge resolution (`clip (360p).mp4`), so a `--1080` request that resolves to 360p is reported honestly. `.ytm` sends audio in chat and does not use Drive.
- `listDriveFiles` walks `nextPageToken` in 100-file pages ordered by name; `getDriveQuota` reports usage, limit, and free space in GB.
- `.list` groups files by extension into audio, video, document, and photo.
- 401/403/404 responses are translated into OAuth and folder-permission hints.

## Tests

```bash
npm test
# same as: node --test tests/drive.test.js tests/yt.test.js tests/anime.test.js tests/help.test.js tests/router.test.js
```

98 tests. `tests/drive.test.js` covers `.checkdrive`, `.list`, `.upload`, their progress lines, file filtering, exact-name reuse, filename helpers, and the menu caption. `tests/yt.test.js` covers the `.yt`/`.ytm` split: progress lines, resolution probing and fallback labels, default and `--` quality flags, rejection of bare qualities and lookalike hosts, the yt-dlp command resolver and failure detail, the missing-folder guard, Drive upload failure, extractor exit code 1, temporary file cleanup, the audio payload `.ytm` sends, and command-prefix matching. `tests/anime.test.js` covers argument parsing, the usage hint when no flag is given, `--info` and `--search` without downloads, the ani-cli menu capture and title parsing, subtitle discovery and muxing, the Drive upload and caption, cleanup, failure messages, the missing-folder guard, ani-cli's non-interactive flags and fresh-file selection, the quality probe with its format-list error, and the removal of `.anidl` and `.getani`. `tests/help.test.js` covers the `.help` listing, the shared menu catalog, menu-style sections for per-command help, aliases, `<command> --help`, the anime help entry, and emoji/em-dash-free help text. `tests/router.test.js` covers the unknown-message reply and removed-command fallbacks. No network, no WhatsApp session, and no real Drive call: the Drive client and downloader are injected. Use Node 20 or newer; Node 12 rejects `--test`.

## Notes

- Only one message per upsert is handled (`messages[0]`), and `dispatch` stops at the first matching handler.
- `tools/panel.js` writes edits into `bot.js` over HTTP and needs `body-parser` plus `panel/index.html`; neither ships in this repository, so treat it as a local scratch tool only.
- Never commit `.env`, `credentials/`, or `data/`.