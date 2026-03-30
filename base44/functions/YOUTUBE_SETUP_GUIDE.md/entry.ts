# YouTube Caption Integration - Complete Setup Guide

## 1. Backend Endpoints (✅ Implemented)

### POST /api/youtube/captions/list
**Location:** `functions/youtube-captions-list.js`

**Input:**
```json
{
  "youtube_url": "https://www.youtube.com/watch?v=n8XvkVp6CfQ",
  "preferred_langs": ["he", "iw", "en"]
}
```

**Output:**
```json
{
  "video_id": "n8XvkVp6CfQ",
  "tracks": [
    {
      "track_id": "xyz123",
      "language": "he",
      "is_auto": false,
      "name": "Hebrew"
    }
  ]
}
```

### POST /api/youtube/captions/download
**Location:** `functions/youtube-captions-download.js`

**Input:**
```json
{
  "video_id": "n8XvkVp6CfQ",
  "track_id": "xyz123"
}
```

**Output:**
```json
{
  "transcript_text": "שלום! ברוכים הבאים...",
  "format": "vtt"
}
```

---

## 2. OAuth Setup Instructions

### A. Google Cloud Console Setup

1. **Create/Select Project**
   - Go to: https://console.cloud.google.com
   - Create new project: "Base44-YouTube-Captions"
   - Select the project

2. **Enable YouTube Data API v3**
   - Go to: APIs & Services > Library
   - Search: "YouTube Data API v3"
   - Click "ENABLE"

3. **Configure OAuth Consent Screen**
   - Go to: APIs & Services > OAuth consent screen
   - User Type: **External** (or Internal if workspace)
   - App name: "Base44 Hebrew Learning"
   - User support email: your email
   - Developer contact: your email
   - Scopes: Add these:
     - `https://www.googleapis.com/auth/youtube.force-ssl`
     - `https://www.googleapis.com/auth/youtube.readonly`
   - Test users: Add your Google account email
   - Save and continue

4. **Create OAuth 2.0 Credentials**
   - Go to: APIs & Services > Credentials
   - Click: "+ CREATE CREDENTIALS" > "OAuth client ID"
   - Application type: **Web application**
   - Name: "Base44 Backend"
   - Authorized redirect URIs:
     - `http://localhost:5173/auth/callback` (development)
     - `https://your-app-domain.base44.app/auth/callback` (production)
   - Click "CREATE"
   - **Save the Client ID and Client Secret**

### B. Generate Access & Refresh Tokens

Run this one-time setup script to get tokens:

```javascript
// functions/oauth-setup.js (run once locally)
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  'YOUR_CLIENT_ID',
  'YOUR_CLIENT_SECRET',
  'http://localhost:5173/auth/callback'
);

const scopes = [
  'https://www.googleapis.com/auth/youtube.force-ssl',
  'https://www.googleapis.com/auth/youtube.readonly'
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent'
});

console.log('Visit this URL to authorize:', authUrl);
// After authorization, you'll get a code. Exchange it:
// const { tokens } = await oauth2Client.getToken(code);
// console.log('Access Token:', tokens.access_token);
// console.log('Refresh Token:', tokens.refresh_token);
```

### C. Base44 Environment Variables

In Base44 Dashboard > Settings > Environment Variables, add:

```env
YOUTUBE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your-client-secret-here
YOUTUBE_ACCESS_TOKEN=ya29.xxx... (from OAuth flow)
YOUTUBE_REFRESH_TOKEN=1//xxx... (from OAuth flow)
YOUTUBE_REDIRECT_URI=https://your-app.base44.app/auth/callback
```

### Required Scopes
- `https://www.googleapis.com/auth/youtube.force-ssl` (full access including captions)
- `https://www.googleapis.com/auth/youtube.readonly` (read-only fallback)

---

## 3. Database Schema & Persistence

### Video Entity (✅ Already Exists)
**Location:** `entities/Video.json`

**Fields:**
```json
{
  "video_url": "string",           // Original YouTube URL
  "title": "string",               // Video title
  "youtube_video_id": "string",    // Extracted video ID
  "caption_track_id": "string",    // Selected caption track ID
  "transcript_text": "string",     // Full transcript (plain text)
  "transcript_source": "enum",     // "youtube_captions" | "manual" | "unavailable"
  "language": "string",            // "he" | "iw" | "en" | etc
  "transcript_status": "enum",     // "processing" | "complete" | "failed"
  "transcript_generated_at": "datetime"
}
```

### Persistence Logic (✅ Implemented)
**Location:** `components/video/VideoTranscript.jsx`

```javascript
// On component mount:
1. Load video from DB by video_url
2. Check transcript_status:
   - If "complete" → Show existing transcript (NO REFETCH)
   - If "processing" → Show loading
   - If "failed" or missing → Trigger fetch

// On fetch:
1. Call /api/youtube/captions/list
2. If tracks available → Call /api/youtube/captions/download
3. Save to DB with status="complete"
4. If no tracks → Set status="failed", source="unavailable"
```

**Key Rule:** Once `transcript_status === "complete"`, never refetch.

---

## 4. Caption Parsing

### VTT to Plain Text Conversion
**Location:** `functions/youtube-captions-download.js`

**Input (VTT format):**
```vtt
WEBVTT

1
00:00:00.500 --> 00:00:02.000
שלום! ברוכים הבאים

2
00:00:02.500 --> 00:00:05.000
אני רוצה ללמוד עברית
```

