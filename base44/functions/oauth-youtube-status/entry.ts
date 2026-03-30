/**
 * GET /api/oauth/youtube/status
 * Check if YouTube OAuth tokens are available
 */

Deno.serve(async (req) => {
  try {
    const tokensExist = await Deno.stat('/tmp/youtube_tokens.json')
      .then(() => true)
      .catch(() => false);

    if (!tokensExist) {
      return Response.json({ connected: false });
    }

    const tokenData = JSON.parse(await Deno.readTextFile('/tmp/youtube_tokens.json'));
    
    // Check if token is expired
    const now = Date.now();
    const isExpired = tokenData.expiry_date && now >= tokenData.expiry_date;

    return Response.json({ 
      connected: true,
      expired: isExpired,
      updated_at: tokenData.updated_at
    });
  } catch (error) {
    console.error('OAuth status error:', error);
    return Response.json({ connected: false, error: error.message }, { status: 500 });
  }
});