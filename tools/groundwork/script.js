// ** Estimation constants **********************************************
const DAILY_RATE = 1200; // AUD excl. GST

const UPLIFTS = {
    itsm: {
        label: 'ITSM Implementation',
        base: 15,
        scopes: {
            catalog_requests:      { label: 'Catalog & Request Management', days: 10 },
            major_incident:        { label: 'Major Incident Management',    days: 5  },
            knowledge_mgmt:        { label: 'Knowledge Management',         days: 5  },
            employee_center:       { label: 'Employee Center (Portal)',      days: 10 },
            performance_analytics: { label: 'Performance Analytics',         days: 5  },
            now_assist:            { label: 'Now Assist (AI)',               days: 10 },
            walkup:                { label: 'Walk-Up Experience',            days: 5  },
            integrations:          { label: 'Integrations',                  days: 5  },
        },
    },
    
};

// ** Helpers **********************************************
function getSelectedScopes(upliftKey) {
    return [...document.querySelectorAll(`input[data-uplift="${upliftKey}"]:checked`)]
        .map(el => el.value);
}

function calcUplift(type, scopes) {
    const def = UPLIFTS[type];
    let days = def.base;
    for (const s of scopes) {
        days += def.scopes[s]?.days ?? 0;
    }
    return Math.max(1, days);
}

function fmtDays(d) {
    return d === 1 ? '1 day' : `${d} days`;
}

function fmtCost(days) {
    const total = days * DAILY_RATE;
    return '$' + total.toLocaleString('en-AU') + ' AUD';
}

// ** Last computed results (used by PDF + email) **********************************************
let lastResults = null;

// ** Calculate button active state **********************************************
const calcBtn = document.getElementById('calc-btn');

function updateCalcBtnState() {
    const anyChecked = ['chk-itsm']
        .some(id => document.getElementById(id).checked);
    calcBtn.classList.toggle('ready', anyChecked);
}

// ** Render results **********************************************
function renderResults() {
    const selected = [
        { key: 'itsm', checked: document.getElementById('chk-itsm').checked },
    ].filter(u => u.checked);

    const body         = document.getElementById('results-body');
    const emailCapture = document.getElementById('email-capture');

    if (!selected.length) {
        body.innerHTML = '<p class="result-empty">Select at least one uplift.</p>';
        emailCapture.classList.remove('visible');
        lastResults = null;
        return;
    }

    const results = selected.map(({ key }) => {
        const scopes = getSelectedScopes(key);
        const days   = calcUplift(key, scopes);
        return { key, days, scopes };
    });

    const totalDays = results.reduce((sum, r) => sum + r.days, 0);
    const multi     = results.length > 1;

    lastResults = { results, totalDays, multi };

    let html = '';

    if (multi) {
        html += `
        <div class="result-block">
            <div class="result-block-label">Combined</div>
            <div class="result-value accent">${fmtDays(totalDays)}</div>
            <div class="result-cost">${fmtCost(totalDays)} excl. GST</div>
        </div>`;
    }

    for (const { key, days, scopes } of results) {
        const def = UPLIFTS[key];

        const scopeRows = scopes.length
            ? `<div class="result-scope-rows">` +
              scopes.map(s => `
                <div class="scope-row">
                    <span>${def.scopes[s].label}</span>
                    <span class="scope-row-weeks">+${def.scopes[s].days}d</span>
                </div>`).join('') +
              `</div>`
            : '';

        html += `
        <div class="result-block">
            <div class="result-block-label">${def.label}</div>
            <div class="result-value ${multi ? '' : 'accent'}">${fmtDays(days)}</div>
            <div class="result-cost">${fmtCost(days)} excl. GST</div>
            ${scopeRows}
        </div>`;
    }

    body.innerHTML = html;
    emailCapture.classList.add('visible');
    document.getElementById('email-status').textContent = '';
    document.getElementById('email-status').className   = 'email-status';
}