**Output (Plain text):**
```
שלום! ברוכים הבאים

אני רוצה ללמוד עברית
```

**Parsing Logic:**
- Remove `WEBVTT` header
- Remove timestamp lines (`00:00:00.000 --> 00:00:00.000`)
- Remove cue identifiers (line numbers)
- Remove HTML tags (`<v>`, `</v>`, etc.)
- Preserve paragraph breaks (double newlines)
- Strip excessive whitespace

### Language Preference
Tracks are sorted by `preferred_langs` in `/api/youtube/captions/list`:
1. Hebrew (`he`, `iw`)
2. English (`en`)
3. Other languages (if available)

---

## 5. UI Integration

### Frontend Flow
**Location:** `components/video/VideoTranscript.jsx`

```javascript
// 1. Component loads
useEffect(() => {
  loadVideo(); // Check if transcript exists in DB
}, [videoId, videoUrl]);

// 2. If no transcript, start fetching
const startTranscription = async (id) => {
  // List available captions
  const listRes = await fetch('/api/youtube/captions/list', {
    method: 'POST',
    body: JSON.stringify({ youtube_url, preferred_langs: ['he','iw','en'] })
  });
  
  const { video_id, tracks } = await listRes.json();
  
  if (tracks.length === 0) {
    // Show "Transcript unavailable" + manual paste option
    return;
  }
  
  // Download first track
  const downloadRes = await fetch('/api/youtube/captions/download', {
    method: 'POST',
    body: JSON.stringify({ video_id, track_id: tracks[0].track_id })
  });
  
  const { transcript_text } = await downloadRes.json();
  
  // Save to DB
  await base44.entities.Video.update(id, {
    transcript_text,
    transcript_status: "complete",
    transcript_source: "youtube_captions"
  });
};
```

### Display Behavior
- **Button:** "Show transcript" / "Hide transcript"
- **Loading:** "Fetching captions..." with spinner
- **Success:** Display transcript in RTL for Hebrew (`dir="rtl"`)
- **No Captions:** "Transcript unavailable for this video" + "Add Transcript Manually" button
- **Manual Input:** Textarea to paste transcript → saves as `transcript_source="manual"`

### Manual Fallback
```javascript
const saveManualTranscript = async () => {
  await base44.entities.Video.update(video.id, {
    transcript_text: manualTranscript,
    transcript_status: "complete",
    transcript_source: "manual"
  });
};
```

---

## 6. Acceptance Test

### Test Video
**URL:** `https://www.youtube.com/watch?v=n8XvkVp6CfQ`
**Title:** "Learn Hebrew Every Day - הַרְגָלִים"
**Channel:** Piece of Hebrew
**Language:** Hebrew (he)
**Has Manual Captions:** Yes ✅

### Expected Behavior

1. **Add Video to App**
   - Paste URL: `https://www.youtube.com/watch?v=n8XvkVp6CfQ`
   - Click "Add"

2. **Video Appears**
   - YouTube player embeds
   - "Fetching captions..." shows briefly

3. **Transcript Loads**
   - Button changes to "Show transcript"
   - Click to expand

4. **Transcript Displays**
   ```
   הֶרְגֵּל - Habit
   לִלְמוֹד - To learn
   כָּל יוֹם - Every day
   [continues with actual Hebrew caption text...]
   ```
   - Text is RTL (right-to-left)
   - No timestamps visible
   - Language badge shows "HE"
   - Source shows "📝 YouTube Captions"

5. **Persistence Check**
   - Refresh page
   - Transcript loads instantly from DB (no API call)
   - No "Fetching captions..." message

6. **No Captions Test**
   - Try video without captions: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
   - Shows: "Transcript unavailable for this video"
   - Button: "Add Transcript Manually" appears
   - Can paste text and save as `transcript_source="manual"`

### Verification
```javascript
// Check DB record
const video = await base44.entities.Video.filter({ 
  youtube_video_id: "n8XvkVp6CfQ" 
});

console.log(video[0]);
// Expected output:
{
  id: "...",
  youtube_video_id: "n8XvkVp6CfQ",
  transcript_text: "הֶרְגֵּל...", // Full Hebrew text
  transcript_source: "youtube_captions",
  transcript_status: "complete",
  language: "he",
  caption_track_id: "...",
  transcript_generated_at: "2025-12-18T..."
}
```

---

## Quick Start Checklist

- [ ] Backend functions enabled in Base44 dashboard
- [ ] Google Cloud project created
- [ ] YouTube Data API v3 enabled
- [ ] OAuth consent screen configured
- [ ] OAuth credentials created (Client ID + Secret)
- [ ] Access & Refresh tokens generated
- [ ] Environment variables added to Base44
- [ ] Test with acceptance video
- [ ] Verify transcript matches YouTube captions exactly
- [ ] Test manual fallback with video without captions

---

## Troubleshooting

### "403 Forbidden"
- Check OAuth scopes include `youtube.force-ssl`
- Regenerate access token with correct scopes

### "404 Track Not Found"
- Caption track may have been deleted
- Try listing tracks again

### Empty Transcript
- Video may have disabled captions
- Use manual paste fallback

### Refetching on Every Load
- Check `transcript_status === "complete"` logic
- Ensure DB save is completing successfully