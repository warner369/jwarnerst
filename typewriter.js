/* ** Homepage hero typewriter effect ** */
(function () {
    var el = document.querySelector('.hero-name');
    if (!el) return;

    var lines  = ['James', 'Warner'];
    var typed  = ['', ''];
    var lineIdx = 0, charIdx = 0;

    /* Use DOM methods — no innerHTML — so this never treats text as markup */
    function render() {
        el.replaceChildren();
        for (var i = 0; i <= lineIdx; i++) {
            if (i > 0) el.appendChild(document.createElement('br'));
            el.appendChild(document.createTextNode(typed[i]));
        }
        var cursor = document.createElement('span');
        cursor.className = 'cursor';
        el.appendChild(cursor);
    }

    function type() {
        var line = lines[lineIdx];
        if (charIdx < line.length) {
            typed[lineIdx] += line[charIdx++];
            render();
            setTimeout(type, 80);
        } else if (lineIdx < lines.length - 1) {
            lineIdx++;
            charIdx = 0;
            render();
            setTimeout(type, 140);
        }
    }

    render();
    setTimeout(type, 250);
})();
