/* Attention Lab experiment engine
 * Three browser-based attention paradigms with balanced trial generation,
 * response-time capture, trial-level local persistence, and CSV export.
 */
"use strict";

const EXPERIMENTS = {
  posner: {
    id: "posner",
    name: "Posner 空间线索实验",
    english: "POSNER SPATIAL CUEING",
    description: "比较外周闪烁线索与中央方向箭头如何引导空间注意，并考察有效、无效和中性线索及线索—目标间隔的影响。",
    facts: ["外源性 / 内源性线索", "有效 / 无效 / 中性", "反应时与正确率"],
    duration: "约 6–8 分钟"
  },
  change: {
    id: "change",
    name: "面孔变化检测实验",
    english: "FACE FLICKER CHANGE DETECTION",
    description: "通过 A—空屏—B—空屏的闪烁范式，检测注视方向、嘴角、眉毛和鼻子四类较细微的变化。",
    facts: ["4 类面部特征变化", "无变化 Catch Trials", "变化检测与部位判断"],
    duration: "约 5–8 分钟"
  },
  search: {
    id: "search",
    name: "视觉搜索与特征整合实验",
    english: "VISUAL SEARCH / FEATURE INTEGRATION",
    description: "比较单一特征搜索与颜色—形状结合搜索，操纵搜索集合大小和目标有无，检验搜索效率随项目数量的变化。",
    facts: ["Feature Search", "Conjunction Search", "集合大小 8 / 16 / 24"],
    duration: "约 6–8 分钟"
  }
};

const STORAGE_TRIALS = "attentionLabData";
const STORAGE_GAZE = "attentionLabGaze";
const STORAGE_SESSIONS = "attentionLabSessions";
const FACE_BASE = "assets/face-change-stimuli/";
const FACE_PAIRS = [
  { feature: "注视方向", key: "gaze", a: "01_gaze_left.svg", b: "02_gaze_right.svg" },
  { feature: "嘴角", key: "mouth", a: "03_mouth_neutral.svg", b: "04_mouth_smile.svg" },
  { feature: "眉毛", key: "brows", a: "05_brows_flat.svg", b: "06_brows_raised.svg" },
  { feature: "鼻子", key: "nose", a: "07_nose_normal.svg", b: "08_nose_wide.svg" }
];

const $ = (selector) => document.querySelector(selector);
const modal = $("#experiment-modal");
const taskOverlay = $("#task-overlay");
const taskStage = $("#task-stage");
let selected = null;
let participant = "P" + Math.random().toString(36).slice(2, 7).toUpperCase();
let sessionId = "";
let sessionRows = [];
let sessionGaze = [];
let trialList = [];
let trialIndex = 0;
let phase = "practice";
let active = false;
let eyeEnabled = false;
let eyeStarted = false;
let currentTrialContext = null;
let sessionStartIso = "";
let sessionWarnings = [];
let gazePersisted = false;
let sessionEpoch = 0;
let pendingKeyCancel = null;
let pendingActionCancel = null;
let lastModalTrigger = null;

document.querySelectorAll("[data-open]").forEach((button) => {
  button.addEventListener("click", () => openModal(button.dataset.open, button));
});

window.addEventListener("keydown", handleTaskKeyboard);

function handleTaskKeyboard(event) {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const key = event.key.toLowerCase();

  if (modal.classList.contains("open")) {
    if (key === "escape") {
      event.preventDefault();
      closeModal();
    }
    return;
  }
  if (!taskOverlay.classList.contains("open")) return;

  if (key === "escape") {
    event.preventDefault();
    const exitButton = $("#task-cancel") || $("#exit-task");
    if (exitButton) exitButton.click();
    return;
  }

  const activeId = document.activeElement ? document.activeElement.id : "";
  if (activeId === "participant-id" && key === "enter") {
    event.preventDefault();
    $("#consent").focus();
    return;
  }
  if (activeId === "consent" && key === "enter" && $("#setup-next")) {
    event.preventDefault();
    $("#setup-next").click();
    return;
  }

  if ($("#eye-count") && /^[1-9]$/.test(key)) {
    event.preventDefault();
    const dot = document.querySelector('[data-eye-dot="' + (Number(key) - 1) + '"]');
    if (dot && !dot.disabled) dot.click();
    return;
  }
  if ($("#eye-enable") && key === "e") {
    event.preventDefault();
    $("#eye-enable").click();
    return;
  }
  if ($("#eye-skip") && key === "s") {
    event.preventDefault();
    $("#eye-skip").click();
    return;
  }

  const featureButtons = document.querySelectorAll("[data-feature]");
  if (featureButtons.length && /^[1-4]$/.test(key)) {
    event.preventDefault();
    const choice = document.querySelector('[data-feature-index="' + key + '"]');
    if (choice) choice.click();
    return;
  }

  if ($("#download-session") && /^[1-4]$/.test(key)) {
    event.preventDefault();
    const actions = ["#download-session", "#download-gaze", "#download-all", "#finish-close"];
    const action = $(actions[Number(key) - 1]);
    if (action) action.click();
  }
}

