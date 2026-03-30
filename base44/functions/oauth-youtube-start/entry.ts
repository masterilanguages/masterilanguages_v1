/**
 * GET /api/oauth/youtube/start
 * Initiates YouTube OAuth flow
 */

import { google } from 'npm:googleapis@128.0.0';

Deno.serve(async (req) => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      Deno.env.get('YOUTUBE_CLIENT_ID'),
      Deno.env.get('YOUTUBE_CLIENT_SECRET'),
      Deno.env.get('YOUTUBE_REDIRECT_URI')
    );

    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: 'youtube_auth'
    });

    return Response.redirect(authUrl, 302);
  } catch (error) {
    console.error('OAuth start error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});