import fetch from "node-fetch";

export const name = "shorturl";

export function match(ctx) {
  return ctx.text.startsWith(".shorturl ");
}

export async function run({ text, sendText }) {
  const url = text.slice(10).trim();
  if (!/^https?:\/\//.test(url)) return sendText("✗ Invalid URL format!");

  await sendText("· Shortening URL...");

  try {
    const response = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`,
    );
    const shortUrl = await response.text();
    await sendText(`→ *Shortened URL:*\n${shortUrl}`);
  } catch (error) {
    console.error("shorturl:", error?.message || error);
    await sendText("✗ Failed to shorten URL.");
  }
}
