(function () {
    const widget = document.createElement('div');
    widget.id = 'contact-widget';
    widget.innerHTML = `
        <div class="cw-panel">
            <p class="cw-question">what do you wanna chat about?</p>
            <textarea class="cw-message" placeholder="..."></textarea>
            <input class="cw-email" type="email" placeholder="your email" />
            <button class="cw-send">send →</button>
        </div>
        <button class="cw-trigger">@</button>
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
            setTimeout(() => { trigger.textContent = '@'; }, 3000);
        } catch {
            sendBtn.textContent = 'error. retry? →';
        } finally {
            sendBtn.disabled = false;
            if (sendBtn.textContent === '...') sendBtn.textContent = 'send →';
        }
    });
})();
