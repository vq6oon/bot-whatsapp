import youtubedl from "youtube-dl-exec";

// Get the video title for the filename, or use a fallback if unavailable.
export async function getYoutubeTitle(url) {
  try {
    const result = await youtubedl(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      preferFreeFormats: true,
    });
    return result.title.replace(/[\/\\?%*:|"<>]/g, "");
  } catch {
    return "unknown_title_" + Date.now();
  }
}
