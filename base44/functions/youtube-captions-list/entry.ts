/**
 * POST /api/youtube/captions/list
 * Fetches available caption tracks for a YouTube video
 * Input: { youtube_url, preferred_langs: ["he","iw","en"] }
 * Output: { video_id, tracks: [{track_id, language, is_auto, name}] }
 */

import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { youtube_url, preferred_langs = ['he', 'iw', 'en'] } = req.body;

  // Extract video ID from URL
  const videoIdMatch = youtube_url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([^&?]+)/);
  
  if (!videoIdMatch) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
  }

  const video_id = videoIdMatch[1];

  try {
    // Initialize YouTube API client with OAuth credentials
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI
    );

    // Set credentials from stored tokens
    oauth2Client.setCredentials({
      access_token: process.env.YOUTUBE_ACCESS_TOKEN,
      refresh_token: process.env.YOUTUBE_REFRESH_TOKEN
    });

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

    return res.status(200).json({
      video_id,
      tracks: sortedTracks
    });

  } catch (error) {
    console.error('YouTube caption list error:', error);
    
    if (error.code === 403) {
      return res.status(403).json({ 
        error: 'YouTube API access denied. Check OAuth permissions.' 
      });
    }

    return res.status(500).json({ 
      error: 'Failed to fetch caption tracks',
      details: error.message 
    });
  }
}