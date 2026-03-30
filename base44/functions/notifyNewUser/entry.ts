import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userEmail, userName, language, avatarName } = await req.json();

    // Get admin users
    const users = await base44.asServiceRole.entities.User.list();
    const adminUsers = users.filter(u => u.role === 'admin');

    if (adminUsers.length === 0) {
      return Response.json({ success: true, message: 'No admins to notify' });
    }

    // Send email to all admins
    for (const admin of adminUsers) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: admin.email,
        subject: '🎉 New User Signup',
        body: `
A new user has signed up!

👤 Name: ${userName || 'Not provided'}
📧 Email: ${userEmail}
🌍 Learning Language: ${language}
🎭 Avatar: ${avatarName}

User ID: ${user.id}
Signed up: ${new Date().toLocaleString()}

You can manage users in your Base44 dashboard.
        `
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error notifying admins:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});