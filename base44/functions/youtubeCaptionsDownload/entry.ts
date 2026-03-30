/**
 * POST /api/youtube/captions/download
 * Downloads and converts YouTube captions to plain text
 * Input: { video_id, track_id }
 * Output: { transcript_text, format }
 */

import { google } from 'npm:googleapis@128.0.0';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const body = await req.json();
  const { video_id, track_id } = body;

  if (!video_id || !track_id) {
    return Response.json({ error: 'Missing video_id or track_id' }, { status: 400 });
  }

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

    // Initialize YouTube API client
    const oauth2Client = new google.auth.OAuth2(
      Deno.env.get('YOUTUBE_CLIENT_ID'),
      Deno.env.get('YOUTUBE_CLIENT_SECRET'),
      Deno.env.get('YOUTUBE_REDIRECT_URI')
    );

    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiry_date: tokenData.expiry_date
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

    return Response.json({
      transcript_text,
      format: 'vtt'
    });

  } catch (error) {
    console.error('YouTube caption download error:', error);
    
    if (error.code === 403) {
      return Response.json({ 
        error: 'YouTube API access denied. Check OAuth permissions.',
        auth_required: true
      }, { status: 403 });
    }

    if (error.code === 404) {
      return Response.json({ 
        error: 'Caption track not found' 
      }, { status: 404 });
    }

    return Response.json({ 
      error: 'Failed to download captions',
      details: error.message 
    }, { status: 500 });
  }
});

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