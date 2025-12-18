/**
 * POST /api/youtube/captions/list
 * Fetches available caption tracks for a YouTube video
 * Input: { youtube_url, preferred_langs: ["he","iw","en"] }
 * Output: { video_id, tracks: [{track_id, language, is_auto, name}] }
 */

import { google } from 'npm:googleapis@128.0.0';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const body = await req.json();
  const { youtube_url, preferred_langs = ['he', 'iw', 'en'] } = body;

  // Extract video ID from URL
  const videoIdMatch = youtube_url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([^&?]+)/);
  
  if (!videoIdMatch) {
    return Response.json({ error: 'Invalid YouTube URL' }, { status: 400 });
  }

  const video_id = videoIdMatch[1];

  try {
    // Load stored tokens
    const tokensExist = await Deno.stat('/tmp/youtube_tokens.json')
      .then(() => true)
      .catch(() => false);

    if (!tokensExist) {
      return Response.json({ 
        error: 'YouTube not connected',
        auth_required: true 
      }, { status: 401 });
    }

    const tokenData = JSON.parse(await Deno.readTextFile('/tmp/youtube_tokens.json'));

    // Initialize YouTube API client with OAuth credentials
    const oauth2Client = new google.auth.OAuth2(
      Deno.env.get('YOUTUBE_CLIENT_ID'),
      Deno.env.get('YOUTUBE_CLIENT_SECRET'),
      Deno.env.get('YOUTUBE_REDIRECT_URI')
    );

    // Set credentials from stored tokens
    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiry_date: tokenData.expiry_date
    });

    // Auto-refresh tokens if expired
    if (tokenData.expiry_date && Date.now() >= tokenData.expiry_date) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      const updatedTokens = {
        ...tokenData,
        access_token: credentials.access_token,
        expiry_date: credentials.expiry_date,
        updated_at: new Date().toISOString()
      };
      await Deno.writeTextFile('/tmp/youtube_tokens.json', JSON.stringify(updatedTokens, null, 2));
      oauth2Client.setCredentials(credentials);
    }

    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client
    });

    // Fetch caption tracks
    const response = await youtube.captions.list({
      part: 'snippet',
      videoId: video_id
    });

    const tracks = response.data.items.map(item => ({
      track_id: item.id,
      language: item.snippet.language,
      is_auto: item.snippet.trackKind === 'ASR',
      name: item.snippet.name
    }));

    // Sort by preferred languages
    const sortedTracks = tracks.sort((a, b) => {
      const aIndex = preferred_langs.indexOf(a.language);
      const bIndex = preferred_langs.indexOf(b.language);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    return Response.json({
      video_id,
      tracks: sortedTracks
    });

  } catch (error) {
    console.error('YouTube caption list error:', error);
    
    if (error.code === 403) {
      return Response.json({ 
        error: 'YouTube API access denied. Check OAuth permissions.',
        auth_required: true
      }, { status: 403 });
    }

    return Response.json({ 
      error: 'Failed to fetch caption tracks',
      details: error.message 
    }, { status: 500 });
  }
});