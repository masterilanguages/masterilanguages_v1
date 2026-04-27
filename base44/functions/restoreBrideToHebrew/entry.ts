import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Find Hebrew Day 1
    const hebrewDays = await base44.entities.Day.filter({ language: 'hebrew', day_number: 1 });
    if (hebrewDays.length === 0) {
      return Response.json({ error: 'Hebrew Day 1 not found' }, { status: 404 });
    }

    const day = hebrewDays[0];
    const hasBride = (day.subsections || []).some(s => s.name?.toLowerCase().includes('the bride'));

    if (!hasBride) {
      // Add "The Bride" task to the beginning
      const newTask = {
        id: 'bride_video',
        name: "▶ The Bride",
        video_id: "lIWAPtRh1Ac",
        page: "MediaLibrary"
      };
      const updated = [newTask, ...(day.subsections || [])];
      await base44.entities.Day.update(day.id, { subsections: updated });
      return Response.json({ success: true, message: 'The Bride video restored to Hebrew Day 1' });
    }

    return Response.json({ success: true, message: 'The Bride already in Hebrew Day 1' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});