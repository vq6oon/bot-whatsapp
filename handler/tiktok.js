import fetch from "node-fetch";

export const name = "tiktok";

export function match(ctx) {
  return ctx.text.startsWith(".tiktok ");
}

export async function run({ text, sock, from, sendText }) {
  const args = text.trim().split(/\s+/);
  const url = args[1];
  const mode = args[2] || "video";

  if (!url || !url.includes("tiktok.com")) {
    return sendText("Example: .tiktok <url> [video|hd|audio|photo]");
  }

  await sendText("· Fetching TikTok media...");

  try {
    const response = await fetch(
      `https://tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`,
    );
    const json = await response.json();

    if (json.code !== 0 || !json.data) {
      return sendText("Could not retrieve TikTok media.");
    }

    const data = json.data;
    const title = data.title || "TikTok video";
    const author = data.author?.unique_id ? `@${data.author.unique_id}` : "Unknown creator";
    const caption = `TikTok · ${mode.toUpperCase()}\n\n${title}\n${author}\n${url}`;

    if (mode === "video" || mode === "hd") {
      const videoUrl = mode === "hd"
        ? data.hdplay || data.play
        : data.play || data.hdplay;
      if (!videoUrl) return sendText("TikTok video is unavailable.");

      const quality = mode === "hd" && data.hdplay ? "HD" : "standard";
      const fileId = String(data.id || "video").replace(/[^a-zA-Z0-9_-]/g, "");
      await sock.sendMessage(from, {
        document: { url: videoUrl },
        mimetype: "video/mp4",
        fileName: `tiktok-${fileId || "video"}-${quality.toLowerCase()}.mp4`,
        caption: `TikTok · ${quality}\n\n${title}\n${author}\n${url}`,
      });
    } else if (mode === "audio") {
      await sock.sendMessage(from, {
        audio: { url: data.music, mimetype: "audio/mp4" },
        caption,
      });
    } else if (mode === "photo" && data.images && data.images.length > 0) {
      for (const imageUrl of data.images) {
        await sock.sendMessage(from, { image: { url: imageUrl } });
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      await sendText(caption);
    } else {
      return sendText("Unknown mode or unavailable content.");
    }
  } catch (error) {
    console.error("tiktok:", error?.message || error);
    return sendText("TikTok download failed.");
  }
}
