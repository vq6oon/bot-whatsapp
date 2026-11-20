import fetch from "node-fetch";

export const name = "tiktok";

export function match(ctx) {
  return ctx.text.startsWith(".tiktok ");
}

export async function run({ text, sock, from, sendText }) {
  const args = text.trim().split(" ");
  const url = args[1];
  const mode = args[2] || "video";

  if (!url || !url.includes("tiktok.com")) {
    return sendText("❗ Example: .tiktok <url> [video|audio|photo]");
  }

  try {
    const response = await fetch(
      `https://tikwm.com/api/?url=${encodeURIComponent(url)}`,
    );
    const json = await response.json();

    if (json.code !== 0 || !json.data) {
      return sendText("❌ Failed to retrieve TikTok data.");
    }

    const data = json.data;
    const caption = `🎬 *TikTok ${mode.toUpperCase()}:*\n\n📄 ${data.title || "-"}\n👤 @${data.author?.unique_id || "-"}\n❤️ ${data.digg_count || 0}  🔁 ${data.share_count || 0}\n\n🔗 ${url}`;

    if (mode === "video") {
      await sock.sendMessage(from, { video: { url: data.play }, caption });
    } else if (mode === "audio") {
      await sock.sendMessage(from, {
        audio: { url: data.music, mimetype: "audio/mp4" },
        caption,
      });
    } else if (mode === "photo" && data.images && data.images.length > 0) {
      // Send all images first and the caption last.
      for (const imageUrl of data.images) {
        await sock.sendMessage(from, { image: { url: imageUrl } });
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      await sendText(caption);
    } else {
      return sendText("❌ Unknown mode or unavailable content.");
    }
  } catch (error) {
    console.error("tiktok:", error?.message || error);
    return sendText("❌ An error occurred while downloading from TikTok.");
  }
}
