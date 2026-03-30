/**
 * GET /api/oauth/youtube/callback
 * Handles OAuth callback and exchanges code for tokens
 */

import { google } from 'npm:googleapis@128.0.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      return Response.redirect(`/?youtube_error=${error}`, 302);
    }

    if (!code) {
      return Response.json({ error: 'No authorization code' }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
      Deno.env.get('YOUTUBE_CLIENT_ID'),
      Deno.env.get('YOUTUBE_CLIENT_SECRET'),
      Deno.env.get('YOUTUBE_REDIRECT_URI')
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    // Store tokens in a secure location
    // Using a simple text file in /tmp for now (in production, use a database)
    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      scope: tokens.scope,
      token_type: tokens.token_type,
      updated_at: new Date().toISOString()
    };

    await Deno.writeTextFile('/tmp/youtube_tokens.json', JSON.stringify(tokenData, null, 2));

    // Redirect back to app with success
    return Response.redirect('/?youtube_connected=1', 302);
  } catch (error) {
    console.error('OAuth callback error:', error);
    return Response.redirect(`/?youtube_error=${encodeURIComponent(error.message)}`, 302);
  }
});