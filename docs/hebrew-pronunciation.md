# Hebrew pronunciation in Masteri

Masteri follows the Backpack platform standard. This app does not call
backpack-saas over HTTP. "Backpack" in the student UI is the word bank
(`Word` rows at `/portal/library`). The shared contract is the code the
platform already uses:

- Romanization text and the quality model live in backpack-saas
  `lib/chapterPrompts.ts` (`HEBREW_TRANSLIT_RULES`, `QUALITY_MODEL`).
  The same strings are in `lib/hebrew/romanize.js`.
- Speech goes through `generateLessonAudio({ text, language })` in
  `lib/audio/lessonAudio.ts`, the same player backpack-saas defines.
- Nikud stripping uses Unicode U+0591–U+05C7, the same block as
  `stripNikud` in backpack-saas `lib/verbs.ts`.
- Pointing and transliteration that need a model go through
  `base44.integrations.Core.InvokeLLM`, which is the platform
  `invoke-llm` edge function (Claude). Hebrew transliteration prompts
  send `model: claude-opus-5-5`. If that model is rejected, the call
  retries on the function's default model.

## Romanization

Modern Israeli Hebrew, the way it is spoken (and sung), not Ashkenazi
and not Biblical:

- ח and כ/ך without dagesh are `ch`. כּ is `k`.
- צ/ץ is `tz`. שׁ is `sh`. שׂ is `s`. ת and ט are `t`.
- א and ע are silent. No apostrophes and no hyphens.
- A final ה is silent (`beitza`, not `beitzah`).
- One Latin word per Hebrew word. Prefixes stay joined (`lechayai`).
- Vowels are the Israeli ones: kamatz/patach `a`, tsere/segol `e`,
  hiriq `i`, cholam `o`, shuruk/kubutz `u`.

Unvocalized sentences are not guessed letter by letter. A known word or
pointed text is romanized locally. Anything else is sent to Claude Opus
with the rules above. The first accepted spelling for a Hebrew string
is cached in memory and in `localStorage` (`masteri.hebrewTranslit.v1`).

### Before → after

| Hebrew | Before | After |
| --- | --- | --- |
| ביצה | Beitzah | beitza |
| גבינה | Gvinah | gvina |
| תה | Teh | te |
| משחק | Misachak | mischak |
| לצחוק | Litschok | litzchok |
| מגלשה | Maglasha | maglesha |
| פנים | Pnim | panim |
| מרץ | merts | martz |
| צהוב | tsahov | tzahov |
| שבת | shabbos | shabbat |
| ברוך | boruch | baruch |
| תורה | toyrah | tora |
| תֵּלְכִי | Tel-ch-i | telchi |
| תְּדַבֵּר | T-daber | tedaber |
| נכנסת לחיי | (model guessed lekhayay) | nichnast lechayai |

## Listen button

`HebrewListenButton` sits next to Hebrew words and phrases that have a
transliteration: word cards, flashcards, the translator, karaoke and
video lines, singing lines, grammar rows, and the baby-word game.

Playback order for Hebrew:

1. Azure Neural `he-IL-HilaNeural` (or `AZURE_SPEECH_VOICE`, for example `he-IL-AvriNeural`)
2. Google Cloud `he-IL-Neural2-A` (or `GOOGLE_TTS_VOICE`)
3. ElevenLabs multilingual, voice `ELEVENLABS_HEBREW_VOICE_ID`
4. The browser `he-IL` voice, which is what Backpack does when no neural voice is configured

Audio is cached in the browser and in the server process. The button
shows loading, playing, and a quiet error state.

### Environment variables

Set these on the Next.js server (Vercel). The first one that is set is used.

```
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=eastus
AZURE_SPEECH_VOICE=he-IL-HilaNeural

GOOGLE_TTS_API_KEY=
GOOGLE_TTS_VOICE=he-IL-Neural2-A

ELEVENLABS_API_KEY=
ELEVENLABS_HEBREW_VOICE_ID=
ELEVENLABS_MODEL=eleven_multilingual_v2
```

`ANTHROPIC_API_KEY` and optional `LLM_MODEL` belong to the Supabase
`invoke-llm` function, not to this Next app. This app asks that
function for `claude-opus-5-5` on Hebrew transliteration prompts.

Optional override for the vocalizer:

```
DICTA_NAKDAN_URL=https://nakdan-4-0.loadbalancer.dicta.org.il/api
```

## Nikud button

When a screen is showing Hebrew phonetics (the transliteration line, or
the flashcard "abc" view), a **Nikud** button is shown on the Hebrew
text. The last choice is stored on the device as
`masteri.hebrew.showNikud`.

- Off: every character from U+0591 through U+05C7 is removed.
- On: the word is pointed with Dicta Nakdan, modern genre. If the
  transliteration is one Latin word per Hebrew word, the pointing that
  matches that pronunciation is chosen (so ספר follows `sefer` or
  `sapar`). If Nakdan fails, Claude Opus adds the points through
  `InvokeLLM`. The letters are never changed. Results are cached
  (`masteri.hebrew.nikud.v1` in the browser, and in the server process).
