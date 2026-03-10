const FROM_ADDRESS = 'Groundwork <no-reply> <estimator@jameswarner.com.au>';
const CC_ADDRESS   = 'jwarnerst@gmail.com';

export async function onRequestPost(context) {
    const { request, env } = context;

    if (!env.RESEND_API_KEY) {
        return json({ error: 'RESEND_API_KEY not configured' }, 500);
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid request body' }, 400);
    }

    const { to_email, estimate_text, date } = body;

    if (!to_email || !estimate_text) {
        return json({ error: 'Missing required fields' }, 400);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to_email)) {
        return json({ error: 'Invalid email address' }, 400);
    }

    const html = buildEmailHTML({ to_email, estimate_text, date });

    const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from:     FROM_ADDRESS,
            to:       [to_email],
            cc:       [CC_ADDRESS],
            reply_to: CC_ADDRESS,
            subject:  `Groundwork Estimate — ${date}`,
            html,
            text: buildEmailText({ estimate_text, date }),
        }),
    });

    if (!resendRes.ok) {
        const err = await resendRes.text();
        console.error('Resend error:', err);
        return json({ error: 'Failed to send email' }, 500);
    }

    return json({ ok: true }, 200);
}

function buildEmailHTML({ to_email, estimate_text, date }) {
    const lines = estimate_text
        .split('\n')
        .map(l => l.trim() ? `<p style="margin:0 0 6px;font-family:monospace;font-size:13px;color:#444">${escHtml(l)}</p>` : '<br>')
        .join('');

    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e0e0e0">

        <!-- Header -->
        <tr><td style="background:#0d1117;padding:28px 36px">
          <p style="margin:0;font-family:monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#3d4550">GROUNDWORK</p>
          <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#e6edf3;letter-spacing:-0.03em">Engagement Estimate</p>
        </td></tr>

        <!-- Date -->
        <tr><td style="padding:16px 36px;border-bottom:1px solid #f0f0f0">
          <p style="margin:0;font-size:12px;color:#888">Date</p>
          <p style="margin:4px 0 0;font-size:14px;color:#111">${escHtml(date)}</p>
        </td></tr>

        <!-- Estimate body -->
        <tr><td style="padding:24px 36px">
          ${lines}
        </td></tr>

        <!-- Disclaimer -->
        <tr><td style="padding:0 36px 24px;border-top:1px solid #f0f0f0">
          <p style="margin:20px 0 0;font-size:11px;color:#aaa;line-height:1.6">Estimates are indicative only and based on typical delivery patterns. Actual effort varies significantly based on data quality, integration complexity, stakeholder availability, and organisational change readiness.</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9f9f9;padding:16px 36px;border-top:1px solid #e0e0e0">
          <p style="margin:0;font-size:12px;color:#888">James Warner &nbsp;·&nbsp; <a href="https://jwarnerst.com" style="color:#00c864;text-decoration:none">jwarnerst.com</a></p>
          <p style="margin:4px 0 0;font-size:11px;color:#bbb">A PDF copy has been downloaded to your device.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildEmailText({ estimate_text, date }) {
    return `GROUNDWORK — ENGAGEMENT ESTIMATE\n${'─'.repeat(40)}\nDate: ${date}\n\n${estimate_text}\n\n${'─'.repeat(40)}\nEstimates are indicative only.\njwarnerst.com`;
}

function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
