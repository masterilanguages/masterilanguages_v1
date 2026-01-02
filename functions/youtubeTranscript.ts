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

    console.log('Processing video:', videoId);

    // Step 1: Try to fetch YouTube captions
    try {
      const captionsResult = await fetchYouTubeCaptions(videoId);
      if (captionsResult && captionsResult.transcript.length > 0) {
        console.log('Found YouTube captions');
        return Response.json(captionsResult);
      }
    } catch (e) {
      console.log('YouTube captions failed:', e.message);
    }

    // Step 2: Fallback to audio transcription with Whisper
    console.log('Attempting audio transcription...');
    const transcriptionResult = await transcribeAudio(videoId);
    return Response.json(transcriptionResult);

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ 
      error: error.message || 'Failed to process video',
      details: error.toString()
    }, { status: 500 });
  }
});

async function fetchYouTubeCaptions(videoId) {
  // Fetch video page
  const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
  const html = await pageResponse.text();

  // Extract ytInitialPlayerResponse
  const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?})\s*;/);
  if (!match) {
    throw new Error('Could not find player response');
  }

  const playerResponse = JSON.parse(match[1]);
  const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!captionTracks || captionTracks.length === 0) {
    throw new Error('No captions available');
  }

  // Find Hebrew or English captions
  let selectedTrack = captionTracks.find(t => t.languageCode === 'he' || t.languageCode === 'iw');
  if (!selectedTrack) {
    selectedTrack = captionTracks.find(t => t.languageCode === 'en');
  }
  if (!selectedTrack) {
    selectedTrack = captionTracks[0];
  }

  // Fetch caption XML
  const captionResponse = await fetch(selectedTrack.baseUrl);
  const captionXml = await captionResponse.text();

  // Parse XML
  const textMatches = [...captionXml.matchAll(/<text start="([^"]+)" dur="([^"]+)"[^>]*>([^<]+)<\/text>/g)];
  
  const transcript = textMatches.map(match => ({
    text: decodeHtmlEntities(match[3]),
    start: parseFloat(match[1]),
    duration: parseFloat(match[2])
  }));

  return {
    transcript,
    language: selectedTrack.languageCode,
    source: 'youtube_captions'
  };
}

async function transcribeAudio(videoId) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  // Download audio using yt-dlp
  console.log('Downloading audio...');
  const audioPath = `/tmp/${videoId}.mp3`;
  
  const dlpProcess = new Deno.Command('yt-dlp', {
    args: [
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '5',
      '-o', audioPath,
      `https://www.youtube.com/watch?v=${videoId}`
    ],
    stdout: 'piped',
    stderr: 'piped'
  });

  const dlpOutput = await dlpProcess.output();
  
  if (!dlpOutput.success) {
    const error = new TextDecoder().decode(dlpOutput.stderr);
    throw new Error(`yt-dlp failed: ${error}`);
  }

  console.log('Audio downloaded, transcribing with Whisper...');

  // Read audio file
  const audioData = await Deno.readFile(audioPath);
  
  // Create form data for Whisper API
  const formData = new FormData();
  formData.append('file', new Blob([audioData], { type: 'audio/mp3' }), `${videoId}.mp3`);
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'segment');

  // Call Whisper API
  const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    },
    body: formData
  });

  if (!whisperResponse.ok) {
    const error = await whisperResponse.text();
    throw new Error(`Whisper API failed: ${error}`);
  }

  const whisperResult = await whisperResponse.json();

  // Clean up temp file
  try {
    await Deno.remove(audioPath);
  } catch (e) {
    console.log('Failed to remove temp file:', e);
  }

  // Format transcript
  const transcript = whisperResult.segments?.map(seg => ({
    text: seg.text.trim(),
    start: seg.start,
    duration: seg.end - seg.start
  })) || [];

  return {
    transcript,
    language: whisperResult.language || 'unknown',
    source: 'audio_transcription'
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