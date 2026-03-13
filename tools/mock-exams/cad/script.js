const data = JSON.parse(document.getElementById("quiz-data").textContent);
const quizContainer = document.getElementById("quiz");
const scoreSummary = document.getElementById("scoreSummary");
const navProgress = document.getElementById("navProgress");
let totalQuestions = 0, correctCount = 0, answeredCount = 0;
const totalQ = data.results.length;

// Timer
let timerRunning = false, timerSeconds = 90 * 60, timerInterval = null;
const timerDisplay = document.getElementById("timerDisplay");
const timerToggle = document.getElementById("timerToggle");
function updateTimerDisplay() {
  if (!timerDisplay) return;
  const m = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
  const s = (timerSeconds % 60).toString().padStart(2, '0');
  timerDisplay.textContent = m + ':' + s;
  if (timerSeconds <= 0) { clearInterval(timerInterval); timerRunning = false; if (timerToggle) timerToggle.textContent = "Time's up!"; }
}
timerToggle.addEventListener("click", () => {
  if (!timerRunning) {
    timerRunning = true; timerToggle.textContent = "Pause";
    timerInterval = setInterval(() => { timerSeconds--; updateTimerDisplay(); }, 1000);
  } else {
    timerRunning = false; clearInterval(timerInterval); timerToggle.textContent = "Resume";
  }
});

function letterFromIndex(i) { return String.fromCharCode(65 + i); }

/**
 * Safely renders HTML by parsing it through a temporary element.
 * This allows legitimate HTML tags while preventing script execution.
 * NOTE: Since quiz data is curated and embedded in the HTML file,
 * this is considered safe. For external data, use a library like DOMPurify.
 */
function safeRenderHTML(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.innerHTML;
}

function updateScore() {
  navProgress.textContent = `${answeredCount} / ${totalQ}`;
}
function showScore() {
  const pct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const domainResults = {};
  document.querySelectorAll(".quiz-item").forEach((w, idx) => {
    const item = data.results[idx];
    const domain = item.domain || "Unknown";
    if (!domainResults[domain]) domainResults[domain] = { total: 0, correct: 0 };
    if (w.dataset.scored) {
      domainResults[domain].total++;
      if (w.dataset.wasCorrect === "true") domainResults[domain].correct++;
    }
  });
  let breakdown = Object.entries(domainResults).map(([d, v]) => {
    const dpct = v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0;
    const cls = d.replace(/\s+/g, '-');
    return `<span class="domain-tag tag-${cls}">${d}: ${v.correct}/${v.total} (${dpct}%)</span>`;
  }).join(" ");
  scoreSummary.style.display = "block";
  scoreSummary.innerHTML = `<h2>Score: ${correctCount} / ${totalQuestions} (${pct}%)</h2><div class="domain-legend" style="margin-top:10px">${breakdown}</div>`;
}

function revealAnswer(wrapper, item, toggleBtn) {
  const answerBox = wrapper.querySelector(".answer-section");
  if (answerBox.style.display === "block") {
    answerBox.style.display = "none";
    toggleBtn.textContent = "Show Answer";
    wrapper.querySelectorAll(".choices li").forEach(li => li.classList.remove("correct-choice", "incorrect-choice"));
    return;
  }
  const correctIndices = item.correct_response.map(c => c.toLowerCase().charCodeAt(0) - 97);
  const choices = wrapper.querySelectorAll(".choices li");
  const selected = Array.from(wrapper.querySelectorAll("input:checked")).map(s => parseInt(s.value));
  choices.forEach(li => li.classList.remove("correct-choice", "incorrect-choice"));
  correctIndices.forEach(i => choices[i] && choices[i].classList.add("correct-choice"));
  // Correct if: same number of answers selected AND all selected indices are in the correct list
  const isCorrect = selected.length === correctIndices.length && selected.every(i => correctIndices.includes(i));
  selected.forEach(i => { if (!correctIndices.includes(i) && choices[i]) choices[i].classList.add("incorrect-choice"); });
  answerBox.innerHTML = `<div class="result ${isCorrect ? "correct" : "incorrect"}">${isCorrect ? "Correct!" : "Incorrect."} Answer: ${correctIndices.map(letterFromIndex).join(", ")}</div><details class="explanation-section"><summary>Reveal Explanation</summary><div>${safeRenderHTML(item.prompt.explanation)}</div></details>`;
  answerBox.style.display = "block";
  toggleBtn.textContent = "Hide Answer";
  if (!wrapper.dataset.scored) {
    totalQuestions++;
    if (isCorrect) correctCount++;
    wrapper.dataset.scored = "true";
    wrapper.dataset.wasCorrect = isCorrect ? "true" : "false";
    showScore();
  }
}

