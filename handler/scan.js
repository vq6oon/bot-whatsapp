import fetch from "node-fetch";

export const name = "scan";

export function match(ctx) {
  return ctx.text.startsWith(".scan ");
}

export async function run({ text, sendText }) {
  const url = text.slice(6).trim();
  if (!/^https?:\/\//.test(url)) {
    return sendText("· Example: .scan https://example.com");
  }

  try {
    await sendText("· Scanning URL...");

    const response = await fetch(
      `https://safebrowsing.google.com/safebrowsing/diagnostic?output=json&site=${encodeURIComponent(url)}`,
    );
    const html = await response.text();
    const isDangerous =
      html.includes("Sites listed may be sites that install malware") ||
      html.includes("This site is listed");

    if (isDangerous) {
      return sendText(`! *Suspicious or Dangerous URL!*\n\n→ ${url}`);
    }
    return sendText(`✓ *No threats detected!*\n\n→ ${url}`);
  } catch (error) {
    console.error("scan:", error?.message || error);
    return sendText("✗ Failed to scan URL. Check that the URL is valid.");
  }
}
