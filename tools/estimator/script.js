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

    const body = document.getElementById('results-body');

    if (!selected.length) {
        body.innerHTML = '<p class="result-empty">Select at least one uplift.</p>';
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
}

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

// ** Email quote functionality **********************************************
function generateEmailBody() {
    const selected = [
        { key: 'itsm', checked: document.getElementById('chk-itsm').checked },
    ].filter(u => u.checked);

    if (document.getElementById('chk-custom').checked) {
        selected.push({ key: 'custom', checked: true });
    }

    if (!selected.length) return null;

    const results = selected.map(({ key }) => {
        if (key === 'custom') return { key, days: getCustomDays(), scopes: [] };
        const scopes = getSelectedScopes(key);
        const days   = calcUplift(key, scopes);
        return { key, days, scopes };
    });

    const totalDays = results.reduce((sum, r) => sum + r.days, 0);
    const multi     = results.length > 1;

    let body = 'Hi James,\n\n';
    body += 'I\'d like to discuss the following ServiceNow estimate:\n\n';

    for (const { key, days, scopes } of results) {
        if (key === 'custom') {
            body += `Custom Daily Estimate - ${fmtDays(days)} - ${fmtCost(days)} excl. GST\n`;
            continue;
        }

        const def = UPLIFTS[key];
        body += `${def.label} - ${fmtDays(days)} - ${fmtCost(days)} excl. GST\n`;

        if (scopes.length) {
            for (const s of scopes) {
                body += `  - ${def.scopes[s].label} (+${def.scopes[s].days}d)\n`;
            }
        }
    }

    if (multi) {
        body += `\nCombined Estimate: ${fmtDays(totalDays)} - ${fmtCost(totalDays)} excl. GST\n`;
    }

    body += '\n\n[Add your message here]\n\n';
    body += 'Regards,\n[Your name]';

    return body;
}

function emailQuote() {
    const body = generateEmailBody();
    if (!body) {
        alert('Please calculate an estimate first.');
        return;
    }

    const subject = encodeURIComponent('ServiceNow Estimate Request');
    const encodedBody = encodeURIComponent(body);
    window.location.href = `mailto:jwarnerst@gmail.com?subject=${subject}&body=${encodedBody}`;
}

// Add email button listener
document.getElementById('email-quote-btn').addEventListener('click', emailQuote);

calcBtn.addEventListener('click', renderResults);
