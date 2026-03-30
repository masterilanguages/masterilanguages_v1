/**
 * POST /api/youtube/captions/download
 * Downloads and converts YouTube captions to plain text
 * Input: { video_id, track_id }
 * Output: { transcript_text, format }
 */

import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { video_id, track_id } = req.body;

  if (!video_id || !track_id) {
    return res.status(400).json({ error: 'Missing video_id or track_id' });
  }

  try {
    // Initialize YouTube API client
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: process.env.YOUTUBE_ACCESS_TOKEN,
      refresh_token: process.env.YOUTUBE_REFRESH_TOKEN
    });

    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client
    });

    // Download captions in VTT format
    const response = await youtube.captions.download({
      id: track_id,
      tfmt: 'vtt'
    });

    const vttData = response.data;

    // Convert VTT to plain text (remove timestamps and formatting)
    const transcript_text = convertVttToPlainText(vttData);

    return res.status(200).json({
      transcript_text,
      format: 'vtt'
    });

  } catch (error) {
    console.error('YouTube caption download error:', error);
    
    if (error.code === 403) {
      return res.status(403).json({ 
        error: 'YouTube API access denied. Check OAuth permissions.' 
      });
    }

    if (error.code === 404) {
      return res.status(404).json({ 
        error: 'Caption track not found' 
      });
    }

    return res.status(500).json({ 
      error: 'Failed to download captions',
      details: error.message 
    });
  }
}

function convertVttToPlainText(vttData) {
  // Remove VTT header
  let text = vttData.replace(/WEBVTT\n\n?/g, '');
  
  // Remove timestamp lines (format: 00:00:00.000 --> 00:00:00.000)
  text = text.replace(/\d{2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}\.\d{3}.*\n/g, '');
  
  // Remove cue identifiers (numbers at start of lines)
  text = text.replace(/^\d+\n/gm, '');
  
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Remove excessive whitespace and empty lines
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  
  return text;
}