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
    const anyChecked = ['chk-itsm', 'chk-custom']
        .some(id => document.getElementById(id).checked);
    calcBtn.classList.toggle('ready', anyChecked);
}

// ** Render results **********************************************
function getCustomDays() {
    const raw = parseInt(document.getElementById('custom-days').value, 10);
    return Math.max(1, isNaN(raw) ? 1 : Math.floor(raw));
}

function renderResults() {
    const selected = [
        { key: 'itsm', checked: document.getElementById('chk-itsm').checked },
    ].filter(u => u.checked);

    if (document.getElementById('chk-custom').checked) {
        selected.push({ key: 'custom', checked: true });
    }

    const body         = document.getElementById('results-body');
    const emailCapture = document.getElementById('email-capture');

    if (!selected.length) {
        body.innerHTML = '<p class="result-empty">Select at least one uplift.</p>';
        emailCapture.classList.remove('visible');
        lastResults = null;
        return;
    }

    const results = selected.map(({ key }) => {
        if (key === 'custom') return { key, days: getCustomDays(), scopes: [] };
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
        if (key === 'custom') {
            html += `
        <div class="result-block">
            <div class="result-block-label">Custom Daily Estimate</div>
            <div class="result-value ${multi ? '' : 'accent'}">${fmtDays(days)}</div>
            <div class="result-cost">${fmtCost(days)} excl. GST</div>
        </div>`;
            continue;
        }

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

// ** Email send via Pages Function **********************************************
async function sendEstimateEmail(recipientEmail) {
    const date = new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' });

    const sections = lastResults.results.map(({ key, days, scopes }) => {
        if (key === 'custom') {
            return {
                label:     'Custom Daily Estimate',
                days,
                cost:      days * DAILY_RATE,
                base_days: days,
                scopes:    [],
            };
        }
        const def = UPLIFTS[key];
        return {
            label:     def.label,
            days,
            cost:      days * DAILY_RATE,
            base_days: def.base,
            scopes:    scopes.map(s => ({ label: def.scopes[s].label, days: def.scopes[s].days })),
        };
    });

    const res = await fetch('/api/send-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            to_email:   recipientEmail,
            date,
            sections,
            total_days: lastResults.totalDays,
            total_cost: lastResults.totalDays * DAILY_RATE,
            multi:      lastResults.multi,
        }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Send failed');
    }
}

// ** Email button handler **********************************************

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
        await sendEstimateEmail(email);
        statusEl.textContent = 'Estimate sent — check your inbox.';
        statusEl.className   = 'email-status success';
    } catch (err) {
        console.error('Email send failed:', err);
        statusEl.textContent = 'Send failed — try again or email directly.';
        statusEl.className   = 'email-status error';
    }

    btn.textContent = 'Send Estimate →';
    btn.disabled    = false;
});

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
bindCard('chk-custom', 'scopes-custom');

// Scope checkbox visual state
document.querySelectorAll('.scope-check input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
        cb.closest('.scope-check').classList.toggle('selected', cb.checked);
    });
});

calcBtn.addEventListener('click', renderResults);
