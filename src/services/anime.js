import fetch from "node-fetch";

const API_URL = "https://api.tenrai.org/v1/anime";

export async function searchAnime(query, fetchImpl = fetch) {
  const url = new URL(API_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "1");

  const response = await fetchImpl(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Anime API returned HTTP ${response.status}`);

  const json = await response.json();
  return json.data?.[0] ?? null;
}
