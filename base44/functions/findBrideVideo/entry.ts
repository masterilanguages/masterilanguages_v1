import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const allMedia = await base44.entities.MediaLibrary.list();
    const bride = allMedia.find(m => m.title?.toLowerCase().includes('bride'));

    if (bride) {
      return Response.json({ found: true, id: bride.id, video_id: bride.video_id, title: bride.title });
    }

    return Response.json({ found: false, message: 'No Bride video found in MediaLibrary' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});