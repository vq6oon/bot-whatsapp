import { searchAnime } from "../src/services/anime.js";

export const name = "getani";

export function match(ctx) {
  return ctx.text.startsWith(".getani ");
}

export async function run({ text, sock, from, sendText }) {
  const query = text.slice(8).trim();
  if (!query) return sendText("Format: .getani <title>");

  await sendText("· Searching anime...");

  try {
    const anime = await searchAnime(query);
    if (!anime) return sendText("✗ Anime not found. Try .anidl --search <title> to check the exact name.");

    const caption = `*${anime.title || anime.title_english || "Unknown title"}*\n\nEpisodes: ${anime.episodes || "?"}\nScore: ${anime.score || "?"}\nAired: ${anime.aired?.string || "?"}\n\nSynopsis: ${anime.synopsis || "No synopsis yet."}\n\n→ ${anime.url || `https://myanimelist.net/anime/${anime.mal_id}`}`;
    const imageUrl = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url;

    if (imageUrl) {
      await sock.sendMessage(from, { image: { url: imageUrl }, caption });
    } else {
      await sendText(caption);
    }
  } catch (error) {
    console.error("getani:", error?.message || error);
    return sendText("✗ Anime search is temporarily unavailable. Try again later.");
  }
}
