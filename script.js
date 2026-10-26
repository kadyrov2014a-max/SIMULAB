
"use strict";

const $ = (selector) => document.querySelector(selector);

const canvas = $("#simulationCanvas");
const ctx = canvas.getContext("2d");

const speedInput = $("#speedInput");
const angleInput = $("#angleInput");
const gravityInput = $("#gravityInput");

const speedValue = $("#speedValue");
const angleValue = $("#angleValue");
const gravityValue = $("#gravityValue");

const rangeResult = $("#rangeResult");
const heightResult = $("#heightResult");
const timeResult = $("#timeResult");
const peakTimeResult = $("#peakTimeResult");

const launchButton = $("#launchButton");
const resetButton = $("#resetButton");
const modelStatus = $("#modelStatus");
const simulationHint = $("#simulationHint");
const conclusionText = $("#conclusionText");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let animationId = null;
let animationStart = 0;
let animationDuration = 3500;
let lastFrameTime = 0;
let simulationRunning = false;
let hasLaunched = false;
let progress = new Set();

let model = {};
let ball = { x: 0, y: 0 };
let trail = [];
let canvasWidth = 600;
let canvasHeight = 310;

const quizQuestions = [
  {
    question: "Что такое компьютерное моделирование?",
    answers: [
      "Создание и исследование моделей с помощью компьютера",
      "Только создание компьютерных игр",
      "Ремонт и настройка компьютеров"
    ],
    correct: 0,
    explanation: "Компьютерное моделирование позволяет изучать объекты и процессы с помощью их компьютерных моделей."
  },
  {
    question: "Какова главная цель компьютерного моделирования?",
    answers: [
      "Заменить все реальные объекты",
      "Исследовать процессы и получать возможные результаты",
      "Увеличить размер компьютерных файлов"
    ],
    correct: 1,
    explanation: "Модели помогают исследовать явления, проверять гипотезы и прогнозировать результаты."
  },
  {
    question: "Что произойдёт с дальностью полёта при увеличении скорости с углом 45°, если остальные условия неизменны?",
    answers: [
      "Дальность увеличится",
      "Дальность обязательно станет нулевой",
      "Дальность всегда останется прежней"
    ],
    correct: 0,
    explanation: "В идеальной модели дальность пропорциональна квадрату начальной скорости."
  },
  {
    question: "Какой этап идёт после проведения компьютерного эксперимента?",
    answers: [
      "Удаление всех результатов",
      "Анализ результатов и выводы",
      "Обязательная замена компьютера"
    ],
    correct: 1,
    explanation: "После эксперимента анализируют полученные данные и сравнивают их с ожиданиями."
  },
  {
    question: "Где применяется компьютерное моделирование?",
    answers: [
      "Только в строительстве",
      "Только в компьютерных играх",
      "В науке, медицине, инженерии, метеорологии и других областях"
    ],
    correct: 2,
    explanation: "Компьютерные модели применяют во многих областях для решения разнообразных задач."
  }
];

let questionIndex = 0;
let selectedAnswer = null;
let quizScore = 0;
let questionAnswered = false;
let quizFinished = false;

