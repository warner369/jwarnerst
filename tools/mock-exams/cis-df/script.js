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
  const m = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
  const s = (timerSeconds % 60).toString().padStart(2, '0');
  timerDisplay.textContent = m + ':' + s;
  if (timerSeconds <= 0) { clearInterval(timerInterval); timerRunning = false; timerToggle.textContent = "Time's up!"; }
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
function updateScore() {
  navProgress.textContent = `${answeredCount} / ${totalQ}`;
}
function showScore() {
  const pct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  // Domain breakdown
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
    return `<span class="domain-tag tag-${d}">${d}: ${v.correct}/${v.total} (${dpct}%)</span>`;
  }).join(" ");
  scoreSummary.style.display = "block";
  scoreSummary.innerHTML = `<h2>Score: ${correctCount} / ${totalQuestions} (${pct}%)</h2><div class="domain-legend" style="margin-top:10px">${breakdown}</div>`;
}

function revealAnswer(wrapper, item, toggleBtn) {
  const answerBox = wrapper.querySelector(".answer-section");
  if (answerBox.style.display === "block") {
    answerBox.style.display = "none";
    toggleBtn.textContent = "Show Answer";
    if (item.assessment_type === "matching") {
      wrapper.querySelectorAll(".matching-right").forEach(d => d.classList.remove("matching-correct","matching-incorrect"));
    } else {
      wrapper.querySelectorAll(".choices li").forEach(li => li.classList.remove("correct-choice","incorrect-choice"));
    }
    return;
  }

  let isCorrect = false;
  if (item.assessment_type === "matching") {
    const selects = wrapper.querySelectorAll("select");
    const correct = item.prompt.correct_pairs;
    isCorrect = true;
    selects.forEach((sel, i) => {
      const parent = sel.closest(".matching-right");
      parent.classList.remove("matching-correct","matching-incorrect");
      if (parseInt(sel.value) === correct[i]) {
        parent.classList.add("matching-correct");
      } else {
        parent.classList.add("matching-incorrect");
        isCorrect = false;
      }
    });
    const correctText = item.prompt.left_items.map((l, i) => `${l} → ${item.prompt.right_items[correct[i]]}`).join("<br>");
    answerBox.innerHTML = `<div class="result ${isCorrect ? "correct" : "incorrect"}">${isCorrect ? "Correct!" : "Incorrect."}</div><p style="font-size:13px"><strong>Correct matching:</strong><br>${correctText}</p><details class="explanation-section"><summary>Reveal Explanation</summary><div>${item.prompt.explanation}</div></details>`;
  } else {
    const correctIndices = item.correct_response.map(c => c.toLowerCase().charCodeAt(0) - 97);
    const choices = wrapper.querySelectorAll(".choices li");
    const selected = Array.from(wrapper.querySelectorAll("input:checked")).map(s => parseInt(s.value));
    choices.forEach(li => li.classList.remove("correct-choice","incorrect-choice"));
    correctIndices.forEach(i => choices[i] && choices[i].classList.add("correct-choice"));
    isCorrect = selected.length === correctIndices.length && selected.every(i => correctIndices.includes(i));
    selected.forEach(i => { if (!correctIndices.includes(i) && choices[i]) choices[i].classList.add("incorrect-choice"); });
    answerBox.innerHTML = `<div class="result ${isCorrect ? "correct" : "incorrect"}">${isCorrect ? "Correct!" : "Incorrect."} Answer: ${correctIndices.map(letterFromIndex).join(", ")}</div><details class="explanation-section"><summary>Reveal Explanation</summary><div>${item.prompt.explanation}</div></details>`;
  }
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

  let contentHtml = "";
  if (item.assessment_type === "matching") {
    let rows = "";
    q.left_items.forEach((left, i) => {
      let opts = '<option value="-1">-- Select --</option>';
      q.right_items.forEach((right, j) => {
        opts += `<option value="${j}">${letterFromIndex(j)}. ${right}</option>`;
      });
      rows += `<div class="matching-left"><strong>${letterFromIndex(i)}.</strong>&nbsp; ${left}</div><div class="matching-right"><select data-idx="${i}">${opts}</select></div>`;
    });
    contentHtml = `<div class="matching-grid">${rows}</div>`;
  } else {
    const isMulti = item.assessment_type === "multi-select";
    const inputType = isMulti ? "checkbox" : "radio";
    const choicesHtml = q.answers.map((ans, i) => {
      const label = ans.replace(/^<p>|<\/p>$/g, "");
      return `<li><label><input type="${inputType}" name="q${index}${isMulti ? "[]" : ""}" value="${i}"> ${label}</label></li>`;
    }).join("");
    contentHtml = `<ul class="choices">${choicesHtml}</ul>`;
  }

  const typeLabel = item.assessment_type === "matching" ? "MATCHING" : item.assessment_type === "multi-select" ? "MULTI-SELECT" : "";

  wrapper.innerHTML = `<div class="q-header"><span class="q-number">Q${index + 1}</span><span class="domain-tag tag-${item.domain}">${item.domain}</span>${typeLabel ? `<span class="type-label">${typeLabel}</span>` : ""}</div><div class="question">${q.question}</div>${contentHtml}<button class="show-answer">Show Answer</button><div class="answer-section" style="display:none"></div>`;

  const btn = wrapper.querySelector(".show-answer");
  btn.addEventListener("click", () => revealAnswer(wrapper, item, btn));

  const inputs = wrapper.querySelectorAll("input, select");
  inputs.forEach(input => {
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
  document.querySelectorAll("select").forEach(s => s.selectedIndex = 0);
  document.querySelectorAll(".quiz-item").forEach(w => {
    const box = w.querySelector(".answer-section");
    box.style.display = "none"; box.innerHTML = "";
    w.querySelectorAll(".choices li").forEach(li => li.classList.remove("correct-choice","incorrect-choice"));
    w.querySelectorAll(".matching-right").forEach(d => d.classList.remove("matching-correct","matching-incorrect"));
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
