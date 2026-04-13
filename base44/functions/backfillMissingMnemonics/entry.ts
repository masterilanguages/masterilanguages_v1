import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Get all wordbank words missing images
    const allWords = await base44.asServiceRole.entities.Word.filter({ category: 'wordbank' });
    const missing = allWords.filter(w => !w.image_url && w.translation && w.phonetic).slice(0, 3);

    let processed = 0;
    let failed = 0;

    for (const wordData of missing) {
      try {
        const phonetic = wordData.phonetic;
        const translation = wordData.translation;
        const isVerb = wordData.is_verb === true || /^l[aeiou]/i.test(phonetic);
        const soundPhonetic = isVerb && /^l/i.test(phonetic) ? phonetic.slice(1) : phonetic;

        const concept = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Create a mnemonic to remember the word "${soundPhonetic}" meaning "${translation}".
Find an English word/phrase that SOUNDS like "${soundPhonetic}" and connect it visually to the meaning "${translation}".
Return JSON with:
- explanation: one punchy memorable sentence
- image_prompt: vivid cartoon scene description (no text, no speech bubbles, no talking, single clear subject, bright colors, white background)`,
          response_json_schema: {
            type: "object",
            properties: {
              explanation: { type: "string" },
              image_prompt: { type: "string" }
            }
          }
        });

        const imageResult = await base44.asServiceRole.integrations.Core.GenerateImage({
          prompt: `${concept.image_prompt}. Cartoon illustration, bright vivid colors, solid WHITE background, single clear subject centered. ABSOLUTELY NO TEXT, NO LETTERS, NO WORDS, NO SPEECH BUBBLES, NO TALKING anywhere in the image. Pure visual action only.`
        });

        await base44.asServiceRole.entities.Word.update(wordData.id, {
          image_url: imageResult.url,
          mnemonic_explanation: concept.explanation,
        });

        processed++;
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.error(`Failed for word ${wordData.phonetic}:`, e.message);
        failed++;
      }
    }

    return Response.json({ success: true, processed, failed, total: missing.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});