function formatNumber(value, digits = 1) {
  return value.toLocaleString("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function getParameters() {
  return {
    speed: Number(speedInput.value),
    angle: Number(angleInput.value),
    gravity: Number(gravityInput.value)
  };
}

function calculateModel() {
  const { speed, angle, gravity } = getParameters();
  const theta = angle * Math.PI / 180;

  const horizontalVelocity = speed * Math.cos(theta);
  const verticalVelocity = speed * Math.sin(theta);

  const flightTime = (2 * verticalVelocity) / gravity;
  const distance = horizontalVelocity * flightTime;
  const maxHeight = (verticalVelocity ** 2) / (2 * gravity);
  const peakTime = verticalVelocity / gravity;

  model = {
    speed,
    angle,
    gravity,
    horizontalVelocity,
    verticalVelocity,
    flightTime,
    distance,
    maxHeight,
    peakTime
  };

  return model;
}

function updateResults() {
  const m = calculateModel();

  speedValue.textContent = `${m.speed} м/с`;
  angleValue.textContent = `${m.angle}°`;
  gravityValue.textContent = `${formatNumber(m.gravity, 2)} м/с²`;

  rangeResult.textContent = `${formatNumber(m.distance)} м`;
  heightResult.textContent = `${formatNumber(m.maxHeight)} м`;
  timeResult.textContent = `${formatNumber(m.flightTime)} с`;
  peakTimeResult.textContent = `${formatNumber(m.peakTime)} с`;

  conclusionText.textContent =
    `При скорости ${m.speed} м/с и угле ${m.angle}° модель ` +
    `рассчитывает дальность ${formatNumber(m.distance)} м, ` +
    `максимальную высоту ${formatNumber(m.maxHeight)} м и ` +
    `время полёта ${formatNumber(m.flightTime)} с.`;

  drawScene();
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvasWidth = Math.max(1, rect.width);
  canvasHeight = Math.max(1, rect.height);

  canvas.width = Math.round(canvasWidth * dpr);
  canvas.height = Math.round(canvasHeight * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawScene();
}

function getScene() {
  const padding = { left: 30, right: 22, top: 22, bottom: 32 };
  const plotWidth = Math.max(1, canvasWidth - padding.left - padding.right);
  const plotHeight = Math.max(1, canvasHeight - padding.top - padding.bottom);

  const m = model;
  const xMax = Math.max(m.distance * 1.12, 1);
  const yMax = Math.max(m.maxHeight * 1.35, 1);

  return {
    padding,
    plotWidth,
    plotHeight,
    xMax,
    yMax,
    x: (x) => padding.left + (x / xMax) * plotWidth,
    y: (y) => padding.top + plotHeight - (y / yMax) * plotHeight,
    ground: padding.top + plotHeight
  };
}

function positionAtTime(t) {
  const m = model;
  return {
    x: m.horizontalVelocity * t,
    y: Math.max(0, m.verticalVelocity * t - 0.5 * m.gravity * t * t)
  };
}

function drawScene() {
  if (!ctx || !canvasWidth || !canvasHeight) return;

  const scene = getScene();
  const { padding, plotWidth, plotHeight, xMax, yMax, x, y, ground } = scene;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = "#0c1727";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Сетка координат.
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#203149";

  for (let i = 0; i <= 5; i++) {
    const gx = padding.left + (plotWidth * i) / 5;
    const gy = padding.top + (plotHeight * i) / 5;

    ctx.beginPath();
    ctx.moveTo(gx, padding.top);
    ctx.lineTo(gx, ground);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(padding.left, gy);
    ctx.lineTo(padding.left + plotWidth, gy);
    ctx.stroke();
  }

  // Земля и оси.
  ctx.strokeStyle = "#66819f";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padding.left, ground);
  ctx.lineTo(padding.left + plotWidth, ground);
  ctx.stroke();

  ctx.fillStyle = "#93a9c3";
  ctx.font = "10px sans-serif";
  ctx.fillText("0", padding.left - 13, ground + 15);
  ctx.fillText(`${formatNumber(xMax, 0)} м`, padding.left + plotWidth - 38, ground + 15);
  ctx.fillText("Высота", padding.left, 13);

  // Расчётная траектория.
  ctx.beginPath();

  for (let i = 0; i <= 100; i++) {
    const t = (model.flightTime * i) / 100;
    const point = positionAtTime(t);

    if (i === 0) ctx.moveTo(x(point.x), y(point.y));
    else ctx.lineTo(x(point.x), y(point.y));
  }

  ctx.strokeStyle = "#65caff";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.stroke();

  // Отмечаем вершину траектории.
  const peak = positionAtTime(model.peakTime);
  ctx.beginPath();
  ctx.arc(x(peak.x), y(peak.y), 3, 0, Math.PI * 2);
  ctx.fillStyle = "#66eddf";
  ctx.fill();

  ctx.fillStyle = "#b9e8f9";
  ctx.font = "10px sans-serif";
  ctx.fillText("Вершина", Math.min(x(peak.x) + 8, canvasWidth - 60), Math.max(15, y(peak.y) - 8));

  // Пройденная часть траектории.
  if (trail.length > 1) {
    ctx.beginPath();

    trail.forEach((point, index) => {
      if (index === 0) ctx.moveTo(x(point.x), y(point.y));
      else ctx.lineTo(x(point.x), y(point.y));
    });

    ctx.strokeStyle = "#66eddf";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Мяч.
  const current = ball || { x: 0, y: 0 };
  const bx = x(current.x);
  const by = y(current.y);

  ctx.beginPath();
  ctx.arc(bx, by, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#66eddf";
  ctx.shadowColor = "#66eddf";
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function stopAnimation() {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  simulationRunning = false;
}

function animate(timestamp) {
  if (!simulationRunning) return;

  if (!animationStart) animationStart = timestamp;

  const elapsed = timestamp - animationStart;
  const duration = animationDuration;
  const fraction = Math.min(elapsed / duration, 1);

  const t = fraction * model.flightTime;
  ball = positionAtTime(t);

  if (timestamp - lastFrameTime > 35 || fraction === 1) {
    trail.push({ ...ball });
    lastFrameTime = timestamp;
  }

  drawScene();

  if (fraction < 1) {
    animationId = requestAnimationFrame(animate);
  } else {
    stopAnimation();
    hasLaunched = true;
    ball = positionAtTime(model.flightTime);
    drawScene();

    modelStatus.textContent = "ЗАВЕРШЕНА";
    simulationHint.textContent =
      `Эксперимент завершён! Мяч пролетел ${formatNumber(model.distance)} м. ` +
      "Измени параметры и сравни результат.";
    launchButton.textContent = "↻ Повторить опыт";
    updateProgress("lab", true);
  }
}

function launchSimulation() {
  stopAnimation();

  calculateModel();
  trail = [];
  ball = { x: 0, y: 0 };
  animationStart = 0;
  lastFrameTime = 0;
  hasLaunched = false;

  modelStatus.textContent = "ВЫПОЛНЯЕТСЯ";
  simulationHint.textContent = "Наблюдай за движением мяча и его траекторией.";
  launchButton.textContent = "⏳ Эксперимент идёт…";
  launchButton.disabled = true;

  drawScene();

  if (reducedMotion.matches) {
    ball = positionAtTime(model.flightTime);
    trail = Array.from({ length: 101 }, (_, i) =>
      positionAtTime((model.flightTime * i) / 100)
    );
    drawScene();

    hasLaunched = true;
    modelStatus.textContent = "ЗАВЕРШЕНА";
    simulationHint.textContent =
      `Эксперимент завершён! Дальность: ${formatNumber(model.distance)} м.`;
    launchButton.textContent = "↻ Повторить опыт";
    launchButton.disabled = false;
    updateProgress("lab", true);
    return;
  }

  simulationRunning = true;
  animationDuration = Math.max(1800, Math.min(4500, model.flightTime * 700));
  animationId = requestAnimationFrame(animate);

  const restoreButton = () => {
    if (!simulationRunning) {
      launchButton.disabled = false;
      return;
    }

    requestAnimationFrame(restoreButton);
  };

  restoreButton();
}

function resetSimulation() {
  stopAnimation();

  trail = [];
  ball = { x: 0, y: 0 };
  animationStart = 0;
  lastFrameTime = 0;
  hasLaunched = false;

  launchButton.disabled = false;
  launchButton.textContent = "▶ Запустить опыт";
  modelStatus.textContent = "ГОТОВА";
  simulationHint.textContent = "Измени параметры и запусти эксперимент.";

  updateResults();
}

function updateProgress(stage, completed) {
  if (completed) progress.add(stage);
  else progress.delete(stage);

  const count = progress.size;
  $("#progressText").textContent = `${count} из 5 этапов`;
  $("#progressFill").style.width = `${count * 20}%`;

  document.querySelectorAll("[data-complete]").forEach((button) => {
    const key = button.dataset.complete;
    const done = progress.has(key);

    button.classList.toggle("completed", done);
    button.textContent = done
      ? "✓ Этап завершён"
      : ({
          theory: "Я изучил(а) теорию ✓",
          lab: "Я провёл(а) эксперимент ✓",
          explain: "Я понял(а) результат ✓",
          quiz: "Отметить тест как пройденный ✓"
        })[key];
  });

  document.querySelectorAll(".step-card").forEach((card) => {
    const target = card.getAttribute("href");
    const key = {
      "#theory": "theory",
      "#lab": "lab",
      "#explain": "explain",
      "#quiz": "quiz",
      "#result": "result"
    }[target];

    card.classList.toggle("completed", Boolean(key && progress.has(key)));
  });
}

function renderQuestion() {
  const q = quizQuestions[questionIndex];

  $("#questionCounter").textContent =
    `ВОПРОС ${questionIndex + 1} ИЗ ${quizQuestions.length}`;
  $("#questionPoints").textContent = `${quizScore} правильных`;
  $("#questionText").textContent = q.question;
  $("#answerCounter").textContent = "Выбери один ответ";
  $("#nextQuestion").disabled = true;
  $("#nextQuestion").textContent = "Ответить →";

  $("#quizProgressFill").style.width =
    `${(questionIndex / quizQuestions.length) * 100}%`;

  const list = $("#answerList");
  list.replaceChildren();

  q.answers.forEach((answer, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-option";

    const letter = document.createElement("span");
    letter.className = "answer-letter";
    letter.textContent = String.fromCharCode(65 + index);

    const text = document.createElement("span");
    text.textContent = answer;

    button.append(letter, text);
    button.addEventListener("click", () => selectAnswer(index));

    list.append(button);
  });

  const feedback = $("#answerFeedback");
  feedback.hidden = true;
  feedback.textContent = "";
  feedback.className = "answer-feedback";

  selectedAnswer = null;
  questionAnswered = false;
}

function selectAnswer(index) {
  if (questionAnswered || quizFinished) return;

  selectedAnswer = index;

  document.querySelectorAll(".answer-option").forEach((button, i) => {
    button.classList.toggle("selected", i === index);
  });

  $("#answerCounter").textContent = "Ответ выбран";
  $("#nextQuestion").disabled = false;
}

function submitAnswer() {
  if (selectedAnswer === null || questionAnswered || quizFinished) return;

  const q = quizQuestions[questionIndex];
  const correct = selectedAnswer === q.correct;

  questionAnswered = true;

  if (correct) quizScore++;

  const options = document.querySelectorAll(".answer-option");

  options.forEach((button, index) => {
    button.disabled = true;

    if (index === q.correct) button.classList.add("correct");
    if (index === selectedAnswer && !correct) button.classList.add("incorrect");
  });

  const feedback = $("#answerFeedback");
  feedback.hidden = false;
  feedback.className = `answer-feedback ${correct ? "good" : "bad"}`;
  feedback.textContent =
    `${correct ? "Верно! " : "Не совсем. "}${q.explanation}`;

  $("#questionPoints").textContent = `${quizScore} правильных`;
  $("#answerCounter").textContent = correct ? "Ответ верный" : "Ответ неверный";
  $("#nextQuestion").textContent =
    questionIndex === quizQuestions.length - 1
      ? "Посмотреть результат →"
      : "Следующий вопрос →";
}

function nextQuestion() {
  if (!questionAnswered) {
    submitAnswer();
    return;
  }

  if (questionIndex < quizQuestions.length - 1) {
    questionIndex++;
    renderQuestion();
  } else {
    finishQuiz();
  }
}

function finishQuiz() {
  quizFinished = true;

  $("#quizProgressFill").style.width = "100%";
  $("#questionCounter").textContent = "ТЕСТ ЗАВЕРШЁН";
  $("#questionText").textContent = "Ты ответил(а) на все вопросы!";
  $("#answerList").replaceChildren();
  $("#answerFeedback").hidden = true;
  $("#answerCounter").textContent = `Результат: ${quizScore} из ${quizQuestions.length}`;
  $("#nextQuestion").disabled = true;
  $("#nextQuestion").textContent = "Тест завершён";

  updateProgress("quiz", true);
  showResult();
}

function showResult() {
  const score = quizScore;
  const total = quizQuestions.length;
  const percentage = (score / total) * 100;

  $("#finalScore").textContent = score;
  $("#finalProgressFill").style.width = `${percentage}%`;
  $("#resultTitle").textContent =
    score === total ? "Превосходная работа!" :
    score >= 3 ? "Хороший результат!" :
    "Продолжай изучать!";

  $("#resultDescription").textContent =
    `Ты ответил(а) правильно на ${score} из ${total} вопросов.`;

  $("#finalNote").textContent =
    score === total
      ? "Ты отлично усвоил(а) материал. Попробуй изучить другие виды моделей!"
      : score >= 3
        ? "Ты знаешь основы моделирования. Повтори вопросы, в которых ошибся(лась)."
        : "Повтори теорию и попробуй пройти тест ещё раз. Ошибки помогают учиться.";

  updateProgress("result", true);
}

function restartLesson() {
  stopAnimation();

  progress = new Set();
  questionIndex = 0;
  selectedAnswer = null;
  quizScore = 0;
  questionAnswered = false;
  quizFinished = false;

  speedInput.value = "20";
  angleInput.value = "45";
  gravityInput.value = "9.81";

  updateProgress("theory", false);
  updateProgress("lab", false);
  updateProgress("explain", false);
  updateProgress("quiz", false);
  updateProgress("result", false);

  renderQuestion();
  resetSimulation();

  $("#finalScore").textContent = "—";
  $("#finalProgressFill").style.width = "0%";
  $("#resultTitle").textContent = "Ты готов(а) подвести итоги?";
  $("#resultDescription").textContent =
    "Заверши мини-урок и узнай, сколько вопросов ты решил(а) правильно.";
  $("#finalNote").textContent = "Результат появится после завершения теста.";

  $("#menuToggle").setAttribute("aria-expanded", "false");
  $("#nav").classList.remove("open");
}

speedInput.addEventListener("input", () => {
  stopAnimation();
  updateResults();
  modelStatus.textContent = "ГОТОВА";
  launchButton.disabled = false;
  launchButton.textContent = "▶ Запустить опыт";
  simulationHint.textContent = "Параметры изменены. Запусти новый эксперимент.";
});

angleInput.addEventListener("input", () => {
  stopAnimation();
  updateResults();
  modelStatus.textContent = "ГОТОВА";
  launchButton.disabled = false;
  launchButton.textContent = "▶ Запустить опыт";
  simulationHint.textContent = "Параметры изменены. Запусти новый эксперимент.";
});

gravityInput.addEventListener("input", () => {
  stopAnimation();
  updateResults();
  modelStatus.textContent = "ГОТОВА";
  launchButton.disabled = false;
  launchButton.textContent = "▶ Запустить опыт";
  simulationHint.textContent = "Параметры изменены. Запусти новый эксперимент.";
});

launchButton.addEventListener("click", launchSimulation);
resetButton.addEventListener("click", resetSimulation);

document.querySelectorAll("[data-complete]").forEach((button) => {
  button.addEventListener("click", () => {
    const stage = button.dataset.complete;

    if (stage === "quiz" && !quizFinished) {
      $("#quiz").scrollIntoView({ behavior: "smooth" });
      return;
    }

    updateProgress(stage, true);
  });
});

$("#nextQuestion").addEventListener("click", nextQuestion);
$("#finishLesson").addEventListener("click", () => {
  if (quizFinished) {
    $("#result").scrollIntoView({ behavior: "smooth" });
  } else {
    $("#quiz").scrollIntoView({ behavior: "smooth" });
  }
});
$("#restartButton").addEventListener("click", () => {
  restartLesson();
  $("#home").scrollIntoView({ behavior: "smooth" });
});

$("#menuToggle").addEventListener("click", () => {
  const nav = $("#nav");
  const open = nav.classList.toggle("open");
  $("#menuToggle").setAttribute("aria-expanded", String(open));
  $("#menuToggle").setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
});

$("#nav").querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    $("#nav").classList.remove("open");
    $("#menuToggle").setAttribute("aria-expanded", "false");
  });
});

window.addEventListener("resize", resizeCanvas);

$("#currentYear").textContent = new Date().getFullYear();

updateResults();
renderQuestion();
resizeCanvas();
