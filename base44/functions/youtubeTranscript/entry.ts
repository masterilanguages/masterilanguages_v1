import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const startTime = Date.now();
  console.log('\n=== NEW TRANSCRIPT REQUEST ===');
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      console.error('❌ Auth failed - no user');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log(`✓ User authenticated: ${user.email}`);

    const { videoId } = await req.json();
    
    if (!videoId) {
      console.error('❌ Missing videoId');
      return Response.json({ error: 'videoId is required' }, { status: 400 });
    }

    console.log(`📹 Processing video: ${videoId}`);
    console.log(`🔗 URL: https://youtube.com/watch?v=${videoId}`);

    // Step 1: Try to fetch YouTube captions
    console.log('\n--- STEP 1: Fetching YouTube Captions ---');
    try {
      const captionsResult = await fetchYouTubeCaptions(videoId);
      if (captionsResult && captionsResult.transcript.length > 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✓ SUCCESS: Found ${captionsResult.transcript.length} caption segments in ${elapsed}s`);
        return Response.json({
          ...captionsResult,
          processingTime: elapsed,
          steps: ['captions_fetched', 'complete']
        });
      }
    } catch (e) {
      console.log(`⚠️  YouTube captions unavailable: ${e.message}`);
    }

    // Step 2: Fallback to audio transcription with Whisper
    console.log('\n--- STEP 2: Audio Transcription Fallback ---');
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      console.log('⚠️  No OPENAI_API_KEY - captions unavailable for this video');
      return Response.json({ 
        error: 'No captions found for this video and no Whisper fallback configured.',
        transcript: [],
        source: 'none'
      }, { status: 200 });
    }
    const transcriptionResult = await transcribeAudio(videoId, startTime);
    return Response.json(transcriptionResult);

  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`\n❌ FATAL ERROR after ${elapsed}s:`);
    console.error(`Message: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    return Response.json({ 
      error: error.message || 'Failed to process video',
      details: error.stack,
      step: 'fatal_error',
      processingTime: elapsed
    }, { status: 500 });
  }
});

async function fetchYouTubeCaptions(videoId) {
  // Fetch video page with browser-like headers to avoid bot detection
  const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    }
  });

  if (!pageResponse.ok) {
    throw new Error(`YouTube page returned ${pageResponse.status}`);
  }

  const html = await pageResponse.text();
  console.log(`✓ YouTube page fetched (${(html.length / 1024).toFixed(1)}KB)`);

  // Try multiple patterns for extracting player response
  let playerResponse = null;
  const patterns = [
    /ytInitialPlayerResponse\s*=\s*({.+?})\s*;/s,
    /ytInitialPlayerResponse\s*=\s*({[\s\S]+?})\s*(?:;|\n)/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        playerResponse = JSON.parse(match[1]);
        break;
      } catch (e) {
        console.log(`Pattern failed to parse: ${e.message}`);
      }
    }
  }

  if (!playerResponse) {
    throw new Error('Could not find or parse player response');
  }

  const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  console.log(`Caption tracks found: ${captionTracks?.length || 0}`);

  if (!captionTracks || captionTracks.length === 0) {
    throw new Error('No captions available for this video');
  }

  // Prefer Hebrew, then any available language
  let selectedTrack = captionTracks.find(t => t.languageCode === 'he' || t.languageCode === 'iw');
  if (!selectedTrack) selectedTrack = captionTracks.find(t => t.languageCode === 'en');
  if (!selectedTrack) selectedTrack = captionTracks[0];

  console.log(`✓ Selected caption track: ${selectedTrack.languageCode} (${selectedTrack.name?.simpleText || 'unknown'})`);

  // Fetch caption XML - need same headers as page fetch
  const captionUrl = selectedTrack.baseUrl;
  console.log(`Fetching caption URL: ${captionUrl.substring(0, 80)}...`);
  
  const captionResponse = await fetch(captionUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Referer': 'https://www.youtube.com/',
    }
  });
  if (!captionResponse.ok) throw new Error(`Caption fetch failed: ${captionResponse.status}`);
  const captionXml = await captionResponse.text();
  console.log(`✓ Caption XML fetched (${(captionXml.length / 1024).toFixed(1)}KB)`);
  console.log(`Caption XML preview: ${captionXml.substring(0, 200)}`);

  // Parse XML - handle both with and without dur attribute
  const textMatches = [...captionXml.matchAll(/<text start="([^"]+)"(?:\s+dur="([^"]+)")?[^>]*>([\s\S]*?)<\/text>/g)];
  console.log(`✓ Parsed ${textMatches.length} caption segments`);

  if (textMatches.length === 0) {
    throw new Error('Could not parse caption XML');
  }

  const transcript = textMatches.map(m => ({
    text: decodeHtmlEntities(m[3].replace(/<[^>]+>/g, '')).trim(),
    start: parseFloat(m[1]),
    duration: m[2] ? parseFloat(m[2]) : 3
  })).filter(t => t.text.length > 0);

  return {
    transcript,
    language: selectedTrack.languageCode,
    source: 'youtube_captions'
  };
}