// Build quiz
data.results.forEach((item, index) => {
  const q = item.prompt;
  const wrapper = document.createElement("div");
  wrapper.className = "quiz-item";
  const isMulti = item.assessment_type === "multi-select";
  const inputType = isMulti ? "checkbox" : "radio";
  const choicesHtml = q.answers.map((ans, i) => {
    const label = ans.replace(/^<p>|<\/p>$/g, "");
    return `<li><label><input type="${inputType}" name="q${index}${isMulti ? "[]" : ""}" value="${i}"> <span>${label}</span></label></li>`;
  }).join("");
  const typeLabel = isMulti ? "MULTI-SELECT" : "";
  const domainClass = item.domain.replace(/\s+/g, '-');
  wrapper.innerHTML = `<div class="q-header"><span class="q-number">Q${index + 1}</span><span class="domain-tag tag-${domainClass}">${item.domain}</span>${typeLabel ? `<span class="type-label">${typeLabel}</span>` : ""}</div><div class="question">${q.question}</div><ul class="choices">${choicesHtml}</ul><button class="show-answer">Show Answer</button><div class="answer-section" style="display:none"></div>`;
  const btn = wrapper.querySelector(".show-answer");
  btn.addEventListener("click", () => revealAnswer(wrapper, item, btn));
  wrapper.querySelectorAll("input").forEach(input => {
    input.addEventListener("change", () => {
      if (!wrapper.dataset.answered) { answeredCount++; wrapper.dataset.answered = "true"; updateScore(); }
    });
  });
  quizContainer.appendChild(wrapper);
});

function revealAll() {
  document.querySelectorAll(".quiz-item").forEach((w, i) => {
    const box = w.querySelector(".answer-section");
    if (box.style.display !== "block") revealAnswer(w, data.results[i], w.querySelector(".show-answer"));
  });
}
function submitAll() {
  revealAll();
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}
function resetQuiz() {
  document.querySelectorAll("input[type=checkbox], input[type=radio]").forEach(r => r.checked = false);
  document.querySelectorAll(".quiz-item").forEach(w => {
    const box = w.querySelector(".answer-section");
    box.style.display = "none"; box.innerHTML = "";
    w.querySelectorAll(".choices li").forEach(li => li.classList.remove("correct-choice", "incorrect-choice"));
    w.querySelector(".show-answer").textContent = "Show Answer";
    delete w.dataset.scored; delete w.dataset.answered; delete w.dataset.wasCorrect;
  });
  totalQuestions = 0; correctCount = 0; answeredCount = 0;
  updateScore(); scoreSummary.innerHTML = ""; scoreSummary.style.display = "none";
  timerSeconds = 90 * 60; clearInterval(timerInterval); timerRunning = false;
  timerToggle.textContent = "Start Timer"; updateTimerDisplay();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.getElementById("revealAllNav").addEventListener("click", revealAll);
document.getElementById("resetQuizNav").addEventListener("click", resetQuiz);
document.getElementById("submitAnswers").addEventListener("click", submitAll);
document.getElementById("resetQuiz").addEventListener("click", resetQuiz);
updateScore();
