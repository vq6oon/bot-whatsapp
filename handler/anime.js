import { searchAnime } from "../src/services/anime.js";

export const name = "anime";

export function match(ctx) {
  return ctx.text.startsWith(".anime ");
}

export async function run({ text, sock, from, sendText }) {
  const query = text.slice(7).trim();
  if (!query) return sendText("❗ Example: .anime Naruto");

  try {
    const anime = await searchAnime(query);
    if (!anime) return sendText("❌ Anime not found.");

    const caption = `🎌 *${anime.title || anime.title_english || "Unknown title"}*\n\n📺 Episodes: ${anime.episodes || "?"}\n⭐ Score: ${anime.score || "?"}\n📅 Aired: ${anime.aired?.string || "?"}\n\n📖 ${anime.synopsis || "No description available."}\n\n🔗 ${anime.url || `https://myanimelist.net/anime/${anime.mal_id}`}`;
    const imageUrl = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url;

    if (imageUrl) {
      await sock.sendMessage(from, { image: { url: imageUrl }, caption });
    } else {
      await sendText(caption);
    }
  } catch (error) {
    console.error("anime:", error?.message || error);
    return sendText("❌ Anime search is temporarily unavailable. Try again later.");
  }
}
