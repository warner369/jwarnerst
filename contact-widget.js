(function () {
    const TRIGGER_LABEL = 'work with me';

    const widget = document.createElement('div');
    widget.id = 'contact-widget';
    widget.innerHTML = `
        <div class="cw-panel">
            <p class="cw-question">Work with me</p>
            <p class="cw-context">I take on ServiceNow strategy, pre-sales scoping, advisory engagements and work on regular implementations + custom builds.</p>
            <textarea class="cw-message" placeholder="What's on your mind?"></textarea>
            <input class="cw-email" type="email" placeholder="Your email" />
            <button class="cw-send">send →</button>
        </div>
        <button class="cw-trigger">${TRIGGER_LABEL}</button>
    `;
    document.body.appendChild(widget);

    const trigger = widget.querySelector('.cw-trigger');
    const message = widget.querySelector('.cw-message');
    const email   = widget.querySelector('.cw-email');
    const sendBtn = widget.querySelector('.cw-send');

    trigger.addEventListener('click', () => {
        widget.classList.toggle('cw-open');
        if (widget.classList.contains('cw-open')) {
            setTimeout(() => message.focus(), 220);
        }
    });

    document.addEventListener('click', (e) => {
        if (!widget.contains(e.target)) {
            widget.classList.remove('cw-open');
        }
    });

    sendBtn.addEventListener('click', async () => {
        const msg = message.value.trim();
        if (!msg) { message.focus(); return; }

        sendBtn.textContent = '...';
        sendBtn.disabled = true;

        try {
            const res = await fetch('/functions/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msg, from_email: email.value.trim() }),
            });

            if (!res.ok) throw new Error('send failed');

            message.value = '';
            email.value   = '';
            widget.classList.remove('cw-open');
            trigger.textContent = '✓';
            setTimeout(() => { trigger.textContent = TRIGGER_LABEL; }, 3000);
        } catch {
            sendBtn.textContent = 'error. retry? →';
        } finally {
            sendBtn.disabled = false;
            if (sendBtn.textContent === '...') sendBtn.textContent = 'send →';
        }
    });
})();
