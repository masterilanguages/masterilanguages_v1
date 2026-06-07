// POST youtubeCaptionsDownload
// Downloads a YouTube caption track (VTT) and returns it as plain text.
// Input:  { video_id?, track_id }   (track_id comes from youtubeCaptionsList)
// Output (TOP-LEVEL, read by VideoTranscript.jsx as downloadResult.transcript_text / .format):
//   { transcript_text, format }
import { handleCors, json } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { getValidAccessToken } from "../_shared/youtube-auth.ts";

const CAPTIONS_DOWNLOAD_URL = "https://www.googleapis.com/youtube/v3/captions";

function convertVttToPlainText(vttData: string): string {
  // Remove VTT header.
  let text = vttData.replace(/WEBVTT\n\n?/g, "");
  // Strip any header metadata lines (Kind:, Language:, etc.) before the first cue.
  text = text.replace(/^(Kind|Language):.*$/gim, "");
  // Remove timestamp lines (00:00:00.000 --> 00:00:00.000  [+ optional settings]).
  text = text.replace(
    /\d{2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}\.\d{3}.*\n/g,
    "",
  );
  // Remove cue identifiers (numbers alone on a line).
  text = text.replace(/^\d+\n/gm, "");
  // Remove HTML / VTT inline tags (<c>, <00:00:00.000>, <i>, etc.).
  text = text.replace(/<[^>]+>/g, "");
  // Collapse excessive blank lines and trim.
  text = text.replace(/\n{3,}/g, "\n\n").trim();
  return text;
}

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  const auth = await requireUser(req);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  let body: { video_id?: string; track_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { track_id } = body;
  if (!track_id) {
    return json({ error: "Missing track_id" }, 400);
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
    const url = `${CAPTIONS_DOWNLOAD_URL}/${encodeURIComponent(track_id)}?tfmt=vtt`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!resp.ok) {
      const detail = await resp.text();
      console.error("YouTube caption download error:", resp.status, detail);
      if (resp.status === 401) {
        return json({ error: "YouTube not connected", auth_required: true }, 401);
      }
      if (resp.status === 403) {
        return json(
          { error: "YouTube API access denied. Check OAuth permissions.", auth_required: true },
          403,
        );
      }
      if (resp.status === 404) {
        return json({ error: "Caption track not found" }, 404);
      }
      return json({ error: "Failed to download captions", details: detail }, 500);
    }

    const vttData = await resp.text();
    const transcript_text = convertVttToPlainText(vttData);

    return json({ transcript_text, format: "vtt" });
  } catch (err) {
    console.error("YouTube caption download error:", err);
    return json({ error: "Failed to download captions", details: String(err) }, 500);
  }
});
