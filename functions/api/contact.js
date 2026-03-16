const TO_ADDRESS      = 'jwarnerst@gmail.com';
const FROM_ADDRESS    = 'jwarnerst.com <noreply@jameswarner.com.au>';
const ALLOWED_ORIGINS = ['https://jameswarner.com.au', 'https://jameswarner.au', 'https://jameswarner.site'];

export async function onRequestOptions(context) {
    const origin = context.request.headers.get('Origin');
    const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': allowed,
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}

export async function onRequestPost(context) {
    const { request, env } = context;

    const origin = request.headers.get('Origin');
    if (!ALLOWED_ORIGINS.includes(origin)) {
        return new Response(null, { status: 403 });
    }

    if (!env.RESEND_API_KEY) {
        return json({ error: 'RESEND_API_KEY not configured' }, 500, origin);
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid request body' }, 400, origin);
    }

    const { message, from_email } = body;

    if (!message) {
        return json({ error: 'Message is required.' }, 400, origin);
    }

    if (message.length > 5000) {
        return json({ error: 'Message must be 5,000 characters or fewer.' }, 400, origin);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (from_email && !emailRegex.test(from_email)) {
        return json({ error: 'Please provide a valid email address.' }, 400, origin);
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from:     FROM_ADDRESS,
            to:       [TO_ADDRESS],
            reply_to: from_email ? [from_email] : undefined,
            subject:  'Inquiry',
            text:     message,
        }),
    });

    if (!resendRes.ok) {
        const err = await resendRes.text();
        console.error('Resend error:', err);
        return json({ error: 'Failed to send' }, 500, origin);
    }

    return json({ ok: true }, 200, origin);
}


function json(data, status = 200, origin = ALLOWED_ORIGINS[0]) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
