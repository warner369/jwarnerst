const TO_ADDRESS   = 'jwarnerst@gmail.com';
const FROM_ADDRESS = 'jwarnerst.com <noreply@jameswarner.com.au>';

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

    const { message, from_email } = body;

    if (!message) {
        return json({ error: 'Missing message' }, 400);
    }

    const fromEmail = from_email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from_email)
        ? from_email
        : null;

    const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from:     FROM_ADDRESS,
            to:       [TO_ADDRESS],
            reply_to: TO_ADDRESS,
            subject:  'Someone wants to get in touch',
            text:     (fromEmail ? `From: ${fromEmail}\n\n` : '') + message,
        }),
    });

    if (!resendRes.ok) {
        const err = await resendRes.text();
        console.error('Resend error:', err);
        return json({ error: 'Failed to send' }, 500);
    }

    return json({ ok: true }, 200);
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