// ** PDF generation **********************************************
function generatePDF(recipientEmail) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    const { results, totalDays, multi } = lastResults;

    const green = [0, 200, 100];
    const black = [20, 20, 20];
    const grey  = [100, 100, 100];
    const light = [220, 220, 220];

    let y = 20;

    // Header
    doc.setFontSize(8);
    doc.setTextColor(...grey);
    doc.text('GROUNDWORK  ·  SERVICENOW SCOPING ESTIMATE', 20, y);
    doc.text(
        new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' }),
        190, y, { align: 'right' }
    );

    y += 10;
    doc.setDrawColor(...light);
    doc.line(20, y, 190, y);

    y += 12;
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text('Engagement Estimate', 20, y);

    // Combined summary
    if (multi) {
        y += 14;
        doc.setFillColor(...green);
        doc.rect(20, y, 170, 18, 'F');
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`Combined: ${fmtDays(totalDays)}`, 27, y + 7);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`${fmtCost(totalDays)} excl. GST`, 27, y + 13);
        y += 22;
    }

    // Per-uplift blocks
    for (const { key, days, scopes } of results) {
        const def = UPLIFTS[key];
        y += 10;
        doc.setDrawColor(...light);
        doc.line(20, y, 190, y);
        y += 8;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...grey);
        doc.text(def.label.toUpperCase(), 20, y);

        y += 7;
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...(multi ? black : green));
        doc.text(fmtDays(days), 20, y);

        y += 6;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...grey);
        doc.text(`${fmtCost(days)} excl. GST`, 20, y);

        if (scopes.length) {
            y += 6;
            doc.setFontSize(7.5);
            doc.setTextColor(...grey);
            doc.text('BASE', 20, y);
            doc.text(`${def.base}d`, 190, y, { align: 'right' });

            for (const s of scopes) {
                y += 5;
                doc.text(`+ ${def.scopes[s].label}`, 20, y);
                doc.text(`+${def.scopes[s].days}d`, 190, y, { align: 'right' });
            }
        }
    }

    // Disclaimer
    y += 16;
    doc.setDrawColor(...light);
    doc.line(20, y, 190, y);
    y += 8;
    doc.setFontSize(7.5);
    doc.setTextColor(...grey);
    const disclaimer = 'Estimates are indicative only and based on typical delivery patterns. Actual effort varies significantly based on data quality, integration complexity, stakeholder availability, and organisational change readiness.';
    doc.text(doc.splitTextToSize(disclaimer, 170), 20, y);

    // Footer
    doc.setDrawColor(...light);
    doc.line(20, 282, 190, 282);
    doc.setFontSize(7.5);
    doc.setTextColor(...grey);
    doc.text('James Warner  ·  jwarnerst.com', 20, 287);
    doc.text(`Prepared for: ${recipientEmail}`, 190, 287, { align: 'right' });

    return doc;
}

// ** Build plain-text estimate for email **********************************************
function buildEstimateText() {
    const { results, totalDays, multi } = lastResults;
    let text = '';

    if (multi) {
        text += `COMBINED\n${fmtDays(totalDays)}  |  ${fmtCost(totalDays)} excl. GST\n\n`;
    }

    for (const { key, days, scopes } of results) {
        const def = UPLIFTS[key];
        text += `${def.label}\n${fmtDays(days)}  |  ${fmtCost(days)} excl. GST\n`;
        text += `  Base: ${def.base}d\n`;
        for (const s of scopes) {
            text += `  + ${def.scopes[s].label} (+${def.scopes[s].days}d)\n`;
        }
        text += '\n';
    }

    text += 'Estimates are indicative only and based on typical delivery patterns.';
    return text;
}

// ** Email send via Pages Function **********************************************
async function sendEstimateEmail(recipientEmail) {
    const date = new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' });

    const res = await fetch('/api/send-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            to_email:      recipientEmail,
            estimate_text: buildEstimateText(),
            date,
        }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Send failed');
    }
}

// ** Email button handler **********************************************

/*
document.getElementById('email-btn').addEventListener('click', async () => {
    const emailInput = document.getElementById('recipient-email');
    const statusEl   = document.getElementById('email-status');
    const btn        = document.getElementById('email-btn');
    const email      = emailInput.value.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        statusEl.textContent = 'Please enter a valid email address.';
        statusEl.className   = 'email-status error';
        return;
    }

    if (!lastResults) return;

    btn.disabled    = true;
    btn.textContent = 'Sending…';
    statusEl.textContent = '';
    statusEl.className   = 'email-status';

    try {
        generatePDF(email).save('groundwork-estimate.pdf');
        await sendEstimateEmail(email);
        statusEl.textContent = 'PDF generated. Estimate sent — check your inbox.';
        statusEl.className   = 'email-status success';
    } catch (err) {
        console.error('Email send failed:', err);
        statusEl.textContent = 'PDF generated. Email failed — check server config.';
        statusEl.className   = 'email-status error';
    }

    btn.textContent = 'Download PDF & Send →';
    btn.disabled    = false;
});*/

// ** Card toggle bindings **********************************************
function bindCard(checkId, scopesId) {
    const chk    = document.getElementById(checkId);
    const scopes = document.getElementById(scopesId);
    const card   = chk.closest('.uplift-card');

    chk.addEventListener('change', () => {
        scopes.classList.toggle('visible', chk.checked);
        card.classList.toggle('selected', chk.checked);
        updateCalcBtnState();
    });
}

bindCard('chk-itsm', 'scopes-itsm');

// Scope checkbox visual state
document.querySelectorAll('.scope-check input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
        cb.closest('.scope-check').classList.toggle('selected', cb.checked);
    });
});

calcBtn.addEventListener('click', renderResults);
