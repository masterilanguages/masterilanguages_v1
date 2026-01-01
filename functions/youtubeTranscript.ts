import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { videoId } = await req.json();

    if (!videoId) {
      return Response.json({ error: 'videoId is required' }, { status: 400 });
    }

    // Fetch transcript using simple HTTP request to YouTube's timedtext API
    try {
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      const pageResponse = await fetch(url);
      const pageHtml = await pageResponse.text();
      
      // Extract caption track URL from page HTML
      const captionsRegex = /"captionTracks":\s*(\[.*?\])/;
      const match = pageHtml.match(captionsRegex);
      
      if (!match) {
        return Response.json({ 
          error: 'No captions available for this video'
        }, { status: 404 });
      }
      
      const captionTracks = JSON.parse(match[1]);
      
      // Find English or first available track
      let track = captionTracks.find(t => t.languageCode === 'en') || captionTracks[0];
      
      if (!track || !track.baseUrl) {
        return Response.json({ 
          error: 'No caption URL found'
        }, { status: 404 });
      }
      
      // Fetch the actual captions
      const captionsResponse = await fetch(track.baseUrl);
      const captionsXml = await captionsResponse.text();
      
      // Parse XML to extract text and timestamps
      const textRegex = /<text start="([^"]+)" dur="([^"]+)"[^>]*>([^<]*)<\/text>/g;
      const transcript = [];
      let match2;
      
      while ((match2 = textRegex.exec(captionsXml)) !== null) {
        const start = parseFloat(match2[1]);
        const duration = parseFloat(match2[2]);
        let text = match2[3];
        
        // Decode HTML entities
        text = text.replace(/&amp;/g, '&')
                   .replace(/&lt;/g, '<')
                   .replace(/&gt;/g, '>')
                   .replace(/&quot;/g, '"')
                   .replace(/&#39;/g, "'");
        
        transcript.push({
          text: text.trim(),
          start: start,
          duration: duration
        });
      }
      
      if (transcript.length === 0) {
        return Response.json({ 
          error: 'Could not parse captions'
        }, { status: 404 });
      }

      return Response.json({ transcript, source: 'youtube-auto-captions' });
      
    } catch (error) {
      console.error('YouTube transcript error:', error);
      return Response.json({ 
        error: 'Failed to fetch transcript',
        details: error.message 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Function error:', error);
    return Response.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
});