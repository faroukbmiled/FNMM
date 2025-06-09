export const allowedPlaylists: readonly string[] = Object.freeze([
  "playlist_defaultduo",
  "playlist_trios",
  "playlist_defaultsquad",
  "playlist_nobuildbr_trio",
  "playlist_nobuildbr_squad",
  "playlist_nobuildbr_duo",
  "playlist_blastberrysquad",
  "playlist_figmentduo",
  "playlist_figmentssquad"
]);

export const websocketHeaders: Record<string, string> = Object.freeze({
  "Accept-Version": "*",
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
});
