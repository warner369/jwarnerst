(function () {
    const EMAIL = 'jwarnerst@gmail.com';

    const widget = document.createElement('div');
    widget.id = 'contact-widget';
    widget.innerHTML = `
        <div class="cw-panel">
            <p class="cw-question">Get in touch</p>
            <p class="cw-context">Drop me a line and I'll get back to you.</p>
            <a href="mailto:${EMAIL}" class="cw-email-link">
                <span class="cw-email-text">${EMAIL}</span>
                <span class="cw-email-arrow">↗</span>
            </a>
        </div>
        <button class="cw-trigger">contact</button>
    `;
    document.body.appendChild(widget);

    const trigger = widget.querySelector('.cw-trigger');

    trigger.addEventListener('click', () => {
        widget.classList.toggle('cw-open');
    });

    document.addEventListener('click', (e) => {
        if (!widget.contains(e.target)) {
            widget.classList.remove('cw-open');
        }
    });
})();