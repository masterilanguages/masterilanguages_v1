// POST youtubeCaptionsList
// Fetches available caption tracks for a YouTube video.
// Input:  { youtube_url? , video_id?, preferred_langs?: ["he","iw","en"] }
// Output (TOP-LEVEL, read by VideoTranscript.jsx as listResult.video_id / .tracks):
//   { video_id, tracks: [{ track_id, id, language, name, is_auto, trackKind }] }
//
// NOTE: the call site uses tracks[0].track_id and tracks[0].language, so those
// field names are load-bearing. `id`/`trackKind` are included to match the spec.
import { handleCors, json } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { getValidAccessToken } from "../_shared/youtube-auth.ts";

const CAPTIONS_LIST_URL = "https://www.googleapis.com/youtube/v3/captions";

function extractVideoId(input: string): string | null {
  if (!input) return null;
  const m = input.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([^&?]+)/,
  );
  if (m) return m[1];
  // Bare 11-char video id (no URL).
  if (/^[A-Za-z0-9_-]{11}$/.test(input.trim())) return input.trim();
  return null;
}

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  const auth = await requireUser(req);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  let body: { youtube_url?: string; video_id?: string; preferred_langs?: string[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { youtube_url, preferred_langs = ["he", "iw", "en"] } = body;
  const video_id = extractVideoId(youtube_url ?? "") ?? extractVideoId(body.video_id ?? "");

  if (!video_id) {
    return json({ error: "Invalid YouTube URL" }, 400);
  }

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken();
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) {
      return json({ error: "YouTube not connected", auth_required: true }, 401);
    }
    console.error("YouTube token error:", err);
    return json({ error: "Failed to authenticate with YouTube" }, 500);
  }

  try {
    const url = `${CAPTIONS_LIST_URL}?part=snippet&videoId=${encodeURIComponent(video_id)}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!resp.ok) {
      const detail = await resp.text();
      console.error("YouTube caption list error:", resp.status, detail);
      if (resp.status === 401) {
        return json({ error: "YouTube not connected", auth_required: true }, 401);
      }
      if (resp.status === 403) {
        return json(
          { error: "YouTube API access denied. Check OAuth permissions.", auth_required: true },
          403,
        );
      }
      return json({ error: "Failed to fetch caption tracks", details: detail }, 500);
    }

    const data = await resp.json() as {
      items?: Array<{
        id: string;
        snippet: { language: string; name: string; trackKind?: string };
      }>;
    };

    const tracks = (data.items ?? []).map((item) => ({
      track_id: item.id, // primary id the call site reads/passes to download
      id: item.id, // raw caption id (matches spec field name)
      language: item.snippet.language,
      name: item.snippet.name,
      is_auto: item.snippet.trackKind === "ASR",
      trackKind: item.snippet.trackKind,
    }));

    // Sort by preferred languages (he/iw/en first, like the original).
    tracks.sort((a, b) => {
      const aIndex = preferred_langs.indexOf(a.language);
      const bIndex = preferred_langs.indexOf(b.language);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    return json({ video_id, tracks });
  } catch (err) {
    console.error("YouTube caption list error:", err);
    return json({ error: "Failed to fetch caption tracks", details: String(err) }, 500);
  }
});
