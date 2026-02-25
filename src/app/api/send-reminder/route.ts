import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route: Send Reminder Email
 * ==============================
 * Sends email reminders for deadline notifications
 *
 * In production, this would use:
 * - Resend (resend.com)
 * - SendGrid
 * - Nodemailer with SMTP
 * - Or any other email service
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, noteTitle, deadline, projectName, noteContent } = body;

    if (!to || !subject || !noteTitle) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, noteTitle' },
        { status: 400 }
      );
    }

    // Check if we have email configuration
    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey) {
      // Use Resend API
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Erasmus+ Architect <notifications@erasmus-architect.com>',
          to: [to],
          subject: subject,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #003399 0%, #FFCC00 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
                .note-card { background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 15px; margin: 15px 0; transform: rotate(-1deg); }
                .deadline { color: #dc3545; font-weight: bold; }
                .button { display: inline-block; background: #003399; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
                .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0;">📋 Erinnerung</h1>
                  <p style="margin: 5px 0 0;">Erasmus+ Architect</p>
                </div>
                <div class="content">
                  <p>Hallo,</p>
                  <p>Dies ist eine Erinnerung für eine Notiz in deinem Projekt <strong>${projectName || 'Unbenannt'}</strong>:</p>

                  <div class="note-card">
                    <h3 style="margin: 0 0 10px;">📝 ${noteTitle}</h3>
                    ${noteContent ? `<p style="margin: 0 0 10px;">${noteContent}</p>` : ''}
                    ${deadline ? `<p class="deadline">📅 Deadline: ${new Date(deadline).toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
                  </div>

                  <p>Vergiss nicht, diese Aufgabe zu erledigen!</p>

                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/projects" class="button">
                    Zum Projekt →
                  </a>

                  <div class="footer">
                    <p>Diese E-Mail wurde automatisch von Erasmus+ Architect gesendet.</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({
          success: true,
          messageId: data.id,
          message: 'Email sent successfully',
        });
      } else {
        const error = await response.text();
        console.error('[Email] Resend error:', error);
        return NextResponse.json(
          { error: 'Failed to send email', details: error },
          { status: 500 }
        );
      }
    } else {
      // No email service configured - log and simulate success
      console.log('[Email] Would send reminder:', {
        to,
        subject,
        noteTitle,
        deadline,
        projectName,
      });

      return NextResponse.json({
        success: true,
        simulated: true,
        message: 'Email simulation successful (no RESEND_API_KEY configured)',
        note: 'To enable real emails, add RESEND_API_KEY to your .env.local file',
      });
    }
  } catch (error) {
    console.error('[Email] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process email request', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET endpoint to check configuration status
export async function GET() {
  const hasResend = !!process.env.RESEND_API_KEY;

  return NextResponse.json({
    configured: hasResend,
    provider: hasResend ? 'resend' : 'none',
    message: hasResend
      ? 'Email service is configured and ready'
      : 'No email service configured. Add RESEND_API_KEY to enable email notifications.',
  });
}
