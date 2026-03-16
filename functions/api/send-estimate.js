const FROM_ADDRESS    = 'Services Estimator <estimator@jameswarner.com.au>';
const CC_ADDRESS      = 'jwarnerst@gmail.com';
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

    const { to_email, date, sections, total_days, total_cost, multi } = body;

    if (!to_email || !sections || !date) {
        return json({ error: 'Missing required fields' }, 400, origin);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to_email)) {
        return json({ error: 'Invalid email address' }, 400, origin);
    }

    if (!Array.isArray(sections) || sections.length === 0 || sections.length > 20) {
        return json({ error: 'sections must be an array of 1–20 items' }, 400, origin);
    }

    /* Coerce and validate each section so a crafted payload cannot corrupt the email */
    const safeSections = sections.map(sec => ({
        label:     String(sec.label     ?? '').slice(0, 200),
        days:      Math.max(0, Math.floor(Number(sec.days)      || 0)),
        cost:      Math.max(0, Math.floor(Number(sec.cost)      || 0)),
        base_days: Math.max(0, Math.floor(Number(sec.base_days) || 0)),
        scopes: Array.isArray(sec.scopes)
            ? sec.scopes.slice(0, 20).map(s => ({
                label: String(s.label ?? '').slice(0, 200),
                days:  Math.max(0, Math.floor(Number(s.days) || 0)),
              }))
            : [],
    }));

    const safeTotalDays = Math.max(0, Math.floor(Number(total_days) || 0));
    const safeTotalCost = Math.max(0, Math.floor(Number(total_cost) || 0));

    const html = buildEmailHTML({ to_email, date, sections: safeSections, total_days: safeTotalDays, total_cost: safeTotalCost, multi });
    const text = buildEmailText({ date, sections: safeSections, total_days: safeTotalDays, total_cost: safeTotalCost, multi });

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
            subject:  `Services Estimate \u2014 ${date}`,
            html,
            text,
        }),
    });

    if (!resendRes.ok) {
        const err = await resendRes.text();
        console.error('Resend error:', err);
        return json({ error: 'Failed to send email' }, 500, origin);
    }

    return json({ ok: true }, 200, origin);
}

// ---------------------------------------------------------------------------
// HTML email builder
// ---------------------------------------------------------------------------

