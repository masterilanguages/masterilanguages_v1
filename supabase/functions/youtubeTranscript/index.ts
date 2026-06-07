// youtubeTranscript — fetches a YouTube transcript via Supadata.
//
// Replaces the old fragile approach (scraping the watch page + Whisper on the
// audio stream), which YouTube blocks from datacenter IPs. Supadata handles the
// anti-bot/signature-cipher mess and falls back to AI transcription when a video
// has no captions, so it works for arbitrary third-party videos.
//
// RETURN SHAPE — unchanged (callers read result.data.X in BabyVideos.jsx,
// MediaLibrary.jsx, AddVideoDialog.jsx, VideoTranscript.jsx):
//   data.transcript  -> [{ text, start, duration }]   (start/duration in SECONDS)
//   data.language    -> detected language code
//   data.source      -> 'youtube_captions' | 'none'
//   data.video_id, data.title, data.steps, data.processingTime
//   data.error, data.details   (read when transcript is empty)
//
// We never 500 the "no transcript" case — callers branch on result.data.error,
// so a missing transcript returns { data: { transcript: [], error } } at HTTP 200.
import { handleCors, json } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";

const SUPADATA_BASE = "https://api.supadata.ai/v1";

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  const auth = await requireUser(req);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  const startTime = Date.now();
  const elapsed = () => ((Date.now() - startTime) / 1000).toFixed(2);

  let videoId: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    videoId = body?.videoId;
    if (!videoId) {
      return json({ data: { transcript: [], error: "videoId is required" } }, 400);
    }

    const apiKey = Deno.env.get("SUPADATA_API_KEY");
    if (!apiKey) {
      return json({
        data: {
          transcript: [],
          error: "SUPADATA_API_KEY is not set",
          source: "none",
          video_id: videoId,
        },
      });
    }

    // Supadata returns segments synchronously for most videos; long videos may
    // return a { jobId } that we poll.
    const url =
      `${SUPADATA_BASE}/youtube/transcript?videoId=${encodeURIComponent(videoId)}`;
    const resp = await fetch(url, { headers: { "x-api-key": apiKey } });
    let payload: any = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      return json({
        data: {
          transcript: [],
          error: payload?.message || payload?.error ||
            `Supadata error ${resp.status}`,
          source: "none",
          video_id: videoId,
          processingTime: elapsed(),
        },
      });
    }

    // Async job path: poll until the transcript is ready.
    if (!Array.isArray(payload?.content) && payload?.jobId) {
      const jobUrl = `${SUPADATA_BASE}/youtube/transcript/${payload.jobId}`;
      for (let i = 0; i < 12; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const jr = await fetch(jobUrl, { headers: { "x-api-key": apiKey } });
        const jp: any = await jr.json().catch(() => ({}));
        if (Array.isArray(jp?.content) || jp?.status === "completed") {
          payload = jp;
          break;
        }
        if (jp?.status === "failed" || jp?.error) {
          return json({
            data: {
              transcript: [],
              error: jp?.error || "Supadata job failed",
              source: "none",
              video_id: videoId,
              processingTime: elapsed(),
            },
          });
        }
      }
    }

    const content = payload?.content;
    if (!Array.isArray(content) || content.length === 0) {
      return json({
        data: {
          transcript: [],
          error: "No transcript available for this video.",
          source: "none",
          video_id: videoId,
          processingTime: elapsed(),
        },
      });
    }

    // Supadata offsets/durations are in MILLISECONDS; the app expects seconds.
    const transcript = content
      .map((s: any) => ({
        text: String(s?.text ?? "").trim(),
        start: typeof s?.offset === "number" ? s.offset / 1000 : 0,
        duration: typeof s?.duration === "number" ? s.duration / 1000 : 3,
      }))
      .filter((s: { text: string }) => s.text.length > 0);

    return json({
      data: {
        transcript,
        language: payload?.lang || "unknown",
        source: "youtube_captions",
        video_id: videoId,
        processingTime: elapsed(),
        steps: ["supadata_fetched", "complete"],
      },
    });
  } catch (error: any) {
    return json({
      data: {
        transcript: [],
        error: error?.message || "Failed to fetch transcript",
        details: error?.stack,
        source: "none",
        video_id: videoId,
        processingTime: elapsed(),
      },
    });
  }
});
