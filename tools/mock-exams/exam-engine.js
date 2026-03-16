/* ** Exam engine — shared by all mock exam pages ** */
(function () {
    'use strict';

    /* ── Data ─────────────────────────────────────────────── */
    var data         = JSON.parse(document.getElementById('quiz-data').textContent);
    var quizContainer = document.getElementById('quiz');
    var scoreSummary  = document.getElementById('scoreSummary');
    var navProgress   = document.getElementById('navProgress');
    var totalQ        = data.results.length;

    var totalQuestions = 0, correctCount = 0, answeredCount = 0;

    /* ── Timer ────────────────────────────────────────────── */
    var timerRunning = false, timerSeconds = 90 * 60, timerInterval = null;
    var timerDisplay = document.getElementById('timerDisplay');
    var timerToggle  = document.getElementById('timerToggle');

    function updateTimerDisplay() {
        if (!timerDisplay) return;
        var m = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
        var s = (timerSeconds % 60).toString().padStart(2, '0');
        timerDisplay.textContent = m + ':' + s;
        if (timerSeconds <= 0) {
            clearInterval(timerInterval);
            timerRunning = false;
            if (timerToggle) timerToggle.textContent = "Time's up!";
        }
    }

    timerToggle.addEventListener('click', function () {
        if (!timerRunning) {
            timerRunning = true;
            timerToggle.textContent = 'Pause';
            timerInterval = setInterval(function () { timerSeconds--; updateTimerDisplay(); }, 1000);
        } else {
            timerRunning = false;
            clearInterval(timerInterval);
            timerToggle.textContent = 'Resume';
        }
    });

    /* Pause the timer when the tab is hidden to avoid burning time in the background */
    document.addEventListener('visibilitychange', function () {
        if (document.hidden && timerRunning) {
            clearInterval(timerInterval);
            timerRunning = false;
            if (timerToggle) timerToggle.textContent = 'Resume';
        }
    });

    /* ── Helpers ──────────────────────────────────────────── */
    function letterFromIndex(i) { return String.fromCharCode(65 + i); }

    /* Sanitise a domain name string for use as a CSS class suffix */
    function domainClass(domain) { return String(domain).replace(/\s+/g, '-'); }

    function updateScore() {
        navProgress.textContent = answeredCount + ' / ' + totalQ;
    }

    /* ── Score display ────────────────────────────────────── */
    /* Cache quiz item nodes so showScore() doesn't query the DOM on every answer */
    var quizItems = [];

    function showScore() {
        var pct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
        var domainResults = {};

        quizItems.forEach(function (w, idx) {
            var domain = (data.results[idx] && data.results[idx].domain) || 'Unknown';
            if (!domainResults[domain]) domainResults[domain] = { total: 0, correct: 0 };
            if (w.dataset.scored) {
                domainResults[domain].total++;
                if (w.dataset.wasCorrect === 'true') domainResults[domain].correct++;
            }
        });

        var h2 = document.createElement('h2');
        h2.textContent = 'Score: ' + correctCount + ' / ' + totalQuestions + ' (' + pct + '%)';

        var legend = document.createElement('div');
        legend.className = 'domain-legend';
        legend.style.marginTop = '10px';

        Object.entries(domainResults).forEach(function (entry) {
            var d = entry[0], v = entry[1];
            var dpct = v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0;
            var tag = document.createElement('span');
            tag.className = 'domain-tag tag-' + domainClass(d);
            tag.textContent = d + ': ' + v.correct + '/' + v.total + ' (' + dpct + '%)';
            legend.appendChild(tag);
        });

        scoreSummary.replaceChildren(h2, legend);
        scoreSummary.classList.add('visible');
    }

    /* ── Answer reveal ────────────────────────────────────── */
    function buildAnswerSection(wrapper, item, isCorrect, correctIndices) {
        var answerBox = wrapper.querySelector('.answer-section');

        var resultEl = document.createElement('div');
        resultEl.className = 'result ' + (isCorrect ? 'correct' : 'incorrect');
        if (item.assessment_type === 'matching') {
            resultEl.textContent = isCorrect ? 'Correct!' : 'Incorrect.';
        } else {
            resultEl.textContent = (isCorrect ? 'Correct!' : 'Incorrect.')
                + ' Answer: ' + correctIndices.map(letterFromIndex).join(', ');
        }

        var nodes = [resultEl];

        /* For matching questions, show the correct pairings as plain text */
        if (item.assessment_type === 'matching') {
            var matchP = document.createElement('p');
            matchP.style.fontSize = '13px';
            var strong = document.createElement('strong');
            strong.textContent = 'Correct matching:';
            matchP.appendChild(strong);
            item.prompt.left_items.forEach(function (l, i) {
                var br = document.createElement('br');
                var text = document.createTextNode(l + ' \u2192 ' + item.prompt.right_items[item.prompt.correct_pairs[i]]);
                matchP.appendChild(br);
                matchP.appendChild(text);
            });
            nodes.push(matchP);
        }

        /*
         * Explanation HTML is curated markup embedded directly in the HTML file as
         * a <script type="application/json"> block under version control.
         * innerHTML is intentional here. If this engine is ever connected to an
         * external question API, replace with DOMPurify.sanitize() first.
         */
        var details = document.createElement('details');
        details.className = 'explanation-section';
        var summary = document.createElement('summary');
        summary.textContent = 'Reveal Explanation';
        var expDiv = document.createElement('div');
        expDiv.innerHTML = item.prompt.explanation; /* intentional — see note above */
        details.append(summary, expDiv);
        nodes.push(details);

        answerBox.replaceChildren.apply(answerBox, nodes);
        answerBox.classList.add('visible');
    }

    function revealAnswer(wrapper, item, toggleBtn) {
        var answerBox = wrapper.querySelector('.answer-section');

        if (answerBox.classList.contains('visible')) {
            answerBox.classList.remove('visible');
            answerBox.replaceChildren();
            toggleBtn.textContent = 'Show Answer';
            if (item.assessment_type === 'matching') {
                wrapper.querySelectorAll('.matching-right').forEach(function (d) {
                    d.classList.remove('matching-correct', 'matching-incorrect');
                });
            } else {
                wrapper.querySelectorAll('.choices li').forEach(function (li) {
                    li.classList.remove('correct-choice', 'incorrect-choice');
                });
            }
            return;
        }

        var isCorrect = false;
        var correctIndices = null;

        if (item.assessment_type === 'matching') {
            var selects = wrapper.querySelectorAll('select');
            var correctPairs = item.prompt.correct_pairs;
            isCorrect = true;
            selects.forEach(function (sel, i) {
                var parent = sel.closest('.matching-right');
                parent.classList.remove('matching-correct', 'matching-incorrect');
                if (parseInt(sel.value) === correctPairs[i]) {
                    parent.classList.add('matching-correct');
                } else {
                    parent.classList.add('matching-incorrect');
                    isCorrect = false;
                }
            });
        } else {
            correctIndices = item.correct_response.map(function (c) {
                return c.toLowerCase().charCodeAt(0) - 97;
            });
            var choices = wrapper.querySelectorAll('.choices li');
            var selected = Array.from(wrapper.querySelectorAll('input:checked')).map(function (s) {
                return parseInt(s.value);
            });
            choices.forEach(function (li) { li.classList.remove('correct-choice', 'incorrect-choice'); });
            correctIndices.forEach(function (i) {
                if (choices[i]) choices[i].classList.add('correct-choice');
            });
            isCorrect = selected.length === correctIndices.length
                && selected.every(function (i) { return correctIndices.includes(i); });
            selected.forEach(function (i) {
                if (!correctIndices.includes(i) && choices[i]) choices[i].classList.add('incorrect-choice');
            });
        }

        buildAnswerSection(wrapper, item, isCorrect, correctIndices);
        toggleBtn.textContent = 'Hide Answer';

        if (!wrapper.dataset.scored) {
            totalQuestions++;
            if (isCorrect) correctCount++;
            wrapper.dataset.scored = 'true';
            wrapper.dataset.wasCorrect = isCorrect ? 'true' : 'false';
            showScore();
        }
    }

    /* ── Quiz builder ─────────────────────────────────────── */
    data.results.forEach(function (item, index) {
        var q       = item.prompt;
        var wrapper = document.createElement('div');
        wrapper.className = 'quiz-item';

        /* Header row: question number + domain tag + optional type label */
        var header = document.createElement('div');
        header.className = 'q-header';

        var qNum = document.createElement('span');
        qNum.className = 'q-number';
        qNum.textContent = 'Q' + (index + 1);

        var dTag = document.createElement('span');
        dTag.className = 'domain-tag tag-' + domainClass(item.domain);
        dTag.textContent = item.domain;

        header.append(qNum, dTag);

        var typeMap = { 'multi-select': 'MULTI-SELECT', 'matching': 'MATCHING' };
        if (typeMap[item.assessment_type]) {
            var typeLabel = document.createElement('span');
            typeLabel.className = 'type-label';
            typeLabel.textContent = typeMap[item.assessment_type];
            header.appendChild(typeLabel);
        }

        /*
         * Question text is curated HTML from the hardcoded JSON block.
         * innerHTML is intentional. See note in buildAnswerSection.
         */
        var questionEl = document.createElement('div');
        questionEl.className = 'question';
        questionEl.innerHTML = q.question; /* intentional — curated data */

        /* Content: matching grid or choices list */
        var contentEl;
        if (item.assessment_type === 'matching') {
            contentEl = document.createElement('div');
            contentEl.className = 'matching-grid';
            q.left_items.forEach(function (left, i) {
                var leftDiv = document.createElement('div');
                leftDiv.className = 'matching-left';
                var bold = document.createElement('strong');
                bold.textContent = letterFromIndex(i) + '.';
                leftDiv.append(bold, document.createTextNode('\u00a0 ' + left));

                var rightDiv = document.createElement('div');
                rightDiv.className = 'matching-right';
                var select = document.createElement('select');
                select.dataset.idx = i;

                var placeholder = document.createElement('option');
                placeholder.value = '-1';
                placeholder.textContent = '-- Select --';
                select.appendChild(placeholder);

                q.right_items.forEach(function (right, j) {
                    var opt = document.createElement('option');
                    opt.value = j;
                    opt.textContent = letterFromIndex(j) + '. ' + right;
                    select.appendChild(opt);
                });

                rightDiv.appendChild(select);
                contentEl.append(leftDiv, rightDiv);
            });
        } else {
            var isMulti = item.assessment_type === 'multi-select';
            contentEl = document.createElement('ul');
            contentEl.className = 'choices';
            q.answers.forEach(function (ans, i) {
                var li    = document.createElement('li');
                var label = document.createElement('label');
                var input = document.createElement('input');
                input.type  = isMulti ? 'checkbox' : 'radio';
                input.name  = 'q' + index + (isMulti ? '[]' : '');
                input.value = i;
                var span  = document.createElement('span');
                /*
                 * Answer text is curated HTML (may contain <strong>, <code> etc).
                 * innerHTML is intentional. See note in buildAnswerSection.
                 */
                span.innerHTML = ans.replace(/^<p>|<\/p>$/g, ''); /* intentional */
                label.append(input, span);
                li.appendChild(label);
                contentEl.appendChild(li);
            });
        }

        var showBtn = document.createElement('button');
        showBtn.className = 'show-answer';
        showBtn.textContent = 'Show Answer';
        showBtn.addEventListener('click', function () { revealAnswer(wrapper, item, showBtn); });

        var answerSection = document.createElement('div');
        answerSection.className = 'answer-section';
        /* Visibility controlled via CSS .answer-section.visible — no inline style */

        wrapper.append(header, questionEl, contentEl, showBtn, answerSection);

        /* Track answered-once per question */
        wrapper.querySelectorAll('input, select').forEach(function (input) {
            input.addEventListener('change', function () {
                if (!wrapper.dataset.answered) {
                    answeredCount++;
                    wrapper.dataset.answered = 'true';
                    updateScore();
                }
            });
        });

        quizContainer.appendChild(wrapper);
        quizItems.push(wrapper);
    });

    /* ── Bulk actions ─────────────────────────────────────── */
    function revealAll() {
        quizItems.forEach(function (w, i) {
            var box = w.querySelector('.answer-section');
            if (!box.classList.contains('visible')) {
                revealAnswer(w, data.results[i], w.querySelector('.show-answer'));
            }
        });
    }

    function submitAll() {
        revealAll();
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }

    function resetQuiz() {
        quizItems.forEach(function (w) {
            w.querySelectorAll('input[type=checkbox], input[type=radio]').forEach(function (r) { r.checked = false; });
            w.querySelectorAll('select').forEach(function (s) { s.selectedIndex = 0; });
            var box = w.querySelector('.answer-section');
            box.classList.remove('visible');
            box.replaceChildren();
            w.querySelectorAll('.choices li').forEach(function (li) {
                li.classList.remove('correct-choice', 'incorrect-choice');
            });
            w.querySelectorAll('.matching-right').forEach(function (d) {
                d.classList.remove('matching-correct', 'matching-incorrect');
            });
            w.querySelector('.show-answer').textContent = 'Show Answer';
            delete w.dataset.scored;
            delete w.dataset.answered;
            delete w.dataset.wasCorrect;
        });

        totalQuestions = 0; correctCount = 0; answeredCount = 0;
        updateScore();
        scoreSummary.replaceChildren();
        scoreSummary.classList.remove('visible');

        timerSeconds = 90 * 60;
        clearInterval(timerInterval);
        timerRunning = false;
        timerToggle.textContent = 'Start Timer';
        updateTimerDisplay();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    document.getElementById('revealAllNav').addEventListener('click', revealAll);
    document.getElementById('resetQuizNav').addEventListener('click', resetQuiz);
    document.getElementById('submitAnswers').addEventListener('click', submitAll);
    document.getElementById('resetQuiz').addEventListener('click', resetQuiz);

    updateScore();
})();