function openModal(id, trigger) {
  lastModalTrigger = trigger || document.activeElement;
  selected = EXPERIMENTS[id];
  if (!selected) return;
  $("#modal-kicker").textContent = selected.english;
  $("#modal-title").textContent = selected.name;
  $("#modal-description").textContent = selected.description;
  $("#modal-facts").innerHTML = selected.facts.map((item) => "<span>" + escapeHtml(item) + "</span>").join("") +
    "<span>" + escapeHtml(selected.duration) + "</span>";
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  $("#start-experiment").focus();
}

function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  if (lastModalTrigger && typeof lastModalTrigger.focus === "function") lastModalTrigger.focus();
}

$(".modal-close").onclick = closeModal;
$("#close-modal").onclick = closeModal;
modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});
$(".menu-toggle").onclick = () => {
  const nav = $(".main-nav");
  const isOpen = nav.classList.toggle("mobile-open");
  $(".menu-toggle").setAttribute("aria-expanded", String(isOpen));
};
document.querySelectorAll(".main-nav a").forEach((link) => {
  link.addEventListener("click", () => $(".main-nav").classList.remove("mobile-open"));
});
$("#start-experiment").onclick = () => {
  closeModal();
  showSetup(selected.id);
};
$("#exit-task").onclick = () => {
  if (confirm("确定退出本次实验吗？已经完成的试次会保留在本机；当前未完成试次不会计入分析。")) {
    stopEyeTracking();
    active = false;
    exitTask();
  }
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function panel(title, body, buttons) {
  taskStage.innerHTML =
    '<div class="task-panel"><p class="task-muted">ATTENTION LAB · ' +
    escapeHtml(selected ? selected.english : "EXPERIMENT") +
    '</p><h2>' + title + '</h2>' + body + (buttons || "") +
    '<p class="task-keyboard-hint">键盘操作：Tab 切换 · Enter 确认 · Space 勾选 · Esc 返回或退出</p></div>';
  const firstControl = taskStage.querySelector('input:not([type="hidden"]),button:not(:disabled),select,textarea');
  if (firstControl) firstControl.focus({ preventScroll: true });
}

function showSetup(id) {
  selected = EXPERIMENTS[id];
  if (!selected) return;
  taskOverlay.classList.add("open");
  taskOverlay.setAttribute("aria-hidden", "false");
  $("#task-name").textContent = selected.english;
  $("#task-progress").style.width = "0%";
  panel(
    "实验参与与设备检查",
    '<p>本实验会记录匿名参与者编号、每个试次的刺激条件、按键反应、正确与否及反应时间。数据仅保存在当前浏览器，实验结束后可下载 CSV。</p>' +
    '<label class="task-muted" for="participant-id">匿名参与者编号（请勿填写姓名或学号）</label><br>' +
    '<input class="participant-input" id="participant-id" maxlength="24" value="' + escapeHtml(participant) + '">' +
    '<p><label><input type="checkbox" id="consent"> 我已阅读说明，并同意以匿名方式参与本次实验。</label></p>' +
    '<div class="eye-status">眼动追踪为可选探索功能；若本地 WebGazer 文件未安装，行为实验仍可正常进行。</div>' +
    '<p class="task-muted">键盘：Tab 切换 · Space 勾选同意 · Enter 继续 · Esc 返回</p>',
    '<div class="task-choice"><button class="task-button" id="setup-next">继续（Enter）</button><button class="task-button secondary" id="task-cancel">返回（Esc）</button></div>'
  );
  $("#setup-next").onclick = () => {
    if (!$("#consent").checked) {
      alert("请先确认知情同意。");
      return;
    }
    participant = $("#participant-id").value.trim() || participant;
    startNewSession();
    eyeSetup();
  };
  $("#task-cancel").onclick = exitTask;
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

function readStoredArray(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function writeStoredArray(key, values) {
  try {
    localStorage.setItem(key, JSON.stringify(values));
    return true;
  } catch (error) {
    sessionWarnings.push("浏览器本地存储失败：" + String(error && error.message || error));
    return false;
  }
}

function startNewSession() {
  sessionEpoch += 1;
  sessionId = makeId();
  sessionRows = [];
  sessionGaze = [];
  sessionWarnings = [];
  gazePersisted = false;
  eyeEnabled = false;
  eyeStarted = false;
  sessionStartIso = new Date().toISOString();
  const sessions = readStoredArray(STORAGE_SESSIONS);
  sessions.push({
    session_id: sessionId,
    participant,
    experiment: selected.id,
    started_at: sessionStartIso,
    status: "in_progress"
  });
  writeStoredArray(STORAGE_SESSIONS, sessions);
}

function eyeSetup() {
  const available = !!(window.webgazer && typeof window.webgazer.begin === "function");
  if (!available) {
    panel(
      "行为实验可正常进行",
      '<p>当前仓库没有安装本地 WebGazer 文件，因此本次无法启动摄像头眼动追踪。三个行为实验和试次数据记录不受影响。</p>' +
      '<div class="eye-status">眼动状态：未启用（本次不会生成眼动数据）。</div>',
      '<button class="task-button" id="eye-skip">进入实验说明（Enter / S）</button>'
    );
    $("#eye-skip").onclick = beginInstructions;
    return;
  }
  panel(
    "是否启用眼动追踪？",
    '<p>如果设备具有摄像头且浏览器允许访问，可以启用基于摄像头的注视估计。眼动数据仅保存在本机，精度需要在正式使用前单独验证。</p>',
    '<div class="task-choice"><button class="task-button" id="eye-enable">启用并校准（E）</button><button class="task-button secondary" id="eye-skip">跳过（S）</button></div>'
  );
  $("#eye-enable").onclick = startEyeCalibration;
  $("#eye-skip").onclick = beginInstructions;
}

async function startEyeCalibration() {
  try {
    await window.webgazer.begin();
    eyeEnabled = true;
    eyeStarted = true;
    window.webgazer.setGazeListener((data) => {
      if (!data || !active || !currentTrialContext) return;
      sessionGaze.push({
        session_id: sessionId,
        participant,
        experiment: selected.id,
        trial_number: currentTrialContext.trial_number,
        phase: currentTrialContext.phase,
        x: Number(data.x),
        y: Number(data.y),
        timestamp: new Date().toISOString(),
        elapsed_ms: Math.round(performance.now() - currentTrialContext.started_perf)
      });
    });
    const points = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) points.push([(col + 1) / 4, (row + 1) / 4]);
    }
    let completed = 0;
    panel(
      "九点校准",
      '<p>依次注视九个圆点，并按数字键 1–9 完成对应位置的校准；也可以使用 Tab 和 Enter 选择。该步骤仅为探索性校准，不代表眼动精度已经通过验证。</p>' +
      '<div class="eye-calibration">' + points.map((_, index) =>
        '<button class="eye-dot" data-eye-dot="' + index + '" aria-label="校准点 ' + (index + 1) + '">' + (index + 1) + '</button>'
      ).join("") + '</div><div class="eye-status" id="eye-count">已完成 0 / 9</div>'
    );
    document.querySelectorAll("[data-eye-dot]").forEach((dot, index) => {
      dot.onclick = () => {
        const point = points[index];
        try {
          if (window.webgazer.recordScreenPosition) {
            window.webgazer.recordScreenPosition(window.innerWidth * point[0], window.innerHeight * point[1], "click");
          }
        } catch (_) {}
        dot.disabled = true;
        dot.style.opacity = ".25";
        completed += 1;
        $("#eye-count").textContent = "已完成 " + completed + " / 9";
        if (completed === 9) setTimeout(beginInstructions, 500);
      };
    });
  } catch (error) {
    eyeEnabled = false;
    eyeStarted = false;
    panel(
      "眼动初始化失败",
      '<p>摄像头权限或眼动模块初始化失败。可以跳过眼动追踪，继续完成行为实验。</p>',
      '<button class="task-button" id="eye-failed-continue">继续（Enter）</button>'
    );
    $("#eye-failed-continue").onclick = beginInstructions;
  }
}

function stopEyeTracking() {
  if (eyeStarted && window.webgazer) {
    try {
      if (typeof window.webgazer.pause === "function") window.webgazer.pause();
      if (typeof window.webgazer.end === "function") window.webgazer.end();
    } catch (_) {}
  }
  eyeStarted = false;
}

function beginInstructions() {
  active = true;
  currentTrialContext = null;
  if (selected.id === "posner") {
    panel(
      "Posner 空间线索任务",
      '<p>请始终尽量注视屏幕中央的“+”。左右方框中会有一个目标圆点出现。目标出现后，请尽快判断它在左侧还是右侧。</p>' +
      '<p>按键：A = 左侧；L = 右侧。线索可能出现在外围方框，也可能以中央箭头形式出现；有时线索方向不指向目标。</p>' +
      '<p>请尽量保持头部稳定、眼睛注视中央，并兼顾速度与准确性。</p>',
      '<button class="task-button" id="instructions-next">开始练习（Enter）</button>'
    );
  } else if (selected.id === "search") {
    panel(
      "视觉搜索任务",
      '<p>请在屏幕中的字母阵列里寻找<strong>红色 T</strong>。如果看到红色 T，按 F（存在）；如果没有看到，按 J（不存在）。</p>' +
      '<p>特征搜索中，目标主要通过颜色区别于干扰项；结合搜索中，目标需要同时结合颜色和形状才能与干扰项区分。</p>' +
      '<p>每轮阵列项目数量会变化。请尽快且准确地判断。</p>',
      '<button class="task-button" id="instructions-next">开始练习（Enter）</button>'
    );
  } else {
    panel(
      "面孔变化检测任务",
      '<p>屏幕会反复呈现两张面孔，中间短暂出现空屏。请观察两张面孔之间是否发生变化。</p>' +
      '<p>发现变化时按 Space；如果认为没有变化，按 N。发现变化后，再按数字键 1–4 选择部位。部分试次确实没有变化。</p>' +
      '<p>请不要猜测，尽可能准确地报告。</p>',
      '<button class="task-button" id="instructions-next">开始练习（Enter）</button>'
    );
  }
  $("#instructions-next").onclick = beginPractice;
}

function shuffle(array) {
  const copy = array.slice();
  for (let index = copy.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function makePosnerTrials(repetitions) {
  const trials = [];
  const soas = [200, 600];
  ["外周线索", "中央箭头"].forEach((cueType) => {
    ["有效", "无效", "中性"].forEach((validity) => {
      soas.forEach((soa) => {
        for (let repeat = 0; repeat < repetitions; repeat++) {
          const targetSide = repeat % 2 === 0 ? "左" : "右";
          const cueSide = validity === "中性" ? "中性" : (validity === "有效" ? targetSide : (targetSide === "左" ? "右" : "左"));
          trials.push({
            cue_type: cueType,
            validity,
            soa_ms: soa,
            target_side: targetSide,
            cue_side: cueSide
          });
        }
      });
    });
  });
  return shuffle(trials);
}

function makeSearchTrials(repetitions) {
  const trials = [];
  ["特征搜索", "结合搜索"].forEach((searchType) => {
    [8, 16, 24].forEach((setSize) => {
      [true, false].forEach((targetPresent) => {
        for (let repeat = 0; repeat < repetitions; repeat++) {
          trials.push({ search_type: searchType, set_size: setSize, target_present: targetPresent });
        }
      });
    });
  });
  return shuffle(trials);
}

function makeFaceTrials(repetitions) {
  const trials = [];
  FACE_PAIRS.forEach((pair) => {
    for (let repeat = 0; repeat < repetitions; repeat++) {
      const reverse = repeat % 2 === 1;
      trials.push({
        changed: true,
        feature: pair.feature,
        file_a: reverse ? pair.b : pair.a,
        file_b: reverse ? pair.a : pair.b,
        direction: reverse ? "B_to_A" : "A_to_B"
      });
    }
  });
  for (let index = 0; index < repetitions + 1; index++) {
    const sameFile = FACE_PAIRS[index % FACE_PAIRS.length].a;
    trials.push({
      changed: false,
      feature: "",
      file_a: sameFile,
      file_b: sameFile,
      direction: "no_change"
    });
  }
  return shuffle(trials);
}

function makeTrials(id, isPractice) {
  if (id === "posner") return makePosnerTrials(isPractice ? 1 : 4);
  if (id === "search") return makeSearchTrials(isPractice ? 1 : 4);
  return makeFaceTrials(isPractice ? 1 : 4);
}

function beginPractice() {
  phase = "practice";
  trialList = makeTrials(selected.id, true);
  trialIndex = 0;
  runNext();
}

function beginFormal() {
  phase = "formal";
  trialList = makeTrials(selected.id, false);
  trialIndex = 0;
  runNext();
}

async function runNext() {
  const epoch = sessionEpoch;
  if (!active) return;
  if (trialIndex >= trialList.length) {
    if (phase === "practice") {
      panel(
        "练习完成",
        '<p>你已经完成练习。接下来进入正式实验。正式试次的数据会与练习试次分开标记。</p>',
        '<button class="task-button" id="formal-start">开始正式实验（Enter）</button>'
      );
      $("#formal-start").onclick = beginFormal;
    } else {
      finishTask();
    }
    return;
  }
  const progress = (trialIndex / trialList.length) * 100;
  $("#task-progress").style.width = progress + "%";
  const trial = trialList[trialIndex];
  if (selected.id === "posner") await runPosnerTrial(trial, epoch);
  else if (selected.id === "search") await runSearchTrial(trial, epoch);
  else await runFaceTrial(trial, epoch);
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function makeTrialContext() {
  return {
    trial_number: trialIndex + 1,
    phase,
    started_perf: performance.now()
  };
}

function appendTrial(data) {
  const row = Object.assign({
    session_id: sessionId,
    participant,
    experiment: selected.id,
    phase,
    trial_number: trialIndex + 1,
    trial_timestamp: new Date().toISOString(),
    eye_tracking_enabled: eyeEnabled,
    gaze_samples_in_trial: sessionGaze.filter((sample) =>
      sample.trial_number === trialIndex + 1 && sample.phase === phase
    ).length
  }, data);
  sessionRows.push(row);
  const stored = readStoredArray(STORAGE_TRIALS);
  stored.push(row);
  writeStoredArray(STORAGE_TRIALS, stored);
}

function waitForKey(keys, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const start = performance.now();
    const finish = (key, status) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("keydown", onKey);
      clearTimeout(timeout);
      if (pendingKeyCancel === cancel) pendingKeyCancel = null;
      resolve({
        key,
        status,
        rt_ms: key ? performance.now() - start : null
      });
    };
    const onKey = (event) => {
      const key = event.key.toLowerCase();
      if (!keys.includes(key)) return;
      event.preventDefault();
      finish(key, "responded");
    };
    const cancel = () => finish(null, "cancelled");
    pendingKeyCancel = cancel;
    window.addEventListener("keydown", onKey);
    const timeout = setTimeout(() => finish(null, "timeout"), timeoutMs);
  });
}

function waitForTaskAction(register) {
  return new Promise((resolve) => {
    const finish = () => {
      if (pendingActionCancel === finish) pendingActionCancel = null;
      resolve();
    };
    pendingActionCancel = finish;
    register(finish);
  });
}

function cancelPendingTaskActions() {
  if (pendingKeyCancel) pendingKeyCancel();
  if (pendingActionCancel) pendingActionCancel();
}

async function runPosnerTrial(trial, epoch) {
  const context = makeTrialContext();
  currentTrialContext = context;
  const isPractice = phase === "practice";
  taskStage.innerHTML =
    '<div class="task-panel"><p class="task-muted">請注視中央十字</p>' +
    '<div class="cue-display"><div class="cue-box" id="posner-left"></div>' +
    '<div class="cue-center" id="posner-center">+</div><div class="cue-box" id="posner-right"></div></div>' +
    '<p class="task-muted">目标出现后按 A（左）或 L（右）</p></div>';
  const left = $("#posner-left");
  const right = $("#posner-right");
  const center = $("#posner-center");
  await sleep(500);
  if (!active || epoch !== sessionEpoch) return;

  const cueOnset = performance.now();
  if (trial.cue_type === "外周线索") {
    if (trial.cue_side === "左" || trial.cue_side === "中性") left.classList.add("is-cued");
    if (trial.cue_side === "右" || trial.cue_side === "中性") right.classList.add("is-cued");
  } else {
    center.textContent = trial.cue_side === "中性" ? "↔" : (trial.cue_side === "左" ? "←" : "→");
    center.classList.add("cue-arrow");
  }
  await sleep(100);
  if (!active || epoch !== sessionEpoch) return;
  left.classList.remove("is-cued");
  right.classList.remove("is-cued");
  center.textContent = "+";
  center.classList.remove("cue-arrow");
  const remaining = Math.max(0, trial.soa_ms - (performance.now() - cueOnset));
  await sleep(remaining);
  if (!active || epoch !== sessionEpoch) return;

  const target = trial.target_side === "左" ? left : right;
  target.classList.add("is-target");
  target.textContent = "●";
  const targetOnset = performance.now();
  const targetOnsetIso = new Date().toISOString();
  const response = await waitForKey(["a", "l"], 1800);
  if (!active || epoch !== sessionEpoch) return;
  const responseSide = response.key === "a" ? "左" : response.key === "l" ? "右" : "";
  const correct = response.status === "responded" && responseSide === trial.target_side;
  appendTrial({
    cue_type: trial.cue_type,
    cue_validity: trial.validity,
    cue_side: trial.cue_side,
    target_side: trial.target_side,
    soa_requested_ms: trial.soa_ms,
    cue_onset_time: new Date(Date.now() - Math.round(targetOnset - cueOnset)).toISOString(),
    target_onset_time: targetOnsetIso,
    soa_actual_ms: Math.round(targetOnset - cueOnset),
    response_key: response.key || "",
    response_side: responseSide,
    response_status: response.status,
    correct,
    rt_ms: response.rt_ms === null ? "" : Math.round(response.rt_ms)
  });
  currentTrialContext = null;
  trialIndex++;
  if (isPractice) await showPracticeFeedback(correct);
  else await sleep(300);
  runNext();
}

function createSearchArray(trial) {
  const items = [];
  const targetIndex = trial.target_present ? Math.floor(Math.random() * trial.set_size) : -1;
  for (let index = 0; index < trial.set_size; index++) {
    if (index === targetIndex) {
      items.push({ letter: "T", color: "red", is_target: true });
    } else if (trial.search_type === "特征搜索") {
      items.push({ letter: "T", color: "green", is_target: false });
    } else {
      const distractorType = index % 2 === 0 ? "redL" : "greenT";
      items.push(distractorType === "redL"
        ? { letter: "L", color: "red", is_target: false }
        : { letter: "T", color: "green", is_target: false });
    }
  }
  const shuffledItems = shuffle(items);
  return { items: shuffledItems, target_index: shuffledItems.findIndex((item) => item.is_target) };
}

function generateScatterPositions(count, container) {
  const width = container.clientWidth;
  const height = container.clientHeight;
  const firstItem = container.querySelector(".search-item");
  const itemWidth = firstItem ? firstItem.offsetWidth : 34;
  const itemHeight = firstItem ? firstItem.offsetHeight : 40;
  const marginX = itemWidth / 2 + 8;
  const marginY = itemHeight / 2 + 8;
  let gap = Math.max(3, itemWidth * 0.16);
  let positions = [];

  // Rejection sampling gives each item an independent, irregular position.
  // The rectangular clearance check prevents glyph boxes from overlapping.
  for (let relaxation = 0; relaxation < 7; relaxation++) {
    positions = [];
    let attempts = 0;
    const maxAttempts = count * 1600;
    while (positions.length < count && attempts < maxAttempts) {
      attempts += 1;
      const x = marginX + Math.random() * Math.max(1, width - marginX * 2);
      const y = marginY + Math.random() * Math.max(1, height - marginY * 2);
      const separated = positions.every((point) =>
        Math.abs(point.x - x) >= itemWidth + gap ||
        Math.abs(point.y - y) >= itemHeight + gap
      );
      if (separated) positions.push({ x, y });
    }
    if (positions.length === count) break;
    gap *= 0.78;
  }

  // Fallback for unusually small screens: jittered positions remain separated as much as possible.
  if (positions.length < count) {
    const columns = Math.ceil(Math.sqrt(count * width / Math.max(1, height)));
    const rows = Math.ceil(count / columns);
    const cellWidth = (width - marginX * 2) / columns;
    const cellHeight = (height - marginY * 2) / rows;
    const slots = shuffle(Array.from({ length: columns * rows }, (_, index) => index));
    positions = slots.slice(0, count).map((slot) => {
      const column = slot % columns;
      const row = Math.floor(slot / columns);
      return {
        x: marginX + (column + 0.5) * cellWidth + (Math.random() - 0.5) * cellWidth * 0.16,
        y: marginY + (row + 0.5) * cellHeight + (Math.random() - 0.5) * cellHeight * 0.16
      };
    });
  }

  return { positions, width, height };
}

async function runSearchTrial(trial, epoch) {
  const context = makeTrialContext();
  currentTrialContext = context;
  const generated = createSearchArray(trial);
  const layout = generated.items.map((item, index) => ({
    index,
    letter: item.letter,
    color: item.color,
    is_target: item.is_target
  }));
  taskStage.innerHTML =
    '<div class="task-panel"><p class="task-muted">' + escapeHtml(trial.search_type) +
    ' · SET SIZE ' + trial.set_size + '</p>' +
    '<p>寻找<strong>红色 T</strong>。按 F = 存在，按 J = 不存在。</p>' +
    '<div class="search-scatter" id="search-scatter">' +
    generated.items.map((item, index) =>
      '<span class="search-item ' + (item.color === "red" ? "search-red" : "search-green") +
      '" data-search-item="' + index + '">' + item.letter + '</span>'
    ).join("") + '</div><p class="task-muted">项目位置每轮随机变化，请尽快且准确地判断</p></div>';

  const scatter = $("#search-scatter");
  const placement = generateScatterPositions(generated.items.length, scatter);
  placement.positions.forEach((point, index) => {
    const element = scatter.querySelector('[data-search-item="' + index + '"]');
    element.style.left = point.x + "px";
    element.style.top = point.y + "px";
    layout[index].x_px = Math.round(point.x);
    layout[index].y_px = Math.round(point.y);
    layout[index].x_percent = Number((point.x / placement.width * 100).toFixed(2));
    layout[index].y_percent = Number((point.y / placement.height * 100).toFixed(2));
  });

  const targetOnset = performance.now();
  const targetOnsetIso = new Date().toISOString();
  const response = await waitForKey(["f", "j"], 5000);
  if (!active || epoch !== sessionEpoch) return;
  const responsePresent = response.key === "f" ? true : response.key === "j" ? false : null;
  const correct = responsePresent !== null && responsePresent === trial.target_present;
  appendTrial({
    search_type: trial.search_type,
    set_size: trial.set_size,
    target_present: trial.target_present,
    target_onset_time: targetOnsetIso,
    target_position: generated.target_index,
    stimulus_area_width_px: placement.width,
    stimulus_area_height_px: placement.height,
    stimulus_layout: JSON.stringify(layout),
    response_key: response.key || "",
    response_present: responsePresent === null ? "" : responsePresent,
    response_status: response.status,
    correct,
    rt_ms: response.rt_ms === null ? "" : Math.round(response.rt_ms)
  });
  currentTrialContext = null;
  trialIndex++;
  if (phase === "practice") await showPracticeFeedback(correct);
  else await sleep(300);
  runNext();
}

async function preloadFaceStimuli() {
  const files = FACE_PAIRS.flatMap((pair) => [pair.a, pair.b]);
  await Promise.all(files.map((file) => new Promise((resolve) => {
    const image = new Image();
    image.onload = resolve;
    image.onerror = resolve;
    image.src = FACE_BASE + file;
  })));
}

function faceStimulusMarkup() {
  return '<div class="face-flicker-wrap"><div id="face-flicker-frame" class="face-flicker-frame">' +
    '<img id="face-flicker-image" alt="面孔刺激" draggable="false"></div>' +
    '<div class="face-response-buttons">' +
    '<button class="task-button" id="face-found">发现变化（Space）</button>' +
    '<button class="task-button secondary" id="face-no-change">没有变化（N）</button>' +
    '</div><p class="task-muted">键盘操作：Space = 发现变化 · N = 没有变化。每轮最长 12 秒。</p></div>';
}

async function runFaceTrial(trial, epoch) {
  const context = makeTrialContext();
  currentTrialContext = context;
  await preloadFaceStimuli();
  if (!active || epoch !== sessionEpoch) return;
  taskStage.innerHTML = '<div class="task-panel"><p class="task-muted">FACE FLICKER · ' +
    (trial.changed ? "CHANGE TRIAL" : "NO-CHANGE TRIAL") + '</p>' + faceStimulusMarkup() + '</div>';
  const image = $("#face-flicker-image");
  let decision = null;
  let decisionTime = null;
  let resolveDecision;
  const decisionSignal = new Promise((resolve) => { resolveDecision = resolve; });
  const waitForDecisionOr = (milliseconds) => Promise.race([
    sleep(milliseconds),
    decisionSignal
  ]);
  let flickerCount = 0;
  const trialStart = performance.now();
  const trialStartIso = new Date().toISOString();
  const deadline = trialStart + 12000;
  const fileA = FACE_BASE + trial.file_a;
  const fileB = FACE_BASE + trial.file_b;

  const setVisible = (src) => {
    image.src = src;
    image.style.visibility = "visible";
  };
  const setBlank = () => {
    image.style.visibility = "hidden";
  };
  const stop = (value) => {
    if (decision) return;
    decision = value;
    decisionTime = performance.now();
    resolveDecision();
  };
  $("#face-found").onclick = () => stop("found");
  $("#face-no-change").onclick = () => stop("no_change");
  const keyboard = (event) => {
    if (event.code === "Space") {
      event.preventDefault();
      stop("found");
    } else if (event.key.toLowerCase() === "n") {
      stop("no_change");
    }
  };
  window.addEventListener("keydown", keyboard);

  let showA = true;
  while (active && !decision && performance.now() < deadline) {
    setVisible(showA ? fileA : fileB);
    flickerCount++;
    await waitForDecisionOr(250);
    if (!active || decision) break;
    setBlank();
    await waitForDecisionOr(80);
    if (decision) break;
    showA = !showA;
  }
  window.removeEventListener("keydown", keyboard);
  if (!active || epoch !== sessionEpoch) return;
  if (!decision) {
    decision = "timeout";
    decisionTime = performance.now();
  }
  const decisionRt = decision === "timeout" ? "" : Math.round(decisionTime - trialStart);
  const hit = trial.changed && decision === "found";
  const falseAlarm = !trial.changed && decision === "found";
  const miss = trial.changed && decision === "no_change";
  const correctRejection = !trial.changed && decision === "no_change";

  if (decision === "found") {
    taskStage.innerHTML =
      '<div class="task-panel"><p class="task-muted">CHANGE DETECTED</p><h2>你发现了变化</h2>' +
      '<p>请选择你认为发生变化的面部部位。</p>' +
      '<p>按数字键 1–4 选择，也可以使用 Tab + Enter。</p>' +
      '<div class="task-choice face-feature-choices">' +
      FACE_PAIRS.map((pair, index) => '<button class="task-button secondary face-feature-choice" data-feature-index="' +
        (index + 1) + '" data-feature="' + escapeHtml(pair.feature) + '">' +
        (index + 1) + " · " + escapeHtml(pair.feature) + '</button>').join("") +
      '</div></div>';
    const firstFeatureChoice = taskStage.querySelector("[data-feature]");
    if (firstFeatureChoice) firstFeatureChoice.focus();
    let chosenFeature = "";
    const choiceStart = performance.now();
    await waitForTaskAction((resolve) => {
      document.querySelectorAll("[data-feature]").forEach((button) => {
        button.onclick = () => {
          chosenFeature = button.dataset.feature;
          resolve();
        };
      });
    });
    if (!active || epoch !== sessionEpoch) return;
    const featureChoiceRt = Math.round(performance.now() - choiceStart);
    appendTrial({
      correct: hit || correctRejection,
      stimulus_onset_time: trialStartIso,
      change_present: trial.changed,
      change_feature: trial.feature,
      file_a: trial.file_a,
      file_b: trial.file_b,
      change_direction: trial.direction,
      decision: "found",
      outcome: hit ? "hit" : "false_alarm",
      change_detected: true,
      feature_choice: chosenFeature,
      feature_choice_correct: trial.changed ? chosenFeature === trial.feature : false,
      feature_choice_rt_ms: featureChoiceRt,
      decision_rt_ms: decisionRt,
      rt_ms: decisionRt === "" ? "" : Number(decisionRt),
      response_status: "responded",
      flicker_presentations: flickerCount
    });
  } else {
    appendTrial({
      correct: hit || correctRejection,
      stimulus_onset_time: trialStartIso,
      change_present: trial.changed,
      change_feature: trial.feature,
      file_a: trial.file_a,
      file_b: trial.file_b,
      change_direction: trial.direction,
      decision: decision,
      outcome: hit ? "hit" : miss ? "miss" : correctRejection ? "correct_rejection" : falseAlarm ? "false_alarm" : "timeout",
      change_detected: false,
      feature_choice: "",
      feature_choice_correct: "",
      feature_choice_rt_ms: "",
      decision_rt_ms: decisionRt,
      rt_ms: decisionRt === "" ? "" : Number(decisionRt),
      response_status: decision === "timeout" ? "timeout" : "responded",
      flicker_presentations: flickerCount
    });
  }
  currentTrialContext = null;
  trialIndex++;
  if (phase === "practice") {
    const correct = (trial.changed && decision === "found") || (!trial.changed && decision === "no_change");
    await showPracticeFeedback(correct);
  } else {
    await sleep(300);
  }
  runNext();
}

async function showPracticeFeedback(correct) {
  const epoch = sessionEpoch;
  if (!active) return;
  panel(
    correct ? "判断正确" : "再留意一下",
    '<p>' + (correct ? "很好，继续保持。" : "练习阶段可以继续熟悉刺激和按键方式。") + '</p>',
    '<button class="task-button" id="practice-continue">继续（Enter）</button>'
  );
  await waitForTaskAction((resolve) => {
    $("#practice-continue").onclick = resolve;
  });
  return active && epoch === sessionEpoch;
}

function finishTask() {
  active = false;
  currentTrialContext = null;
  stopEyeTracking();
  $("#task-progress").style.width = "100%";
  const formalRows = sessionRows.filter((row) => row.phase === "formal");
  const responded = formalRows.filter((row) => row.response_status === "responded");
  const scored = formalRows.filter((row) => typeof row.correct === "boolean");
  const accuracy = scored.length
    ? scored.filter((row) => row.correct).length / scored.length * 100
    : 0;
  const correctRts = formalRows
    .filter((row) => row.correct === true && typeof row.rt_ms === "number")
    .map((row) => row.rt_ms)
    .sort((a, b) => a - b);
  const median = correctRts.length ? correctRts[Math.floor(correctRts.length / 2)] : null;
  const sessions = readStoredArray(STORAGE_SESSIONS);
  const currentSession = sessions.find((item) => item.session_id === sessionId);
  if (currentSession) {
    currentSession.status = "completed";
    currentSession.completed_at = new Date().toISOString();
    writeStoredArray(STORAGE_SESSIONS, sessions);
  }
  const storageWarningHtml = sessionWarnings.length
    ? '<p class="task-muted">注意：本地存储出现问题，建议立即下载本次 CSV 备份。详情：' + escapeHtml(sessionWarnings.join("；")) + '</p>'
    : "";
  const extraSummary = selected.id === "change"
    ? '<div class="result-line"><span>命中 / 漏报 / 虚报 / 正确拒绝</span><b>' +
      ["hit", "miss", "false_alarm", "correct_rejection"].map((outcome) =>
        formalRows.filter((row) => row.outcome === outcome).length
      ).join(" / ") + '</b></div>'
    : "";
  panel(
    "实验完成",
    '<p>感谢参与。以下为本次正式试次的描述性结果。所有练习与正式试次均已逐条保存在当前浏览器。</p>' +
    '<div class="result-box">' +
    '<div class="result-line"><span>参与者编号</span><b>' + escapeHtml(participant) + '</b></div>' +
    '<div class="result-line"><span>Session ID</span><b>' + escapeHtml(sessionId.slice(0, 12)) + '</b></div>' +
    '<div class="result-line"><span>正式试次数</span><b>' + formalRows.length + '</b></div>' +
    '<div class="result-line"><span>已作答试次</span><b>' + responded.length + '</b></div>' +
    '<div class="result-line"><span>正确率</span><b>' + accuracy.toFixed(1) + '%</b></div>' +
    '<div class="result-line"><span>正确试次中位反应时</span><b>' + (median === null ? "—" : Math.round(median) + " ms") + '</b></div>' +
    extraSummary +
    '<div class="result-line"><span>眼动追踪</span><b>' + (eyeEnabled ? "已启用（探索性）" : "未启用") + '</b></div>' +
    '<div class="result-line"><span>本次眼动样本</span><b>' + sessionGaze.length + '</b></div>' +
    '</div>' +
    '<p class="task-muted">数据保存在当前浏览器的本地存储中。清除浏览器数据或更换设备可能导致数据丢失，请及时下载备份。</p>' + storageWarningHtml,
    '<p class="task-muted">键盘快捷键：1 下载本次试次 · 2 下载眼动数据 · 3 下载累计数据 · 4 返回网站</p>' +
    '<div class="task-choice"><button class="task-button" id="download-session">1 · 下载本次试次 CSV</button>' +
    '<button class="task-button secondary" id="download-gaze">2 · 下载本次眼动 CSV</button>' +
    '<button class="task-button secondary" id="download-all">3 · 下载本机累计数据 CSV</button>' +
    '<button class="task-button secondary" id="finish-close">4 · 返回网站</button></div>'
  );
  $("#download-session").onclick = () => downloadCSV(sessionRows, selected.id + "-" + participant + "-trials.csv");
  $("#download-gaze").onclick = () => {
    if (!sessionGaze.length) {
      alert("本次没有记录到眼动样本。请确认已安装并启用 WebGazer。");
      return;
    }
    downloadCSV(sessionGaze, selected.id + "-" + participant + "-gaze.csv");
  };
  $("#download-all").onclick = downloadAllLocalData;
  $("#finish-close").onclick = exitTask;
  persistSessionGaze();
}

function csvCell(value) {
  const text = value === null || value === undefined ? "" :
    (typeof value === "object" ? JSON.stringify(value) : String(value));
  return '"' + text.replace(/"/g, '""') + '"';
}

function persistSessionGaze() {
  if (gazePersisted || !sessionGaze.length) return;
  const storedGaze = readStoredArray(STORAGE_GAZE).concat(sessionGaze);
  writeStoredArray(STORAGE_GAZE, storedGaze);
  gazePersisted = true;
}

function downloadCSV(data, filename) {
  if (!data || !data.length) {
    alert("当前没有可导出的数据。");
    return;
  }
  const keys = Array.from(new Set(data.flatMap((row) => Object.keys(row))));
  const csv = [keys.map(csvCell).join(","), ...data.map((row) => keys.map((key) => csvCell(row[key])).join(","))].join("\r\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadAllLocalData() {
  const allTrials = readStoredArray(STORAGE_TRIALS);
  if (!allTrials.length) {
    alert("当前浏览器尚无累计试次数据。");
    return;
  }
  downloadCSV(allTrials, "attention-lab-all-trials.csv");
}

function exitTask() {
  cancelPendingTaskActions();
  sessionEpoch += 1;
  persistSessionGaze();
  active = false;
  currentTrialContext = null;
  stopEyeTracking();
  eyeEnabled = false;
  taskOverlay.classList.remove("open");
  taskOverlay.setAttribute("aria-hidden", "true");
  $("#task-progress").style.width = "0%";
}

