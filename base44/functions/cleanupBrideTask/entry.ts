import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Get all days
    const allDays = await base44.entities.Day.list();
    let updatedCount = 0;

    // For each non-Hebrew day, remove "The Bride" task
    for (const day of allDays) {
      if (day.language !== 'hebrew') {
        const filtered = (day.subsections || []).filter(task => 
          !task.name?.toLowerCase().includes('the bride')
        );
        
        if (filtered.length < (day.subsections || []).length) {
          await base44.entities.Day.update(day.id, { subsections: filtered });
          updatedCount++;
        }
      }
    }

    return Response.json({ 
      success: true, 
      message: `Removed "The Bride" from ${updatedCount} non-Hebrew days` 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});