import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const wordId = payload?.event?.entity_id;
    const wordData = payload?.data;

    if (!wordId || !wordData) {
      return Response.json({ error: 'Missing word data' }, { status: 400 });
    }

    // Skip if already has image
    if (wordData.image_url) {
      return Response.json({ skipped: 'already has image' });
    }

    // Skip if no translation
    if (!wordData.translation || !wordData.phonetic) {
      return Response.json({ skipped: 'missing translation or phonetic' });
    }

    const phonetic = wordData.phonetic;
    const translation = wordData.translation;
    const isVerb = wordData.is_verb === true;

    // For Hebrew verbs, the leading 'l' is the infinitive prefix — strip it for sound matching
    const soundPhonetic = isVerb && /^l/i.test(phonetic) ? phonetic.slice(1) : phonetic;

    const verbNote = isVerb
      ? `\n\nIMPORTANT: This is a Hebrew verb. The leading "l" in "${phonetic}" is just the infinitive prefix — ignore it for sound matching. Find an English word/phrase that SOUNDS like "${soundPhonetic}" (without the leading l) and connect it visually to the meaning "${translation}".`
      : `\nFind an English word/phrase that SOUNDS like "${phonetic}" and connect it visually to the meaning "${translation}".`;

    // Generate mnemonic concept via LLM
    const concept = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Create a mnemonic to remember the word "${phonetic}" meaning "${translation}".${verbNote}
Return JSON with:
- explanation: one punchy memorable sentence using a sound-alike English word that hints at the meaning WITHOUT using the exact English translation "${translation}" or the exact phonetic "${phonetic}". Use synonyms or indirect references.
- image_prompt: vivid cartoon scene description (no text in image, single clear subject, bright colors, white background)`,
      response_json_schema: {
        type: "object",
        properties: {
          explanation: { type: "string" },
          image_prompt: { type: "string" }
        }
      }
    });

    // Generate image
    const imageResult = await base44.asServiceRole.integrations.Core.GenerateImage({
      prompt: `${concept.image_prompt}. Cartoon illustration, bright vivid colors, solid WHITE background, single clear subject centered. ABSOLUTELY NO TEXT, NO LETTERS, NO WORDS anywhere in the image.`
    });

    // Update the word with mnemonic data
    await base44.asServiceRole.entities.Word.update(wordId, {
      image_url: imageResult.url,
      mnemonic_explanation: concept.explanation,
    });

    return Response.json({ success: true, wordId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});