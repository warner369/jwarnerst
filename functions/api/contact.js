const TO_ADDRESS   = 'jwarnerst@gmail.com';
const FROM_ADDRESS = 'jwarnerst.com <noreply@jameswarner.com.au>';

export async function onRequestOptions() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}

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
        return json({ error: 'Message is required.' }, 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (from_email && !emailRegex.test(from_email)) {
        return json({ error: 'Please provide a valid email address.' }, 400);
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from:     FROM_ADDRESS,
            to:       from_email ? [TO_ADDRESS, from_email] : [TO_ADDRESS],
            reply_to: TO_ADDRESS,
            subject:  'Someone wants to get in touch',
            text:     (from_email ? `From: ${from_email}\n\n` : '') + message,
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
        headers: {
   'Content-Type': 'application/json',
   'Access-Control-Allow-Origin': '*', // Adjust to your frontend domain
   'Access-Control-Allow-Methods': 'POST',
   'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