async function transcribeAudio(videoId, startTime) {
  const stepStart = Date.now();
  
  console.log('🔑 Checking OpenAI API key...');
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured - please set it in environment variables');
  }
  console.log('✓ API key found');

  console.log('\n--- STEP 2.1: Fetch YouTube Page ---');
  const infoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  console.log(`Fetching: ${infoUrl}`);
  
  const pageResponse = await fetch(infoUrl);
  if (!pageResponse.ok) {
    throw new Error(`YouTube page fetch failed with status ${pageResponse.status}`);
  }
  console.log(`✓ Page fetched (${pageResponse.status})`);
  
  const html = await pageResponse.text();
  console.log(`✓ HTML received (${(html.length / 1024).toFixed(2)}KB)`);
  
  // Extract player response
  console.log('\n--- STEP 2.2: Extract Audio URL ---');
  const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?})\s*;/);
  if (!match) {
    throw new Error('Could not extract video info - video may be restricted or unavailable');
  }
  console.log('✓ Found player response');
  
  const playerResponse = JSON.parse(match[1]);
  const streamingData = playerResponse?.streamingData;
  
  if (!streamingData) {
    const reason = playerResponse?.playabilityStatus?.reason || 'Unknown';
    throw new Error(`No streaming data available. Reason: ${reason}`);
  }
  console.log('✓ Streaming data available');
  
  // Find audio-only format
  const formats = [...(streamingData.formats || []), ...(streamingData.adaptiveFormats || [])];
  console.log(`Found ${formats.length} total formats`);
  
  const audioFormat = formats.find(f => 
    f.mimeType?.includes('audio') && 
    (f.audioQuality === 'AUDIO_QUALITY_LOW' || f.audioQuality === 'AUDIO_QUALITY_MEDIUM')
  ) || formats.find(f => f.mimeType?.includes('audio'));
  
  if (!audioFormat || !audioFormat.url) {
    throw new Error('No audio stream found - video may be age-restricted or require login');
  }
  
  console.log(`✓ Selected audio format: ${audioFormat.mimeType}, quality: ${audioFormat.audioQuality || 'unknown'}`);

  console.log('\n--- STEP 2.3: Download Audio ---');
  console.log('Downloading audio stream...');
  const audioResponse = await fetch(audioFormat.url);
  
  if (!audioResponse.ok) {
    throw new Error(`Audio download failed with status ${audioResponse.status}`);
  }
  
  const audioBlob = await audioResponse.blob();
  const sizeMB = (audioBlob.size / 1024 / 1024).toFixed(2);
  console.log(`✓ Audio downloaded: ${sizeMB}MB`);
  
  // Whisper has a 25MB limit
  if (audioBlob.size > 25 * 1024 * 1024) {
    throw new Error(`Audio file too large (${sizeMB}MB > 25MB limit). Try a shorter video or use manual transcript paste.`);
  }

  console.log('\n--- STEP 2.4: Send to Whisper API ---');
  const formData = new FormData();
  formData.append('file', audioBlob, `${videoId}.webm`);
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'segment');

  console.log(`Sending ${sizeMB}MB to Whisper API...`);
  const whisperStart = Date.now();
  
  const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    },
    body: formData
  });

  const whisperTime = ((Date.now() - whisperStart) / 1000).toFixed(2);
  
  if (!whisperResponse.ok) {
    const errorText = await whisperResponse.text();
    console.error(`❌ Whisper API failed (${whisperResponse.status}) after ${whisperTime}s:`);
    console.error(errorText);
    throw new Error(`Whisper API failed (${whisperResponse.status}): ${errorText}`);
  }
  
  console.log(`✓ Whisper responded in ${whisperTime}s`);

  console.log('\n--- STEP 2.5: Parse Response ---');
  const whisperResult = await whisperResponse.json();
  console.log(`✓ Detected language: ${whisperResult.language || 'unknown'}`);
  console.log(`✓ Found ${whisperResult.segments?.length || 0} segments`);

  // Format transcript
  const transcript = whisperResult.segments?.map(seg => ({
    text: seg.text.trim(),
    start: seg.start,
    duration: seg.end - seg.start
  })) || [];

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✓ SUCCESS: Complete pipeline in ${totalTime}s`);

  return {
    transcript,
    language: whisperResult.language || 'unknown',
    source: 'audio_transcription',
    processingTime: totalTime,
    steps: ['page_fetched', 'audio_extracted', 'audio_downloaded', 'whisper_transcribed', 'complete']
  };
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}