function buildEmailHTML({ to_email, date, sections, total_days, total_cost, multi }) {
    const fmtDays = d => d === 1 ? '1 day' : `${d} days`;
    const fmtCost = c => '$' + Number(c).toLocaleString('en-AU') + ' AUD';

    // Combined total block (multi-uplift only)
    const combinedBlock = multi ? `
        <tr>
          <td bgcolor="#0a1a0f" style="padding:20px 36px;border-left:1px solid #00c864;border-right:1px solid #00c864;">
            <p style="margin:0 0 6px 0;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#3d4550;">Combined Total</p>
            <p style="margin:0 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:30px;font-weight:bold;color:#00c864;letter-spacing:-0.5px;">${fmtDays(total_days)}</p>
            <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:12px;color:#7d8590;">${fmtCost(total_cost)} excl. GST</p>
          </td>
        </tr>
        <tr><td bgcolor="#0d1117" height="1" style="font-size:0;line-height:0;"> </td></tr>` : '';

    // Per-section blocks
    const sectionBlocks = sections.map((sec, idx) => {
        const isLast = idx === sections.length - 1;

        const scopeRows = sec.scopes && sec.scopes.length ? `
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;border-top:1px solid #1e2530;">
              <tr>
                <td style="font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#3d4550;padding:8px 0 4px 0;">Breakdown</td>
                <td align="right" style="font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#3d4550;padding:8px 0 4px 0;">Days</td>
              </tr>
              <tr>
                <td style="font-family:'Courier New',Courier,monospace;font-size:11px;color:#7d8590;padding:5px 0;border-top:1px solid #1e2530;">Base</td>
                <td align="right" style="font-family:'Courier New',Courier,monospace;font-size:11px;color:#7d8590;padding:5px 0;border-top:1px solid #1e2530;">${sec.base_days}d</td>
              </tr>
              ${sec.scopes.map(s => `
              <tr>
                <td style="font-family:'Courier New',Courier,monospace;font-size:11px;color:#7d8590;padding:5px 0;border-top:1px solid #1e2530;">+ ${escHtml(s.label)}</td>
                <td align="right" style="font-family:'Courier New',Courier,monospace;font-size:11px;color:#7d8590;padding:5px 0;border-top:1px solid #1e2530;">+${s.days}d</td>
              </tr>`).join('')}
            </table>` : '';

        return `
        <tr>
          <td bgcolor="#111820" style="padding:24px 36px;border-left:1px solid #1e2530;border-right:1px solid #1e2530;border-top:1px solid #1e2530;${isLast ? '' : 'border-bottom:none;'}">
            <p style="margin:0 0 6px 0;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#3d4550;">${escHtml(sec.label)}</p>
            <p style="margin:0 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:bold;color:#e6edf3;letter-spacing:-0.5px;">${fmtDays(sec.days)}</p>
            <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:12px;color:#7d8590;">${fmtCost(sec.cost)} excl. GST</p>
            ${scopeRows}
          </td>
        </tr>`;
    }).join('');

    return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Services Estimate</title>
  <!--[if mso]><style type="text/css">table{border-collapse:collapse;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#0d1117;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0d1117">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td bgcolor="#111820" style="padding:32px 36px 16px;border:1px solid #1e2530;border-bottom:none;">
              <p style="margin:0 0 10px 0;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#3d4550;">Services Estimator &nbsp;&middot;&nbsp; James Warner</p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:bold;color:#e6edf3;letter-spacing:-0.5px;">Engagement Estimate</p>
            </td>
          </tr>

          <!-- Date bar -->
          <tr>
            <td bgcolor="#111820" style="padding:8px 36px 16px;border-left:1px solid #1e2530;border-right:1px solid #1e2530;">
              <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:2px;color:#3d4550;">${escHtml(date)}</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td bgcolor="#111820" style="padding:0 36px 28px;border-left:1px solid #1e2530;border-right:1px solid #1e2530;">
              <p style="margin:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#c9d1d9;line-height:1.6;">Here&rsquo;s the estimate based on what we discussed.</p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#7d8590;line-height:1.6;">Let me know if anything needs adjusting.</p>
            </td>
          </tr>

          <!-- Combined total (multi only) -->
          ${combinedBlock}

          <!-- Per-uplift sections -->
          ${sectionBlocks}

          <!-- Next steps / contact -->
          <tr>
            <td bgcolor="#111820" style="padding:24px 36px;border-left:1px solid #1e2530;border-right:1px solid #1e2530;border-top:1px solid #2d3848;">
              <p style="margin:0 0 6px 0;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#3d4550;">Next Steps</p>
              <p style="margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#c9d1d9;line-height:1.6;">Happy to jump on a call if you want to talk through it. Just reply and we&rsquo;ll sort it from there.</p>
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right:24px;font-family:'Courier New',Courier,monospace;font-size:11px;color:#7d8590;">
                    <span style="color:#3d4550;">Email</span>&nbsp;&nbsp;<a href="mailto:james@jameswarner.com.au" style="color:#00c864;text-decoration:none;">james@jameswarner.com.au</a>
                  </td>
                  <td style="font-family:'Courier New',Courier,monospace;font-size:11px;color:#7d8590;">
                    <span style="color:#3d4550;">Web</span>&nbsp;&nbsp;<a href="https://jwarnerst.com" style="color:#00c864;text-decoration:none;">jwarnerst.com</a>
                  </td>
                </tr>
              </table>
              <p style="margin:14px 0 0 0;font-family:'Courier New',Courier,monospace;font-size:10px;color:#3d4550;">This estimate is valid for 30 days from the date above.</p>
            </td>
          </tr>

          <!-- Disclaimer -->
          <tr>
            <td bgcolor="#111820" style="padding:20px 36px;border:1px solid #1e2530;border-top:1px solid #1e2530;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#3d4550;line-height:1.7;">Estimates are indicative only and based on typical delivery patterns. Actual effort varies based on data quality, integration complexity, stakeholder availability, and organisational change readiness.</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="#0d1117" style="padding:16px 36px;border-top:2px solid #00c864;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:'Courier New',Courier,monospace;font-size:11px;color:#7d8590;">
                    James Warner &nbsp;&middot;&nbsp; <a href="https://jwarnerst.com" style="color:#00c864;text-decoration:none;">jwarnerst.com</a>
                  </td>
                  <td align="right" style="font-family:'Courier New',Courier,monospace;font-size:11px;color:#3d4550;">
                    Prepared for: ${escHtml(to_email)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Plain-text fallback
// ---------------------------------------------------------------------------

function buildEmailText({ date, sections, total_days, total_cost, multi }) {
    const fmtDays = d => d === 1 ? '1 day' : `${d} days`;
    const fmtCost = c => '$' + Number(c).toLocaleString('en-AU') + ' AUD';
    const rule = '\u2500'.repeat(48);
    let text = `SERVICES ESTIMATOR \u2014 JAMES WARNER\n${rule}\nDate: ${date}\n\nHere\u2019s the estimate based on what we discussed.\n\n${rule}\n\n`;

    if (multi) {
        text += `COMBINED TOTAL\n${fmtDays(total_days)}  |  ${fmtCost(total_cost)} excl. GST\n\n${rule}\n\n`;
    }

    for (const sec of sections) {
        text += `${sec.label.toUpperCase()}\n${fmtDays(sec.days)}  |  ${fmtCost(sec.cost)} excl. GST\n`;
        text += `  Base: ${sec.base_days}d\n`;
        for (const s of sec.scopes) {
            text += `  + ${s.label} (+${s.days}d)\n`;
        }
        text += '\n';
    }

    text += `${rule}\nNEXT STEPS\nHappy to jump on a call if you want to talk through it. Just reply and we\u2019ll sort it from there.\n\nEmail: james@jameswarner.com.au\nWeb:   jwarnerst.com\n\nThis estimate is valid for 30 days from the date above.\n\n${rule}\nEstimates are indicative only and based on typical delivery patterns. Actual effort varies based on data quality, integration complexity, stakeholder availability, and organisational change readiness.\njwarnerst.com`;
    return text;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function json(data, status = 200, origin = ALLOWED_ORIGINS[0]) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
