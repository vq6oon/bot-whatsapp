# Lamp1on-Bot

WhatsApp bot for media downloads and lightweight text utilities. Built with Baileys v6 and Node.js. Version 2.0.0.

## Requirements

- Node.js 20 or newer
- `ffmpeg` available on `PATH`
- Google Drive: (na) — not integrated yet

```bash
git clone git@github.com:vq6oon/bot-whatsapp.git
cd bot-whatsapp
npm ci
npm start
```

Requires Node.js 20 or newer and SSH access to the private repository. On first start, scan the QR code shown in the terminal using WhatsApp → Linked Devices → Link a device. Keep `data/auth_info/`; it stores the linked session so later starts do not need another scan. This directory is ignored by Git.

Create `.env` only if needed:

```dotenv
DRIVE_FOLDER_ID=your_google_drive_folder_id
```

`DRIVE_FOLDER_ID` is optional. Google Drive commands are not integrated yet. Pairing-code login is not documented or supported; use the QR code.

## Commands

| Command | Description |
| --- | --- |
| `.menu` | Show available commands |
| `.info` | Show bot information and version |
| `.rules` | Show usage rules |
| `.checkdrive`, `.list`, `.upload` | Google Drive: (na), not integrated yet |
| `.tts <text>` | Convert text to a voice note |
| `.scan <url>` | Check URL reputation |
| `.tiktok <url> [video|hd|audio|photo]` | Download TikTok video (standard or HD), audio, or photo |
| `.hitung <expression>` | Calculator |
| `.anime <title>` | Search anime information from Jikan |
| `.shorturl <url>` | Shorten a URL |
| `.deviceinfo` | Show bot host status |
| `.morse`, `.textmorse` | Encode/decode Morse code |
| `.encode64`, `.decode64` | Encode/decode Base64 |
| `.biner`, `.textbinary`, `.binarytext` | Convert text to/from binary |
| `.tebakhewan`, `.tebak <answer>` | Animal guessing game |
| `.sticker`, `.s` | Convert an image to a sticker |

## Project structure

```
bot.js              entry point; loads .env and starts the bot
src/bot.js          Baileys socket, QR/pairing, incoming messages
src/router.js       handler registry and command dispatch
src/config.js       version, paths, and configuration
src/logger.js       console and file logging
src/services/       Drive, media, and YouTube services
src/utils/          Morse utilities
src/data/           game data
handler/            one file per command
tests/              router tests that do not connect to WhatsApp
tools/panel.js       optional code editor panel
```

Runtime files are stored under `data/`: WhatsApp session, downloads, and logs. This directory is ignored by Git.

## Tests

```bash
npm test
```

Tests invoke `dispatch()` with a mock socket and do not require a WhatsApp session.

## Notes

- Credentials and WhatsApp session files are excluded from Git. Never commit them.
- Google Drive commands return `(na)` until integration is implemented.
